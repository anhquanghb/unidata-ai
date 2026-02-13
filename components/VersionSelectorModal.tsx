import React, { useState, useEffect } from 'react';
import { BackupVersion, GoogleDriveConfig, ExternalSource, Unit } from '../types';
import { Folder, HardDrive, Plus, Save, Cloud, FileJson, Trash2, Loader2, Database, X, Share2, User, Send, CheckCircle, RefreshCw, ArrowRight, Merge, ChevronDown, ChevronRight, CheckSquare, Square, Info } from 'lucide-react';

interface VersionSelectorModalProps {
  isOpen: boolean;
  driveConfig: GoogleDriveConfig;
  onImportData: (data: any) => void; // Changed to mandatory
  onClose: () => void;
  currentData?: any; // To compare
}

interface DrivePermission {
  id: string;
  emailAddress?: string;
  role: string;
  displayName?: string;
  photoLink?: string;
}

// Helper types for diffing
interface DiffNode {
    id: string;
    label: string;
    type: 'unit' | 'group' | 'module';
    children?: DiffNode[];
    incomingCount: number;
    currentCount: number;
    isNew?: boolean;
    isSelected: boolean;
    data?: any; // The actual data to merge
}

// Helper to migrate data locally for diffing (v1 -> v2)
const migrateDataLocal = (data: any) => {
    let migrated = { ...data };
    if (migrated.units && Array.isArray(migrated.units)) {
        migrated.units = migrated.units.map((u: any) => {
            if (u.unit_id) return u;
            return {
                ...u,
                unit_id: u.id,
                unit_name: u.name,
                unit_code: u.code,
                unit_type: u.type,
                unit_parentId: u.parentId
            };
        });
    }
    return migrated;
};

