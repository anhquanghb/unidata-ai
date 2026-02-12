import React, { useState, useEffect } from 'react';
import { SystemSettings, SchoolInfo, AcademicYear, GoogleDriveConfig } from '../../types';
import { Users, UserPlus, Trash2, Folder, File, RefreshCw, Loader2, Lock, Eye, Share2, ChevronRight, AlertTriangle, PlusCircle, CheckCircle, Database, Save, Edit2, X, Settings } from 'lucide-react';

interface GeneralConfigModuleProps {
  settings: SystemSettings;
  driveSession: GoogleDriveConfig;
  schoolInfo: SchoolInfo;
  academicYears: AcademicYear[];
  onUpdateSettings: (settings: SystemSettings) => void;
  onUpdateSchoolInfo: (info: SchoolInfo) => void;
  onAddAcademicYear: (year: AcademicYear) => void;
  onUpdateAcademicYear: (year: AcademicYear) => void;
  onDeleteAcademicYear: (id: string) => void;
  onToggleLockAcademicYear: (id: string) => void;
  
  // Drive Props passed from parent
  manualClientId: string;
  setManualClientId: (val: string) => void;
  driveFolderId: string;
  setDriveFolderId: (val: string) => void;
  
  // New props for Folder Creation
  onCreateDefaultFolders: () => void;
  isCreatingFolder: boolean;
  scanStatus?: {
      foundFolder: boolean;
      foundDataFolder: boolean;
      foundConfig: boolean;
      backupCount: number;
  };

  // New prop for external source
  externalSourceFolderId?: string;
  setExternalSourceFolderId?: (val: string) => void;

  envClientId: string;
  effectiveClientId: string;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onSaveDriveConfigOnly: () => void;
  onSetCurrentYear: (code: string) => void;
}

interface DrivePermission {
  id: string;
  type: string;
  emailAddress?: string;
  role: string;
  displayName?: string;
  photoLink?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  permissions?: DrivePermission[];
}

