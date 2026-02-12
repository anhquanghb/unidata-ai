import React, { useState, useEffect } from 'react';
import { BackupVersion, GoogleDriveConfig, ExternalSource } from '../types';
import { Folder, HardDrive, Plus, Save, Cloud, FileJson, Trash2, Loader2, Database } from 'lucide-react';

interface VersionSelectorModalProps {
  isOpen: boolean;
  driveConfig: GoogleDriveConfig;
  onConfirm: (versionId: string, customFileId?: string) => void;
}

const VersionSelectorModal: React.FC<VersionSelectorModalProps> = ({ isOpen, driveConfig, onConfirm }) => {
  const [activeTab, setActiveTab] = useState<'my_drive' | 'external' | 'empty'>('my_drive');
  const [isLoading, setIsLoading] = useState(false);
  
  // My Drive State
  const [myBackups, setMyBackups] = useState<BackupVersion[]>([]);
  const [selectedMyId, setSelectedMyId] = useState<string>('');

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

  // --- GOOGLE DRIVE API HELPERS ---
  const listFiles = async (folderId: string): Promise<BackupVersion[]> => {
      try {
          const response = await window.gapi.client.drive.files.list({
              q: `'${folderId}' in parents and mimeType = 'application/json' and trashed = false`,
              fields: 'files(id, name, createdTime, size)',
              orderBy: 'createdTime desc',
              pageSize: 20
          });
          const files = response.result.files || [];
          return files.map((f: any) => ({
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

  const loadExternalConfig = async () => {
      if (!driveConfig.folderId) return;
      try {
          // Find external.json in user's UniData_Backups
          const response = await window.gapi.client.drive.files.list({
              q: `name = 'external.json' and '${driveConfig.folderId}' in parents and trashed = false`,
              fields: 'files(id)',
          });
          
          if (response.result.files && response.result.files.length > 0) {
              const fileId = response.result.files[0].id;
              setExternalJsonFileId(fileId);
              
              // Read content
              const contentResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                  headers: { 'Authorization': `Bearer ${driveConfig.accessToken}` }
              });
              if (contentResp.ok) {
                  const json = await contentResp.json();
                  if (json.sources) setExternalSources(json.sources);
              }
          } else {
              setExternalJsonFileId(null); // File doesn't exist yet
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
              // Update existing
              const form = new FormData();
              form.append('metadata', new Blob([JSON.stringify({})], { type: 'application/json' }));
              form.append('file', blob);

              await fetch(`https://www.googleapis.com/upload/drive/v3/files/${externalJsonFileId}?uploadType=multipart`, {
                  method: 'PATCH',
                  headers: { 'Authorization': `Bearer ${driveConfig.accessToken}` },
                  body: form
              });
          } else {
              // Create new
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

  // --- EFFECTS ---
  useEffect(() => {
      if (isOpen && driveConfig.isConnected && driveConfig.folderId) {
          const init = async () => {
              setIsLoading(true);
              // 1. Load My Backups
              const myFiles = await listFiles(driveConfig.folderId);
              setMyBackups(myFiles);
              if (myFiles.length > 0) setSelectedMyId(myFiles[0].id);

              // 2. Load External Config
              await loadExternalConfig();
              
              setIsLoading(false);
          };
          init();
      }
  }, [isOpen, driveConfig]);

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

  const handleFinalConfirm = () => {
      if (activeTab === 'empty') {
          onConfirm(''); // Empty ID signals fresh start
      } else if (activeTab === 'my_drive') {
          onConfirm(selectedMyId);
      } else if (activeTab === 'external') {
          onConfirm(selectedExternalFileId); // Use generic handler which accepts ID
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-blue-600 rounded-lg">
                <Database className="h-6 w-6 text-white" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white">Đồng bộ Dữ liệu Hệ thống</h3>
                <p className="text-slate-400 text-xs">Chọn nguồn dữ liệu để khởi động UniData</p>
             </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-2 shrink-0">
                <button 
                    onClick={() => setActiveTab('my_drive')}
                    className={`text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${activeTab === 'my_drive' ? 'bg-white shadow-md text-blue-600 ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Cloud size={18} />
                    Dữ liệu của tôi
                </button>
                <button 
                    onClick={() => setActiveTab('external')}
                    className={`text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-all ${activeTab === 'external' ? 'bg-white shadow-md text-purple-600 ring-1 ring-purple-100' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <HardDrive size={18} />
                    Nguồn mở rộng
                </button>
                <button 
                    onClick={() => setActiveTab('empty')}
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
                        <p className="text-sm font-medium text-slate-500">Đang quét Google Drive...</p>
                    </div>
                )}

                {/* TAB: MY DRIVE */}
                {activeTab === 'my_drive' && (
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 text-lg mb-2">Sao lưu từ UniData_Backups</h4>
                        {!driveConfig.isConnected ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <p className="text-slate-500">Chưa kết nối Google Drive.</p>
                            </div>
                        ) : myBackups.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <p className="text-slate-500">Không tìm thấy file backup nào trong thư mục của bạn.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {myBackups.map((ver) => (
                                    <label key={ver.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${selectedMyId === ver.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'hover:bg-slate-50 border-slate-200'}`}>
                                        <input type="radio" name="my_ver" className="w-4 h-4 text-blue-600" checked={selectedMyId === ver.id} onChange={() => setSelectedMyId(ver.id)} />
                                        <div className="ml-3">
                                            <div className="text-sm font-bold text-slate-700">{ver.fileName}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{new Date(ver.createdTime).toLocaleString('vi-VN')} - {ver.size}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: EXTERNAL */}
                {activeTab === 'external' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-800 text-lg">Nguồn dữ liệu bên ngoài</h4>
                            <button onClick={() => setIsAddingSource(!isAddingSource)} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-bold border border-purple-100 hover:bg-purple-100 flex items-center gap-1">
                                {isAddingSource ? 'Hủy thêm' : <><Plus size={14}/> Thêm nguồn mới</>}
                            </button>
                        </div>

                        {isAddingSource && (
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 animate-in fade-in slide-in-from-top-2">
                                <h5 className="text-sm font-bold text-purple-900 mb-3">Thêm Drive Liên kết</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                    <input className="px-3 py-2 rounded border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Tên gợi nhớ (VD: Khoa CNTT)" value={newSourceName} onChange={e => setNewSourceName(e.target.value)} />
                                    <input className="px-3 py-2 rounded border border-purple-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Google Drive Folder ID" value={newSourceId} onChange={e => setNewSourceId(e.target.value)} />
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={handleAddExternalSource} className="px-4 py-2 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 flex items-center gap-2"><Save size={14}/> Lưu vào external.json</button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[400px]">
                            {/* List Sources */}
                            <div className="border border-slate-200 rounded-xl flex flex-col overflow-hidden bg-slate-50">
                                <div className="p-3 bg-white border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">Danh sách Nguồn</div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {externalSources.length === 0 && <p className="text-xs text-center text-slate-400 p-4">Chưa có nguồn nào.</p>}
                                    {externalSources.map(src => (
                                        <div key={src.id} className={`p-2 rounded cursor-pointer text-sm flex justify-between items-center group ${selectedExternalSourceId === src.id ? 'bg-purple-100 text-purple-900 font-bold' : 'hover:bg-white text-slate-600'}`} onClick={() => handleScanExternal(src.id)}>
                                            <span className="truncate">{src.name}</span>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSource(src.id); }} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* List Files */}
                            <div className="md:col-span-2 border border-slate-200 rounded-xl flex flex-col overflow-hidden bg-white">
                                <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase flex justify-between">
                                    <span>Tệp tin trong nguồn đã chọn</span>
                                    {selectedExternalSourceId && <span className="text-purple-600">{externalBackups.length} file</span>}
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    {!selectedExternalSourceId ? (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">Chọn một nguồn bên trái để quét dữ liệu.</div>
                                    ) : externalBackups.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">Không tìm thấy file JSON nào trong thư mục này.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {externalBackups.map((file) => (
                                                <label key={file.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${selectedExternalFileId === file.id ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300' : 'hover:bg-slate-50 border-slate-200'}`}>
                                                    <input type="radio" name="ext_file" className="w-4 h-4 text-purple-600" checked={selectedExternalFileId === file.id} onChange={() => setSelectedExternalFileId(file.id)} />
                                                    <div className="ml-3">
                                                        <div className="text-sm font-bold text-slate-700">{file.fileName}</div>
                                                        <div className="text-xs text-slate-400 mt-0.5">{new Date(file.createdTime).toLocaleString('vi-VN')} - {file.size}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: EMPTY */}
                {activeTab === 'empty' && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                            <FileJson size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 mb-2">Bắt đầu với Dữ liệu Trắng</h4>
                        <p className="text-slate-500 max-w-md mx-auto">Hệ thống sẽ khởi tạo với cấu trúc mặc định và không có dữ liệu báo cáo nào. Bạn có thể nhập liệu thủ công hoặc import sau.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-3 shrink-0">
            <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center" 
                onClick={handleFinalConfirm}
                disabled={
                    (activeTab === 'my_drive' && !selectedMyId) || 
                    (activeTab === 'external' && !selectedExternalFileId)
                }
            >
                {activeTab === 'empty' ? 'Khởi tạo mới' : 'Tải Dữ liệu'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default VersionSelectorModal;