const VersionSelectorModal: React.FC<VersionSelectorModalProps> = ({ isOpen, driveConfig, onImportData, onClose, currentData }) => {
  const [activeTab, setActiveTab] = useState<'my_drive' | 'external' | 'empty'>('my_drive');
  const [isLoading, setIsLoading] = useState(false);
  
  // My Drive State
  const [myBackups, setMyBackups] = useState<BackupVersion[]>([]);
  const [selectedMyId, setSelectedMyId] = useState<string>('');
  
  // Sharing State
  const [filePermissions, setFilePermissions] = useState<DrivePermission[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  // External Source State
  const [externalSources, setExternalSources] = useState<ExternalSource[]>([]);
  const [selectedExternalSourceId, setSelectedExternalSourceId] = useState<string>('');
  const [externalBackups, setExternalBackups] = useState<BackupVersion[]>([]);
  const [selectedExternalFileId, setSelectedExternalFileId] = useState<string>('');
  
  // Add New External Source
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceId, setNewSourceId] = useState('');
  const [externalJsonFileId, setExternalJsonFileId] = useState<string | null>(null);

  // --- SYNC & MERGE STATE ---
  const [isComparing, setIsComparing] = useState(false);
  const [mergeTree, setMergeTree] = useState<DiffNode[]>([]);
  const [incomingDataCache, setIncomingDataCache] = useState<any>(null);

  const hasCurrentData = currentData && (
      (currentData.units && currentData.units.length > 0) || 
      (currentData.scientificRecords && currentData.scientificRecords.length > 0)
  );

  // --- GOOGLE DRIVE API HELPERS ---
  const listFiles = async (folderId: string): Promise<BackupVersion[]> => {
      try {
          // Query specifically for JSON files in the target folder
          const response = await window.gapi.client.drive.files.list({
              q: `'${folderId}' in parents and mimeType = 'application/json' and trashed = false`,
              fields: 'files(id, name, createdTime, size)',
              orderBy: 'createdTime desc',
              pageSize: 20
          });
          const files = response.result.files || [];
          return files
            .filter((f: any) => f.name !== 'external.json') // STRICTLY EXCLUDE config file from data list
            .map((f: any) => ({
              id: f.id,
              fileName: f.name,
              createdTime: f.createdTime,
              size: f.size ? `${(parseInt(f.size) / 1024).toFixed(1)} KB` : 'Unknown'
          }));
      } catch (e) {
          console.error("List files error", e);
          return [];
      }
  };

  const fetchFileContent = async (fileId: string) => {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { 'Authorization': `Bearer ${driveConfig.accessToken}` }
      });
      if (!response.ok) throw new Error("Failed to fetch file content");
      return await response.json();
  };

  const loadPermissions = async (fileId: string) => {
      setIsLoadingPermissions(true);
      try {
          const response = await window.gapi.client.drive.permissions.list({
              fileId: fileId,
              fields: 'permissions(id, emailAddress, role, displayName, photoLink)',
          });
          setFilePermissions(response.result.permissions || []);
      } catch (e) {
          console.error("Error loading permissions", e);
          setFilePermissions([]);
      } finally {
          setIsLoadingPermissions(false);
      }
  };

  const handleShareFile = async () => {
      if (!selectedMyId || !shareEmail.trim()) return;
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(shareEmail)) {
          alert("Email không hợp lệ");
          return;
      }

      setIsSharing(true);
      try {
          await window.gapi.client.drive.permissions.create({
              fileId: selectedMyId,
              resource: {
                  role: 'reader',
                  type: 'user',
                  emailAddress: shareEmail
              },
              emailMessage: "UniData System: Bạn đã được chia sẻ quyền xem dữ liệu báo cáo."
          });
          
          alert(`Đã chia sẻ thành công cho ${shareEmail}`);
          setShareEmail('');
          loadPermissions(selectedMyId);
      } catch (e: any) {
          console.error("Share error", e);
          alert("Lỗi khi chia sẻ: " + (e.result?.error?.message || e.message));
      } finally {
          setIsSharing(false);
      }
  };

  const loadExternalConfig = async () => {
      if (!driveConfig.folderId) return;
      try {
          // Look for external.json specifically in the user's UniData_Backups folder
          const response = await window.gapi.client.drive.files.list({
              q: `name = 'external.json' and '${driveConfig.folderId}' in parents and trashed = false`,
              fields: 'files(id)',
          });
          
          if (response.result.files && response.result.files.length > 0) {
              const fileId = response.result.files[0].id;
              setExternalJsonFileId(fileId);
              
              const contentResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                  headers: { 'Authorization': `Bearer ${driveConfig.accessToken}` }
              });
              if (contentResp.ok) {
                  const json = await contentResp.json();
                  if (json.sources) setExternalSources(json.sources);
              }
          } else {
              setExternalJsonFileId(null);
          }
      } catch (e) {
          console.error("Load external config error", e);
      }
  };

  const saveExternalConfig = async (sources: ExternalSource[]) => {
      if (!driveConfig.folderId) return;
      const content = JSON.stringify({ sources }, null, 2);
      const blob = new Blob([content], { type: 'application/json' });

      try {
          if (externalJsonFileId) {
              const form = new FormData();
              form.append('metadata', new Blob([JSON.stringify({})], { type: 'application/json' }));
              form.append('file', blob);

              await fetch(`https://www.googleapis.com/upload/drive/v3/files/${externalJsonFileId}?uploadType=multipart`, {
                  method: 'PATCH',
                  headers: { 'Authorization': `Bearer ${driveConfig.accessToken}` },
                  body: form
              });
          } else {
              const metadata = {
                  name: 'external.json',
                  parents: [driveConfig.folderId],
                  mimeType: 'application/json'
              };
              const form = new FormData();
              form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
              form.append('file', blob);

              const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${driveConfig.accessToken}` },
                  body: form
              });
              const json = await resp.json();
              if (json.id) setExternalJsonFileId(json.id);
          }
          setExternalSources(sources);
      } catch (e) {
          console.error("Save external config error", e);
          alert("Lỗi khi lưu cấu hình External Drive.");
      }
  };

  // --- SYNC LOGIC ---
  const handlePrepareSync = async () => {
      if (!selectedExternalFileId) return;
      setIsLoading(true);
      try {
          const rawIncoming = await fetchFileContent(selectedExternalFileId);
          // Normalize data structure for compatibility
          const incoming = migrateDataLocal(rawIncoming);
          setIncomingDataCache(incoming);
          
          // Build Diff Tree
          const tree: DiffNode[] = [];

          // 1. Group by Units (Faculties) from Incoming
          const incomingUnits: Unit[] = incoming.units || [];
          const currentUnits: Unit[] = currentData?.units || [];

          // GLOBAL MODULES (Scientific, Training, etc.)
          const modules = [
              { key: 'scientificRecords', label: 'Khoa học Công nghệ' },
              { key: 'trainingRecords', label: 'Đào tạo' },
              { key: 'personnelRecords', label: 'Nhân sự' },
              { key: 'admissionRecords', label: 'Tuyển sinh' },
              // Add other modules...
          ];

          // Root: Organization Structure
          const structNode: DiffNode = {
              id: 'org_struct',
              label: 'Cơ cấu Tổ chức (Khoa/Viện/Bộ môn)',
              type: 'module',
              incomingCount: incomingUnits.length,
              currentCount: currentUnits.length,
              isSelected: true,
              data: incomingUnits,
              children: incomingUnits.map(u => ({
                  id: u.unit_id,
                  label: u.unit_name,
                  type: 'unit',
                  incomingCount: 1,
                  currentCount: currentUnits.some(cu => cu.unit_id === u.unit_id || cu.unit_code === u.unit_code) ? 1 : 0,
                  isNew: !currentUnits.some(cu => cu.unit_id === u.unit_id || cu.unit_code === u.unit_code),
                  isSelected: true,
                  data: u
              }))
          };
          tree.push(structNode);

          // Root: Data Modules
          modules.forEach(mod => {
              const inList = incoming[mod.key] || [];
              const curList = currentData[mod.key] || [];
              if (inList.length > 0) {
                  tree.push({
                      id: mod.key,
                      label: mod.label,
                      type: 'module',
                      incomingCount: inList.length,
                      currentCount: curList.length,
                      isSelected: true,
                      data: inList
                  });
              }
          });

          // Dynamic Groups
          if (incoming.dynamicDataStore) {
              const groupNode: DiffNode = {
                  id: 'dynamic_groups',
                  label: 'Các Nhóm Dữ liệu Động',
                  type: 'group',
                  incomingCount: Object.keys(incoming.dynamicDataStore).length,
                  currentCount: Object.keys(currentData.dynamicDataStore || {}).length,
                  isSelected: true,
                  children: [] as DiffNode[],
                  data: null
              };

              Object.keys(incoming.dynamicDataStore).forEach(groupId => {
                  const groupConfig = (incoming.dataConfigGroups || []).find((g: any) => g.id === groupId);
                  const groupName = groupConfig ? groupConfig.name : `Group ${groupId}`;
                  const records = incoming.dynamicDataStore[groupId];
                  
                  (groupNode.children as DiffNode[]).push({
                      id: `dyn_${groupId}`,
                      label: groupName,
                      type: 'module',
                      incomingCount: records.length,
                      currentCount: (currentData.dynamicDataStore?.[groupId] || []).length,
                      isSelected: true,
                      data: { groupId, records, config: groupConfig }
                  });
              });
              tree.push(groupNode);
          }

          setMergeTree(tree);
          setIsComparing(true);

      } catch (e: any) {
          console.error(e);
          alert("Lỗi khi đọc file dữ liệu: " + e.message);
      } finally {
          setIsLoading(false);
      }
  };

  const handleToggleNode = (nodeId: string, checked: boolean) => {
      const updateNode = (nodes: DiffNode[]): DiffNode[] => {
          return nodes.map(node => {
              if (node.id === nodeId) {
                  // Toggle self and children
                  const updateChildren = (children?: DiffNode[]): DiffNode[] | undefined => {
                      return children?.map(c => ({
                          ...c,
                          isSelected: checked,
                          children: updateChildren(c.children)
                      }));
                  };
                  return { ...node, isSelected: checked, children: updateChildren(node.children) };
              }
              if (node.children) {
                  return { ...node, children: updateNode(node.children) };
              }
              return node;
          });
      };
      setMergeTree(prev => updateNode(prev));
  };

  const executeMerge = () => {
      if (!onImportData || !currentData || !incomingDataCache) return;

      // Deep clone current data to start
      const finalData = JSON.parse(JSON.stringify(currentData));

      // Traverse tree and merge selected data
      const processMerge = (nodes: DiffNode[]) => {
          nodes.forEach(node => {
              if (node.isSelected) {
                  if (node.id === 'org_struct') {
                      // Process Children Units
                      const selectedUnits = node.children?.filter(c => c.isSelected).map(c => c.data) || [];
                      // Merge Units: Add if new, Replace if exists (based on ID)
                      selectedUnits.forEach((u: Unit) => {
                          const idx = finalData.units.findIndex((cu: Unit) => cu.unit_id === u.unit_id);
                          if (idx >= 0) finalData.units[idx] = u;
                          else finalData.units.push(u);
                      });
                  } else if (node.type === 'module' && node.id !== 'org_struct' && !node.id.startsWith('dyn_')) {
                      // Standard Modules (Scientific, etc.)
                      const incomingRecords = node.data;
                      const currentRecords = finalData[node.id] || [];
                      const newRecords = incomingRecords.filter((ir: any) => !currentRecords.some((cr: any) => cr.id === ir.id));
                      finalData[node.id] = [...currentRecords, ...newRecords];
                  } else if (node.id.startsWith('dyn_')) {
                      // Dynamic Data
                      const { groupId, records, config } = node.data;
                      // 1. Ensure Config Group exists
                      const existingGroupIdx = finalData.dataConfigGroups.findIndex((g: any) => g.id === groupId);
                      if (existingGroupIdx === -1 && config) {
                          finalData.dataConfigGroups.push(config);
                      }
                      // 2. Merge Records
                      const currentRecs = finalData.dynamicDataStore[groupId] || [];
                      const newRecs = records.filter((ir: any) => !currentRecs.some((cr: any) => cr.id === ir.id));
                      finalData.dynamicDataStore[groupId] = [...currentRecs, ...newRecs];
                  } else if (node.children) {
                      processMerge(node.children);
                  }
              }
          });
      };

      processMerge(mergeTree);
      
      onImportData(finalData);
      alert("Đồng bộ dữ liệu thành công!");
      onClose();
  };

  // --- EFFECTS ---
  useEffect(() => {
      if (isOpen && driveConfig.isConnected && driveConfig.folderId) {
          const init = async () => {
              setIsLoading(true);
              const myFiles = await listFiles(driveConfig.folderId);
              setMyBackups(myFiles);
              await loadExternalConfig();
              setIsLoading(false);
          };
          init();
      }
  }, [isOpen, driveConfig]);

  useEffect(() => {
      if (activeTab === 'my_drive' && selectedMyId) {
          loadPermissions(selectedMyId);
      } else {
          setFilePermissions([]);
      }
  }, [selectedMyId, activeTab]);

  // --- HANDLERS ---
  const handleScanExternal = async (folderId: string) => {
      setIsLoading(true);
      setSelectedExternalSourceId(folderId);
      const files = await listFiles(folderId);
      setExternalBackups(files);
      if (files.length > 0) setSelectedExternalFileId(files[0].id);
      setIsLoading(false);
  };

  const handleAddExternalSource = async () => {
      if (!newSourceName || !newSourceId) return;
      setIsLoading(true);
      const newSource: ExternalSource = {
          id: newSourceId,
          name: newSourceName,
          addedAt: new Date().toISOString()
      };
      const updatedSources = [...externalSources, newSource];
      await saveExternalConfig(updatedSources);
      setNewSourceName('');
      setNewSourceId('');
      setIsAddingSource(false);
      setIsLoading(false);
  };

  const handleDeleteSource = async (sourceId: string) => {
      if(confirm("Xóa nguồn dữ liệu này khỏi danh sách?")) {
          const updated = externalSources.filter(s => s.id !== sourceId);
          await saveExternalConfig(updated);
          if (selectedExternalSourceId === sourceId) {
              setExternalBackups([]);
              setSelectedExternalSourceId('');
          }
      }
  };

  const handleFinalConfirm = async () => {
      if (activeTab === 'empty') {
          onImportData('RESET'); // Signal to reset
          onClose();
      } else {
          const fileId = activeTab === 'my_drive' ? selectedMyId : selectedExternalFileId;
          if (!fileId) return;

          setIsLoading(true);
          try {
              const rawData = await fetchFileContent(fileId);
              const data = migrateDataLocal(rawData);
              onImportData(data);
              alert("Đã tải dữ liệu thành công!");
              onClose();
          } catch (e: any) {
              console.error(e);
              alert("Lỗi khi tải dữ liệu: " + e.message);
          } finally {
              setIsLoading(false);
          }
      }
  };

  // Render Diff Tree Helper
  const renderDiffNode = (node: DiffNode, level = 0) => (
      <div key={node.id} className="mb-1">
          <div className={`flex items-center p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 ${node.isSelected ? 'bg-blue-50/50' : ''}`} style={{ marginLeft: level * 20 }}>
              <button onClick={() => handleToggleNode(node.id, !node.isSelected)} className={`mr-2 ${node.isSelected ? 'text-blue-600' : 'text-slate-300'}`}>
                  {node.isSelected ? <CheckSquare size={16}/> : <Square size={16}/>}
              </button>
              <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      {node.label}
                      {node.isNew && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">Mới</span>}
                  </div>
                  <div className="text-xs text-slate-400">
                      Nguồn: {node.incomingCount} | Hiện tại: {node.currentCount}
                  </div>
              </div>
          </div>
          {node.children && node.children.map(child => renderDiffNode(child, level + 1))}
      </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-blue-600 rounded-lg">
                <Database className="h-6 w-6 text-white" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white">Đồng bộ Dữ liệu Hệ thống</h3>
                <p className="text-slate-400 text-xs">Chọn nguồn dữ liệu để khởi động hoặc đồng bộ</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-700 p-1 rounded-full transition-colors">
              <X size={24} />
          </button>
        </div>

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-2 shrink-0">
                <button 
                    onClick={() => { setActiveTab('my_drive'); setIsComparing(false); }}
                    className={`text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${activeTab === 'my_drive' ? 'bg-white shadow-md text-blue-600 ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Cloud size={18} />
                    Dữ liệu của tôi
                </button>
                <button 
                    onClick={() => { setActiveTab('external'); setIsComparing(false); }}
                    className={`text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${activeTab === 'external' ? 'bg-white shadow-md text-purple-600 ring-1 ring-purple-100' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <HardDrive size={18} />
                    Nguồn mở rộng
                </button>
                <button 
                    onClick={() => { setActiveTab('empty'); setIsComparing(false); }}
                    className={`text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${activeTab === 'empty' ? 'bg-white shadow-md text-emerald-600 ring-1 ring-emerald-100' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <FileJson size={18} />
                    Dữ liệu trắng
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-white relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center flex-col">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-2" />
                        <p className="text-sm font-medium text-slate-500">Đang xử lý dữ liệu...</p>
                    </div>
                )}

                {/* TAB: MY DRIVE */}
                {activeTab === 'my_drive' && (
                    <div className="h-full flex flex-col">
                        <h4 className="font-bold text-slate-800 text-lg mb-2 flex-shrink-0 flex items-center gap-2">
                            <Cloud size={20} className="text-blue-600"/>
                            Dữ liệu của tôi
                        </h4>
                        <p className="text-xs text-slate-500 mb-4 bg-slate-100 p-2 rounded">
                            Danh sách các bản sao lưu nằm trực tiếp trong thư mục <strong>{driveConfig.folderName}</strong> của bạn.
                        </p>

                        {!driveConfig.isConnected ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <p className="text-slate-500">Chưa kết nối Google Drive.</p>
                            </div>
                        ) : myBackups.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <p className="text-slate-500">Không tìm thấy file backup nào trong thư mục của bạn.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="flex-1 overflow-y-auto mb-4 border border-slate-200 rounded-lg">
                                    {myBackups.map((ver) => (
                                        <label key={ver.id} className={`flex items-center p-3 border-b last:border-b-0 cursor-pointer transition-all ${selectedMyId === ver.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-slate-100'}`}>
                                            <input type="radio" name="my_ver" className="w-4 h-4 text-blue-600" checked={selectedMyId === ver.id} onChange={() => setSelectedMyId(ver.id)} />
                                            <div className="ml-3">
                                                <div className="text-sm font-bold text-slate-700">{ver.fileName}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{new Date(ver.createdTime).toLocaleString('vi-VN')} - {ver.size}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {selectedMyId && (
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex-shrink-0">
                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                                            <Share2 size={16} className="text-blue-600" />
                                            <h5 className="text-sm font-bold text-slate-800">Quản lý chia sẻ</h5>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Đang truy cập ({filePermissions.length})</p>
                                                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                                    {filePermissions.map(perm => (
                                                        <div key={perm.id} className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-slate-100">
                                                            <User size={12} className="text-slate-500"/>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="truncate font-medium text-slate-700">{perm.displayName || perm.emailAddress}</div>
                                                            </div>
                                                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded">{perm.role}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Chia sẻ (Quyền đọc)</p>
                                                <div className="flex gap-2">
                                                    <input className="flex-1 min-w-0 p-2 border border-slate-300 rounded text-sm" placeholder="Email..." value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} />
                                                    <button onClick={handleShareFile} disabled={isSharing || !shareEmail} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-300">{isSharing ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: EXTERNAL */}
                {activeTab === 'external' && (
                    <div className="h-full flex flex-col">
                        {!isComparing ? (
                            // STEP 1: Select Source & File
                            <div className="space-y-6 flex-1 flex flex-col min-h-0">
                                <div className="flex justify-between items-center shrink-0">
                                    <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                        <HardDrive size={20} className="text-purple-600"/>
                                        Nguồn mở rộng
                                    </h4>
                                    <button onClick={() => setIsAddingSource(!isAddingSource)} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-bold border border-purple-100 hover:bg-purple-100 flex items-center gap-1">
                                        {isAddingSource ? 'Hủy thêm' : <><Plus size={14}/> Thêm nguồn mới</>}
                                    </button>
                                </div>

                                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-xs text-purple-800 flex items-start gap-2">
                                    <Info size={16} className="mt-0.5 shrink-0"/>
                                    <p>Đây là danh sách các thư mục được chia sẻ, được định nghĩa trong file <code>external.json</code> nằm trong thư mục gốc <strong>{driveConfig.folderName}</strong> của bạn.</p>
                                </div>

                                {isAddingSource && (
                                    <div className="p-4 bg-white rounded-xl border border-purple-200 shadow-sm shrink-0 animate-in fade-in slide-in-from-top-2">
                                        <h5 className="text-sm font-bold text-slate-700 mb-3">Thêm cấu hình nguồn mới vào external.json</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">Tên gợi nhớ</label>
                                                <input className="w-full px-3 py-2 rounded border border-slate-300 text-sm focus:border-purple-500 outline-none" placeholder="VD: Dữ liệu Khoa CNTT" value={newSourceName} onChange={e => setNewSourceName(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">Folder ID (Được chia sẻ)</label>
                                                <input className="w-full px-3 py-2 rounded border border-slate-300 text-sm font-mono focus:border-purple-500 outline-none" placeholder="1A2B3C..." value={newSourceId} onChange={e => setNewSourceId(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="flex justify-end"><button onClick={handleAddExternalSource} className="px-4 py-2 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 shadow-sm flex items-center gap-1"><Save size={14}/> Lưu vào Config</button></div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                                    <div className="border border-slate-200 rounded-xl flex flex-col overflow-hidden bg-slate-50">
                                        <div className="p-3 bg-white border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">Danh sách Nguồn</div>
                                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                            {externalSources.length === 0 && <p className="text-xs text-slate-400 p-2 italic text-center">Chưa có nguồn nào.</p>}
                                            {externalSources.map(src => (
                                                <div key={src.id} className={`p-2 rounded cursor-pointer text-sm flex justify-between items-center group ${selectedExternalSourceId === src.id ? 'bg-purple-100 text-purple-900 font-bold' : 'hover:bg-white text-slate-600'}`} onClick={() => handleScanExternal(src.id)}>
                                                    <span className="truncate">{src.name}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSource(src.id); }} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 border border-slate-200 rounded-xl flex flex-col overflow-hidden bg-white">
                                        <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase flex justify-between">
                                            <span>Tệp tin trong nguồn đã chọn</span>{selectedExternalSourceId && <span className="text-purple-600">{externalBackups.length} file</span>}
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4">
                                            {!selectedExternalSourceId ? (
                                                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                                    Chọn một nguồn bên trái để xem file
                                                </div>
                                            ) : externalBackups.length === 0 ? (
                                                <p className="text-sm text-slate-500 text-center italic mt-10">Thư mục trống hoặc không có quyền truy cập.</p>
                                            ) : (
                                                externalBackups.map((file) => (
                                                    <label key={file.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all mb-2 ${selectedExternalFileId === file.id ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300' : 'hover:bg-slate-50 border-slate-200'}`}>
                                                        <input type="radio" name="ext_file" className="w-4 h-4 text-purple-600" checked={selectedExternalFileId === file.id} onChange={() => setSelectedExternalFileId(file.id)} />
                                                        <div className="ml-3">
                                                            <div className="text-sm font-bold text-slate-700">{file.fileName}</div>
                                                            <div className="text-xs text-slate-400 mt-0.5">{new Date(file.createdTime).toLocaleString('vi-VN')} - {file.size}</div>
                                                        </div>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // STEP 2: Compare & Merge Interface
                            <div className="flex-1 flex flex-col h-full animate-in slide-in-from-right">
                                <div className="flex items-center gap-2 mb-4">
                                    <button onClick={() => setIsComparing(false)} className="text-slate-400 hover:text-slate-600 flex items-center text-sm"><ChevronDown className="rotate-90 mr-1" size={16}/> Quay lại</button>
                                    <h4 className="font-bold text-slate-800 text-lg">So sánh & Đồng bộ</h4>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white p-4">
                                    <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                                        Chọn các mục dữ liệu bạn muốn đồng bộ từ nguồn mở rộng vào hệ thống hiện tại.
                                    </div>
                                    <div className="space-y-2 pl-2">
                                        {mergeTree.map(node => renderDiffNode(node))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: EMPTY */}
                {activeTab === 'empty' && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                            <FileJson size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 mb-2">Bắt đầu với Dữ liệu Trắng</h4>
                        <p className="text-slate-500 max-w-md mx-auto">Hệ thống sẽ khởi tạo với cấu trúc mặc định và không có dữ liệu báo cáo nào.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
            <div className="text-xs text-slate-400 italic">
                {activeTab === 'external' && selectedExternalFileId ? "Đã chọn file từ nguồn mở rộng" : ""}
            </div>
            <div className="flex gap-3">
                {activeTab === 'my_drive' && (
                    <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center" 
                        onClick={handleFinalConfirm} disabled={!selectedMyId}>
                        <CheckCircle size={16} className="mr-2"/> Tải Dữ liệu
                    </button>
                )}

                {activeTab === 'empty' && (
                    <button className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-md" 
                        onClick={handleFinalConfirm}>
                        Khởi tạo mới
                    </button>
                )}

                {activeTab === 'external' && !isComparing && (
                    <>
                        <button className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-bold text-sm shadow-sm disabled:opacity-50" 
                            onClick={handleFinalConfirm} disabled={!selectedExternalFileId}>
                            Sử dụng dữ liệu này (Thay thế)
                        </button>
                        {hasCurrentData && (
                            <button className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-sm shadow-md disabled:opacity-50 flex items-center" 
                                onClick={handlePrepareSync} disabled={!selectedExternalFileId}>
                                <Merge size={16} className="mr-2"/> Đồng bộ với hiện tại
                            </button>
                        )}
                    </>
                )}

                {activeTab === 'external' && isComparing && (
                    <button className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-sm shadow-md flex items-center animate-pulse" 
                        onClick={executeMerge}>
                        <RefreshCw size={16} className="mr-2"/> Xác nhận Đồng bộ
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default VersionSelectorModal;