const GeneralConfigModule: React.FC<GeneralConfigModuleProps> = ({
  settings,
  driveSession,
  schoolInfo,
  academicYears,
  onUpdateSettings,
  onUpdateSchoolInfo,
  onAddAcademicYear,
  onUpdateAcademicYear,
  onDeleteAcademicYear,
  onToggleLockAcademicYear,
  manualClientId, setManualClientId,
  driveFolderId, setDriveFolderId,
  onCreateDefaultFolders, isCreatingFolder, scanStatus,
  externalSourceFolderId, setExternalSourceFolderId, 
  envClientId, effectiveClientId,
  onConnectDrive, onDisconnectDrive, onSaveDriveConfigOnly,
  onSetCurrentYear
}) => {
  // Local states
  const [virtualAssistantUrl, setVirtualAssistantUrl] = useState(settings.virtualAssistantUrl || "https://gemini.google.com/app");
  const [newYearCode, setNewYearCode] = useState('');
  const [editingYearId, setEditingYearId] = useState<string | null>(null);
  const [editYearCode, setEditYearCode] = useState('');
  const [editingSchool, setEditingSchool] = useState(false);
  const [editSchoolName, setEditSchoolName] = useState(schoolInfo.school_name);
  const [editSchoolCode, setEditSchoolCode] = useState(schoolInfo.school_code);

  // --- DRIVE SHARING STATE ---
  const [rootPermissions, setRootPermissions] = useState<DrivePermission[]>([]);
  const [folderContents, setFolderContents] = useState<DriveFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [selectedFilePermissions, setSelectedFilePermissions] = useState<DrivePermission[]>([]);
  
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [shareEmailRoot, setShareEmailRoot] = useState('');
  const [shareEmailFile, setShareEmailFile] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const handleSaveGeneral = () => {
      onUpdateSettings({ ...settings, virtualAssistantUrl });
      alert("Đã lưu cấu hình chung!");
  };

  const handleAddNewYear = () => {
      if (!newYearCode.trim()) return;
      onAddAcademicYear({
          id: crypto.randomUUID(),
          code: newYearCode.trim(),
          isLocked: false
      });
      setNewYearCode('');
  };

  const handleSaveSchoolInfo = () => {
      onUpdateSchoolInfo({ school_name: editSchoolName, school_code: editSchoolCode });
      setEditingSchool(false);
  }

  const startEditingYear = (year: AcademicYear) => {
    if (year.isLocked) return;
    setEditingYearId(year.id);
    setEditYearCode(year.code);
  };

  const saveEditingYear = (originalYear: AcademicYear) => {
    if (!editYearCode.trim()) return;
    onUpdateAcademicYear({ ...originalYear, code: editYearCode.trim() });
    setEditingYearId(null);
  };

  const cancelEditingYear = () => {
    setEditingYearId(null);
  };

  // --- DRIVE API HELPERS ---

  const fetchPermissions = async (fileId: string, setState: React.Dispatch<React.SetStateAction<DrivePermission[]>>) => {
      if (!fileId || !driveSession.isConnected) return;
      try {
          setIsLoadingPermissions(true);
          const response = await window.gapi.client.drive.permissions.list({
              fileId: fileId,
              fields: 'permissions(id, type, emailAddress, role, displayName, photoLink)',
          });
          setState(response.result.permissions || []);
      } catch (e) {
          console.error("Error fetching permissions:", e);
      } finally {
          setIsLoadingPermissions(false);
      }
  };

  const fetchFolderContent = async () => {
      if (!driveFolderId || !driveSession.isConnected) return;
      try {
          setIsLoadingContent(true);
          const response = await window.gapi.client.drive.files.list({
              q: `'${driveFolderId}' in parents and trashed = false`,
              fields: 'files(id, name, mimeType)',
              pageSize: 50
          });
          setFolderContents(response.result.files || []);
          setSelectedFile(null); // Reset selection
          setSelectedFilePermissions([]);
      } catch (e) {
          console.error("Error fetching folder content:", e);
      } finally {
          setIsLoadingContent(false);
      }
  };

  const addPermission = async (fileId: string, email: string, callback: () => void) => {
      if (!email.includes('@')) {
          alert("Email không hợp lệ");
          return;
      }
      try {
          setIsSharing(true);
          await window.gapi.client.drive.permissions.create({
              fileId: fileId,
              resource: {
                  role: 'reader',
                  type: 'user',
                  emailAddress: email
              },
              emailMessage: `UniData System: Bạn đã được cấp quyền ĐỌC cho ${fileId === driveFolderId ? 'thư mục hệ thống' : 'tệp tin'}.`
          });
          alert(`Đã chia sẻ thành công với ${email}`);
          callback(); // Reload permissions
      } catch (e: any) {
          console.error("Share error:", e);
          alert("Lỗi khi chia sẻ: " + (e.result?.error?.message || e.message));
      } finally {
          setIsSharing(false);
      }
  };

  const removePermission = async (fileId: string, permissionId: string, callback: () => void) => {
      if (!confirm("Bạn có chắc muốn xóa quyền truy cập của người này?")) return;
      try {
          await window.gapi.client.drive.permissions.delete({
              fileId: fileId,
              permissionId: permissionId,
          });
          alert("Đã xóa quyền truy cập.");
          callback();
      } catch (e: any) {
          console.error("Remove permission error:", e);
          alert("Lỗi khi xóa quyền: " + (e.result?.error?.message || e.message));
      }
  };

  // --- EFFECTS FOR SHARING TAB ---
  useEffect(() => {
      if (driveFolderId && driveSession.isConnected) {
          fetchPermissions(driveFolderId, setRootPermissions);
          fetchFolderContent();
      }
  }, [driveFolderId, driveSession.isConnected]);

  useEffect(() => {
      if (selectedFile) {
          fetchPermissions(selectedFile.id, setSelectedFilePermissions);
      }
  }, [selectedFile]);


  return (
    <div className="space-y-8 animate-fade-in">
        {/* SECTION 1: School Info */}
        <div>
           <div className="flex justify-between items-center mb-4">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Thông tin Đơn vị Đào tạo</h3>
               {!editingSchool ? (
                   <button onClick={() => setEditingSchool(true)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors">
                       <Edit2 size={16} />
                   </button>
               ) : (
                   <div className="flex gap-2">
                       <button onClick={() => setEditingSchool(false)} className="px-3 py-1 text-slate-500 hover:text-slate-700 text-xs font-bold">Hủy</button>
                       <button onClick={handleSaveSchoolInfo} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">Lưu</button>
                   </div>
               )}
           </div>
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Tên Trường/Đơn vị</label>
                   {editingSchool ? (
                       <input className="w-full p-2 border border-slate-300 rounded text-sm" value={editSchoolName} onChange={(e) => setEditSchoolName(e.target.value)} />
                   ) : (
                       <div className="text-sm font-bold text-slate-800">{schoolInfo.school_name}</div>
                   )}
               </div>
               <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Mã Đơn vị</label>
                    {editingSchool ? (
                       <input className="w-full p-2 border border-slate-300 rounded text-sm font-mono uppercase" value={editSchoolCode} onChange={(e) => setEditSchoolCode(e.target.value)} />
                   ) : (
                       <div className="text-sm font-mono font-bold text-slate-600">{schoolInfo.school_code}</div>
                   )}
               </div>
           </div>
       </div>

       {/* SECTION 2: Academic Years */}
       <div>
           <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Quản lý Năm học</h3>
           <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-4">
               <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500 font-semibold">
                       <tr>
                           <th className="px-4 py-3">Mã năm học</th>
                           <th className="px-4 py-3 text-center">Trạng thái</th>
                           <th className="px-4 py-3 text-center">Hiện tại</th>
                           <th className="px-4 py-3 text-right">Thao tác</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                       {academicYears.map(year => (
                           <tr key={year.id} className="hover:bg-slate-50 transition-colors">
                               <td className="px-4 py-3 font-medium text-slate-800">
                                   {editingYearId === year.id ? (
                                       <div className="flex gap-2">
                                           <input 
                                               className="w-24 px-2 py-1 border border-slate-300 rounded text-xs"
                                               value={editYearCode}
                                               onChange={(e) => setEditYearCode(e.target.value)}
                                               autoFocus
                                           />
                                           <button onClick={() => saveEditingYear(year)} className="text-green-600"><CheckCircle size={16}/></button>
                                           <button onClick={cancelEditingYear} className="text-red-400"><X size={16}/></button>
                                       </div>
                                   ) : (
                                       year.code
                                   )}
                               </td>
                               <td className="px-4 py-3 text-center">
                                   <button 
                                       onClick={() => onToggleLockAcademicYear(year.id)}
                                       className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border transition-colors ${year.isLocked ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`}
                                   >
                                       {year.isLocked ? <Lock size={12} /> : <Eye size={12} />}
                                       {year.isLocked ? 'Đã khóa' : 'Đang mở'}
                                   </button>
                               </td>
                               <td className="px-4 py-3 text-center">
                                   <input 
                                      type="radio" 
                                      name="currentYear" 
                                      checked={settings.currentAcademicYear === year.code}
                                      onChange={() => onSetCurrentYear(year.code)}
                                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                   />
                               </td>
                               <td className="px-4 py-3 text-right">
                                   <div className="flex justify-end gap-2">
                                        {!year.isLocked && (
                                            <button onClick={() => startEditingYear(year)} className="text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                                        )}
                                        <button onClick={() => onDeleteAcademicYear(year.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                   </div>
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
           <div className="flex gap-2">
               <input 
                  className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập mã năm học mới (VD: 2024-2025)"
                  value={newYearCode}
                  onChange={(e) => setNewYearCode(e.target.value)}
               />
               <button 
                  onClick={handleAddNewYear}
                  disabled={!newYearCode}
                  className={`px-4 py-2 rounded text-sm font-bold text-white transition-colors flex items-center gap-2 ${!newYearCode ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
               >
                   <PlusCircle size={16} /> Thêm Năm học
               </button>
           </div>
       </div>

       {/* SECTION 3: Google Drive Config */}
       <div className="border-t border-slate-200 pt-6">
           <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide flex items-center gap-2">
               <Database size={16} className="text-blue-600"/> Cấu hình Google Drive
           </h3>

           {!envClientId && (
               <div className="mb-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
                   <div className="flex items-start gap-3">
                       <AlertTriangle className="text-amber-500 mt-0.5" size={18} />
                       <div>
                           <p className="text-sm font-bold text-amber-800">Chưa cấu hình Google Client ID trong biến môi trường!</p>
                           <p className="text-xs text-amber-700 mt-1">
                               Vui lòng nhập Client ID thủ công bên dưới để kết nối. Để bảo mật và tiện lợi lâu dài, hãy thêm <code>VITE_GOOGLE_CLIENT_ID</code> vào file <code>.env</code>.
                           </p>
                           <input 
                               className="mt-2 w-full p-2 border border-amber-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                               placeholder="Enter your Google Client ID here..."
                               value={manualClientId}
                               onChange={(e) => setManualClientId(e.target.value)}
                           />
                       </div>
                   </div>
               </div>
           )}

           <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
               {/* Connection Status */}
               <div className="flex justify-between items-center">
                   <div>
                       <p className="text-sm font-bold text-slate-700">Trạng thái kết nối</p>
                       <div className="flex items-center gap-2 mt-1">
                           <span className={`w-3 h-3 rounded-full ${driveSession.isConnected ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                           <span className="text-sm text-slate-600">{driveSession.isConnected ? `Đã kết nối: ${driveSession.accountName}` : 'Chưa kết nối'}</span>
                       </div>
                   </div>
                   {driveSession.isConnected ? (
                       <button onClick={onDisconnectDrive} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg text-sm font-bold transition-all shadow-sm">
                           Ngắt kết nối
                       </button>
                   ) : (
                       <button onClick={onConnectDrive} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2">
                           <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-4 h-4 bg-white rounded-full p-0.5" alt="G" />
                           Kết nối với Google
                       </button>
                   )}
               </div>

               {/* Folder Management */}
               {driveSession.isConnected && (
                   <div className="border-t border-slate-200 pt-6">
                       <h4 className="text-sm font-bold text-slate-700 mb-4">Quản lý Thư mục Hệ thống</h4>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className={`p-4 rounded-lg border flex items-center gap-3 ${scanStatus?.foundFolder ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <Folder size={24} className={scanStatus?.foundFolder ? 'text-green-600' : 'text-red-500'} />
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Thư mục gốc (UniData_Backups)</p>
                                    <p className={`text-xs ${scanStatus?.foundFolder ? 'text-green-700' : 'text-red-600'}`}>
                                        {scanStatus?.foundFolder ? 'Đã tìm thấy' : 'Chưa tìm thấy'}
                                    </p>
                                </div>
                            </div>
                            <div className={`p-4 rounded-lg border flex items-center gap-3 ${scanStatus?.foundDataFolder ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                                <Database size={24} className={scanStatus?.foundDataFolder ? 'text-green-600' : 'text-orange-500'} />
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Thư mục dữ liệu (Data)</p>
                                    <p className={`text-xs ${scanStatus?.foundDataFolder ? 'text-green-700' : 'text-orange-700'}`}>
                                        {scanStatus?.foundDataFolder ? 'Đã tìm thấy' : 'Chưa tìm thấy (Dữ liệu đính kèm sẽ không hoạt động)'}
                                    </p>
                                </div>
                            </div>
                       </div>

                       {!scanStatus?.foundFolder && (
                           <div className="mb-4">
                               <button 
                                   onClick={onCreateDefaultFolders} 
                                   disabled={isCreatingFolder}
                                   className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center gap-2"
                               >
                                   {isCreatingFolder ? <Loader2 size={16} className="animate-spin"/> : <PlusCircle size={16}/>}
                                   Khởi tạo Cấu trúc Thư mục Mặc định
                               </button>
                           </div>
                       )}

                        {/* External Source Folder Config */}
                        <div className="mt-6 pt-6 border-t border-slate-200">
                           <h5 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                               <Share2 size={16} className="text-purple-600"/>
                               Cấu hình Nguồn Dữ liệu Mở rộng (External Source)
                           </h5>
                           <p className="text-xs text-slate-500 mb-3">
                               Nhập ID của thư mục được chia sẻ từ người dùng khác (nếu có) để truy cập dữ liệu báo cáo của họ ở chế độ chỉ đọc.
                           </p>
                           <div className="flex gap-2">
                               <input 
                                   className="flex-1 p-2 border border-slate-300 rounded text-sm font-mono"
                                   placeholder="Folder ID (e.g. 1A2B3C...)"
                                   value={externalSourceFolderId || ''}
                                   onChange={(e) => setExternalSourceFolderId && setExternalSourceFolderId(e.target.value)}
                               />
                               <button 
                                   onClick={onSaveDriveConfigOnly}
                                   className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-bold hover:bg-purple-700"
                               >
                                   Lưu Config
                               </button>
                           </div>
                       </div>
                       
                       {/* Sharing Manager */}
                        {driveFolderId && (
                           <div className="mt-6 pt-6 border-t border-slate-200">
                               <h5 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                   <Users size={16} className="text-indigo-600"/>
                                   Quản lý Chia sẻ (Quyền truy cập)
                               </h5>
                               
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   {/* Root Permissions */}
                                   <div className="bg-white p-4 rounded-lg border border-slate-200">
                                       <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold uppercase text-slate-500">Thư mục Hệ thống</span>
                                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{rootPermissions.length} users</span>
                                       </div>
                                       
                                       {/* Add User */}
                                       <div className="flex gap-2 mb-3">
                                            <input 
                                                className="flex-1 p-1.5 border border-slate-300 rounded text-xs"
                                                placeholder="Email người nhận..."
                                                value={shareEmailRoot}
                                                onChange={(e) => setShareEmailRoot(e.target.value)}
                                            />
                                            <button 
                                                onClick={() => addPermission(driveFolderId, shareEmailRoot, () => {
                                                    setShareEmailRoot('');
                                                    fetchPermissions(driveFolderId, setRootPermissions);
                                                })}
                                                disabled={isSharing || !shareEmailRoot}
                                                className="px-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 disabled:bg-slate-300"
                                            >
                                                {isSharing ? <Loader2 size={12} className="animate-spin"/> : <UserPlus size={14}/>}
                                            </button>
                                       </div>

                                       <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                           {rootPermissions.map(perm => (
                                               <div key={perm.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100 group">
                                                   <div className="flex items-center gap-2 overflow-hidden">
                                                       {perm.photoLink ? <img src={perm.photoLink} className="w-5 h-5 rounded-full" /> : <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-[8px]">{perm.displayName?.[0]}</div>}
                                                       <div className="flex-1 min-w-0">
                                                           <p className="text-xs font-bold text-slate-700 truncate">{perm.displayName || 'Unknown'}</p>
                                                           <p className="text-[10px] text-slate-500 truncate">{perm.emailAddress}</p>
                                                       </div>
                                                   </div>
                                                   <div className="flex items-center gap-1">
                                                       <span className="text-[9px] uppercase font-bold text-slate-400 bg-white px-1 rounded border">{perm.role}</span>
                                                       {perm.role !== 'owner' && (
                                                           <button 
                                                               onClick={() => removePermission(driveFolderId, perm.id, () => fetchPermissions(driveFolderId, setRootPermissions))}
                                                               className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                           >
                                                               <Trash2 size={12}/>
                                                           </button>
                                                       )}
                                                   </div>
                                               </div>
                                           ))}
                                       </div>
                                   </div>

                                   {/* File Permissions */}
                                   <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col">
                                       <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold uppercase text-slate-500">Phân quyền theo File</span>
                                            {isLoadingContent && <Loader2 size={12} className="animate-spin text-slate-400"/>}
                                       </div>
                                       
                                       <div className="flex-1 flex flex-col min-h-0">
                                           {/* File Selector */}
                                            <select 
                                                className="w-full p-1.5 border border-slate-300 rounded text-xs mb-3 bg-slate-50"
                                                onChange={(e) => {
                                                    const f = folderContents.find(file => file.id === e.target.value);
                                                    setSelectedFile(f || null);
                                                }}
                                                value={selectedFile?.id || ''}
                                            >
                                                <option value="">-- Chọn file để quản lý quyền --</option>
                                                {folderContents.map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>

                                            {selectedFile ? (
                                                <>
                                                    <div className="flex gap-2 mb-3">
                                                        <input 
                                                            className="flex-1 p-1.5 border border-slate-300 rounded text-xs"
                                                            placeholder={`Chia sẻ "${selectedFile.name}"...`}
                                                            value={shareEmailFile}
                                                            onChange={(e) => setShareEmailFile(e.target.value)}
                                                        />
                                                        <button 
                                                            onClick={() => addPermission(selectedFile.id, shareEmailFile, () => {
                                                                setShareEmailFile('');
                                                                fetchPermissions(selectedFile.id, setSelectedFilePermissions);
                                                            })}
                                                            disabled={isSharing || !shareEmailFile}
                                                            className="px-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 disabled:bg-slate-300"
                                                        >
                                                            {isSharing ? <Loader2 size={12} className="animate-spin"/> : <UserPlus size={14}/>}
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                                       {selectedFilePermissions.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">Chưa có quyền riêng lẻ.</p>}
                                                       {selectedFilePermissions.map(perm => (
                                                           <div key={perm.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100 group">
                                                               <div className="flex-1 min-w-0 pr-2">
                                                                   <p className="text-xs font-bold text-slate-700 truncate">{perm.displayName || perm.emailAddress}</p>
                                                                   <p className="text-[10px] text-slate-500 truncate">{perm.role}</p>
                                                               </div>
                                                               {perm.role !== 'owner' && (
                                                                   <button 
                                                                       onClick={() => removePermission(selectedFile.id, perm.id, () => fetchPermissions(selectedFile.id, setSelectedFilePermissions))}
                                                                       className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                   >
                                                                       <Trash2 size={12}/>
                                                                   </button>
                                                               )}
                                                           </div>
                                                       ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center text-slate-300 text-xs italic border border-dashed border-slate-200 rounded">
                                                    Chọn file để xem quyền chi tiết
                                                </div>
                                            )}
                                       </div>
                                   </div>
                               </div>
                           </div>
                       )}

                   </div>
               )}
           </div>
       </div>

       {/* SECTION 4: System Configs */}
       <div className="border-t border-slate-200 pt-6">
           <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide flex items-center gap-2">
               <Settings size={16} className="text-slate-600"/> Cấu hình Tham số
           </h3>
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
               <label className="block text-xs font-semibold text-slate-500 mb-1">URL Trợ lý ảo (Virtual Assistant)</label>
               <div className="flex gap-2">
                   <input 
                       className="flex-1 p-2 border border-slate-300 rounded text-sm"
                       value={virtualAssistantUrl}
                       onChange={(e) => setVirtualAssistantUrl(e.target.value)}
                   />
                   <button onClick={handleSaveGeneral} className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">Lưu</button>
               </div>
               <p className="text-[10px] text-slate-400 mt-1">
                   Mặc định: <code>https://gemini.google.com/app</code>. Dùng để mở nhanh từ giao diện nhập liệu.
               </p>
           </div>
       </div>
    </div>
  );
};

export default GeneralConfigModule;