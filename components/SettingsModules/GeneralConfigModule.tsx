import React, { useState, useEffect } from 'react';
import { SystemSettings, SchoolInfo, AcademicYear } from '../../types';
import { Users, UserPlus, Trash2, Folder, File, RefreshCw, Loader2, Lock, Eye, Share2, ChevronRight, AlertTriangle, PlusCircle } from 'lucide-react';

interface GeneralConfigModuleProps {
  settings: SystemSettings;
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
  onCreateDefaultFolders, isCreatingFolder, // New props
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
  const [editSchoolName, setEditSchoolName] = useState(schoolInfo.name);
  const [editSchoolCode, setEditSchoolCode] = useState(schoolInfo.code);

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
      onUpdateSchoolInfo({ name: editSchoolName, code: editSchoolCode });
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
      if (!fileId || !settings.driveConfig.isConnected) return;
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
      if (!driveFolderId || !settings.driveConfig.isConnected) return;
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
              permissionId: permissionId
          });
          callback();
      } catch (e: any) {
          console.error("Revoke error:", e);
          alert("Lỗi khi xóa quyền: " + (e.result?.error?.message || e.message));
      }
  };

  // Load root permissions when config/id changes
  useEffect(() => {
      if (settings.driveConfig.isConnected && driveFolderId) {
          fetchPermissions(driveFolderId, setRootPermissions);
      }
  }, [settings.driveConfig.isConnected, driveFolderId]);

  return (
    <div className="space-y-8">
       {/* School Info Section */}
       <div className="border-b border-slate-100 pb-8">
          <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Thông tin Đơn vị (Cấp Trường)</h3>
          <div 
            className={`p-4 rounded-lg border-2 ${editingSchool ? 'border-blue-300 bg-blue-50' : 'border-dashed border-slate-300 hover:border-blue-400 cursor-pointer transition-colors'}`}
            onDoubleClick={() => { if(!editingSchool) { setEditSchoolName(schoolInfo.name); setEditSchoolCode(schoolInfo.code); setEditingSchool(true); } }}
          >
              {editingSchool ? (
                  <div className="flex flex-col gap-3">
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Tên Trường</label>
                          <input 
                              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={editSchoolName}
                              onChange={(e) => setEditSchoolName(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Mã Đơn vị (Viết tắt)</label>
                          <input 
                              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={editSchoolCode}
                              onChange={(e) => setEditSchoolCode(e.target.value)}
                          />
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => setEditingSchool(false)} className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800">Hủy</button>
                          <button onClick={handleSaveSchoolInfo} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Lưu thay đổi</button>
                      </div>
                  </div>
              ) : (
                  <div className="flex items-center justify-between">
                      <div>
                          <h4 className="text-lg font-bold text-slate-800">{schoolInfo.name}</h4>
                          <p className="text-sm text-slate-500 font-mono">Mã: {schoolInfo.code}</p>
                      </div>
                      <span className="text-xs text-slate-400 italic">Nhấp đúp để sửa</span>
                  </div>
              )}
          </div>
       </div>

       {/* Google Drive Configuration */}
       <div className="border-b border-slate-100 pb-8">
          <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.01 1.984c-1.127 0-2.17.61-2.735 1.594L2.09 16.34c-.567.983-.567 2.19 0 3.173.565.985 1.608 1.595 2.735 1.595h14.35c1.128 0 2.172-.61 2.736-1.595.567-.982.567-2.19 0-3.172L14.746 3.578c-.565-.984-1.608-1.594-2.735-1.594zM12.01 4.49l7.175 12.766H4.834L12.01 4.49z"/>
                  <path d="M7.886 17.256h8.25L12.01 9.87z" fill="white"/>
              </svg>
              Cấu hình Google Drive (Real)
          </h3>
          
          <div className="space-y-4">
              {/* Client ID Input - Securely displayed if from ENV */}
              <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Google Client ID (OAuth 2.0)</label>
                   
                   {envClientId ? (
                      <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                          </div>
                          <input 
                              className="w-full border border-green-200 bg-green-50 rounded pl-10 px-3 py-2 text-sm focus:outline-none font-mono text-green-700 cursor-not-allowed"
                              value="••••••••••••••••••••••••••••••••••••••••"
                              disabled
                              type="text"
                          />
                           <p className="text-[10px] text-green-600 mt-1 flex items-center">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                               Đã tải an toàn từ biến môi trường (VITE_GOOGLE_CLIENT_ID)
                           </p>
                      </div>
                   ) : (
                       <>
                          <input 
                              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs disabled:bg-slate-50 disabled:text-slate-500"
                              value={manualClientId}
                              onChange={(e) => setManualClientId(e.target.value)}
                              placeholder="VD: 123456789-abc...apps.googleusercontent.com"
                              disabled={settings.driveConfig?.isConnected}
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                              * Yêu cầu cấu hình "Authorized JavaScript origins" trên Google Cloud Console khớp với tên miền hiện tại.
                          </p>
                       </>
                   )}
              </div>

              {!settings.driveConfig?.isConnected ? (
                  <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 text-center">
                       <p className="text-slate-600 mb-4 text-sm">Kết nối với Google Drive để đồng bộ dữ liệu và lưu trữ tập tin.</p>
                       
                       <div className="flex justify-center gap-2 mt-4">
                           {!envClientId && (
                               <button 
                                  onClick={onSaveDriveConfigOnly}
                                  className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50"
                               >
                                  Lưu Client ID
                               </button>
                           )}
                           <button 
                              onClick={onConnectDrive}
                              disabled={!effectiveClientId}
                              className={`inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${!effectiveClientId ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                           >
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                              {settings.driveConfig?.isConnected ? "Xác thực lại / Kết nối tài khoản khác" : "Kiểm tra kết nối (Xác thực)"}
                           </button>
                       </div>
                  </div>
              ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      {/* Connection Header */}
                      <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-green-800">Đã kết nối</p>
                                  <p className="text-xs text-green-600">{settings.driveConfig.accountName}</p>
                              </div>
                          </div>
                          <button onClick={onDisconnectDrive} className="px-3 py-1 bg-white border border-red-200 rounded text-xs text-red-600 hover:bg-red-50 font-medium">Đăng xuất</button>
                      </div>
                      
                      {/* Folder Status Logic */}
                      {!driveFolderId ? (
                          // CASE 1: Folder Not Found
                          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in">
                              <div className="flex items-start gap-3">
                                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20}/>
                                  <div>
                                      <h4 className="text-sm font-bold text-amber-800 mb-1">Thư mục hệ thống chưa tồn tại!</h4>
                                      <p className="text-xs text-amber-700 mb-3">
                                          Hệ thống không tìm thấy thư mục <strong>UniData_Backups</strong> trên Google Drive của bạn. Bạn cần khởi tạo cấu trúc thư mục để lưu trữ dữ liệu.
                                      </p>
                                      <button 
                                          onClick={onCreateDefaultFolders}
                                          disabled={isCreatingFolder}
                                          className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700 flex items-center gap-2"
                                      >
                                          {isCreatingFolder ? <Loader2 size={14} className="animate-spin"/> : <PlusCircle size={14}/>}
                                          Khởi tạo Cấu trúc Thư mục
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          // CASE 2: Folder Found - Show Info & Permissions
                          <div className="space-y-4 mt-4 pt-4 border-t border-green-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-semibold text-green-700 mb-1">Tên Thư mục (Mặc định)</label>
                                      <input 
                                          className="w-full border border-green-300 bg-green-50/50 rounded px-3 py-2 text-sm text-green-800 font-bold disabled:cursor-not-allowed"
                                          value="UniData_Backups"
                                          disabled
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-semibold text-green-700 mb-1">Folder ID</label>
                                      <input 
                                          className="w-full border border-green-300 bg-white rounded px-3 py-2 text-sm focus:outline-none font-mono"
                                          value={driveFolderId}
                                          disabled
                                          readOnly
                                      />
                                  </div>
                                  <div className="col-span-2">
                                     <div className="flex items-center gap-2 text-xs text-green-700 bg-green-100 p-2 rounded">
                                        <Folder size={14}/>
                                        <span>Thư mục con: <strong>UniData_Backups/Data</strong> (Dùng để upload file đính kèm)</span>
                                     </div>
                                  </div>
                              </div>
                              
                              {/* -- ADVANCED SHARING SECTION -- */}
                              <div className="border-t border-green-200 pt-4 mt-2">
                                  <h4 className="font-bold text-green-800 text-sm mb-3 flex items-center gap-2">
                                      <Users size={16}/> Quản lý Chia sẻ & Phân quyền (Reader Only)
                                  </h4>
                                  
                                  {/* 1. Root Folder Permissions */}
                                  <div className="bg-white border border-green-200 rounded-lg p-3 mb-4">
                                      <div className="flex justify-between items-center mb-2">
                                          <p className="text-xs font-bold text-green-700 uppercase">Thư mục gốc (UniData_Backups)</p>
                                          <button onClick={() => fetchPermissions(driveFolderId, setRootPermissions)} className="text-green-600 hover:text-green-800 p-1"><RefreshCw size={12}/></button>
                                      </div>
                                      
                                      <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                                          {rootPermissions.map(perm => (
                                              <div key={perm.id} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded">
                                                  <div className="flex items-center gap-2">
                                                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                                                          {perm.photoLink ? <img src={perm.photoLink} alt="" /> : <Users size={12}/>}
                                                      </div>
                                                      <div>
                                                          <div className="font-medium">{perm.displayName || perm.emailAddress}</div>
                                                          <div className="text-slate-400 text-[10px]">{perm.role}</div>
                                                      </div>
                                                  </div>
                                                  {perm.role !== 'owner' && (
                                                      <button onClick={() => removePermission(driveFolderId, perm.id, () => fetchPermissions(driveFolderId, setRootPermissions))} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                                                  )}
                                              </div>
                                          ))}
                                      </div>

                                      <div className="flex gap-2">
                                          <input 
                                              className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-xs outline-none focus:border-green-500"
                                              placeholder="Email chia sẻ (Quyền đọc)..."
                                              value={shareEmailRoot}
                                              onChange={e => setShareEmailRoot(e.target.value)}
                                          />
                                          <button 
                                              onClick={() => {
                                                  addPermission(driveFolderId, shareEmailRoot, () => {
                                                      setShareEmailRoot('');
                                                      fetchPermissions(driveFolderId, setRootPermissions);
                                                  });
                                              }}
                                              disabled={isSharing || !shareEmailRoot}
                                              className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                                          >
                                              {isSharing ? <Loader2 size={12} className="animate-spin"/> : <UserPlus size={12}/>} Share
                                          </button>
                                      </div>
                                  </div>

                                  {/* 2. File/Subfolder Permissions */}
                                  <div className="bg-white border border-green-200 rounded-lg overflow-hidden flex flex-col md:flex-row h-64">
                                      {/* Left: Content List */}
                                      <div className="w-full md:w-1/2 border-r border-green-200 flex flex-col">
                                          <div className="p-2 border-b border-green-100 bg-green-50 flex justify-between items-center">
                                              <span className="text-xs font-bold text-green-700">File & Thư mục con</span>
                                              <button onClick={fetchFolderContent} className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-green-100 shadow-sm"><RefreshCw size={10}/> Quét</button>
                                          </div>
                                          <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                              {isLoadingContent ? (
                                                  <div className="flex justify-center p-4"><Loader2 size={16} className="animate-spin text-green-500"/></div>
                                              ) : folderContents.length === 0 ? (
                                                  <p className="text-xs text-slate-400 text-center p-4">Trống hoặc chưa quét</p>
                                              ) : (
                                                  folderContents.map(file => (
                                                      <div 
                                                          key={file.id} 
                                                          onClick={() => { setSelectedFile(file); fetchPermissions(file.id, setSelectedFilePermissions); }}
                                                          className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs ${selectedFile?.id === file.id ? 'bg-green-100 text-green-900 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                                                      >
                                                          {file.mimeType.includes('folder') ? <Folder size={14} className="text-blue-500"/> : <File size={14} className="text-slate-400"/>}
                                                          <span className="truncate flex-1">{file.name}</span>
                                                          <ChevronRight size={12} className="text-slate-300"/>
                                                      </div>
                                                  ))
                                              )}
                                          </div>
                                      </div>

                                      {/* Right: Specific Permissions */}
                                      <div className="w-full md:w-1/2 flex flex-col">
                                          <div className="p-2 border-b border-green-100 bg-green-50">
                                              <span className="text-xs font-bold text-green-700 truncate block h-4">
                                                  {selectedFile ? `Quyền: ${selectedFile.name}` : 'Chọn file để xem quyền'}
                                              </span>
                                          </div>
                                          <div className="flex-1 p-2 overflow-y-auto">
                                              {!selectedFile ? (
                                                  <div className="h-full flex items-center justify-center text-slate-300">
                                                      <Lock size={24}/>
                                                  </div>
                                              ) : isLoadingPermissions ? (
                                                  <div className="flex justify-center p-4"><Loader2 size={16} className="animate-spin text-green-500"/></div>
                                              ) : (
                                                  <div className="space-y-2">
                                                      {selectedFilePermissions.length === 0 && <p className="text-xs text-slate-400">Chưa có ai khác.</p>}
                                                      {selectedFilePermissions.map(perm => (
                                                          <div key={perm.id} className="flex justify-between items-center text-xs bg-slate-50 p-1.5 rounded border border-slate-100">
                                                              <div className="flex items-center gap-1.5 overflow-hidden">
                                                                  <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                                      {perm.displayName?.[0] || 'U'}
                                                                  </div>
                                                                  <span className="truncate max-w-[80px]" title={perm.emailAddress}>{perm.emailAddress}</span>
                                                              </div>
                                                              {perm.role !== 'owner' && (
                                                                  <button onClick={() => removePermission(selectedFile.id, perm.id, () => fetchPermissions(selectedFile.id, setSelectedFilePermissions))} className="text-red-400 hover:text-red-600"><Trash2 size={10}/></button>
                                                              )}
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                          
                                          {selectedFile && (
                                              <div className="p-2 border-t border-green-100 bg-white">
                                                  <div className="flex gap-1">
                                                      <input 
                                                          className="flex-1 border border-slate-300 rounded px-2 py-1 text-[10px] outline-none focus:border-green-500"
                                                          placeholder="Email..."
                                                          value={shareEmailFile}
                                                          onChange={e => setShareEmailFile(e.target.value)}
                                                      />
                                                      <button 
                                                          onClick={() => {
                                                              addPermission(selectedFile.id, shareEmailFile, () => {
                                                                  setShareEmailFile('');
                                                                  fetchPermissions(selectedFile.id, setSelectedFilePermissions);
                                                              });
                                                          }}
                                                          disabled={isSharing || !shareEmailFile}
                                                          className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-blue-700 disabled:opacity-50"
                                                      >
                                                          Share
                                                      </button>
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* Connection Actions Footer */}
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-green-100">
                          <button 
                              onClick={onConnectDrive}
                              disabled={!effectiveClientId}
                              className="text-xs text-green-700 underline hover:text-green-900"
                          >
                              {settings.driveConfig?.isConnected ? "Xác thực lại / Quét lại thư mục" : "Kiểm tra kết nối"}
                          </button>
                          <button onClick={onSaveDriveConfigOnly} className="px-3 py-2 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 shadow-sm">
                              Lưu ID & Folder mở rộng
                          </button>
                      </div>

                      <div className="mt-4 pt-2 border-t border-green-200">
                          <label className="block text-xs font-semibold text-green-700 mb-1">Thư mục Nguồn Dữ liệu (Chỉ đọc - Tùy chọn)</label>
                          <div className="flex gap-2">
                            <input 
                                className="flex-1 border border-green-300 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                                value={externalSourceFolderId || ''}
                                onChange={(e) => setExternalSourceFolderId && setExternalSourceFolderId(e.target.value)}
                                placeholder="Nhập Drive Folder ID (Dùng để đọc dữ liệu chia sẻ)"
                            />
                          </div>
                          <p className="text-[10px] text-green-600 mt-1">
                              * Nhập ID của thư mục Drive mà bạn được chia sẻ quyền xem (nếu có).
                          </p>
                      </div>
                  </div>
              )}
          </div>
       </div>

       {/* External Services Section */}
       <div className="border-b border-slate-100 pb-8">
          <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Kết nối Trợ lý ảo (AI Assistant)</h3>
          <div className="flex gap-4 items-end">
              <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Link Trợ lý ảo (Gemini/ChatGPT...)</label>
                  <input 
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://gemini.google.com/app"
                      value={virtualAssistantUrl}
                      onChange={(e) => setVirtualAssistantUrl(e.target.value)}
                  />
              </div>
              <button onClick={handleSaveGeneral} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Lưu Link</button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Đường dẫn này sẽ được mở khi bạn nhấn nút "Mở Trợ lý ảo" trong module Tiếp nhận dữ liệu.</p>
       </div>

       {/* Academic Years Section */}
       <div>
          <div className="flex justify-between items-end mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Quản lý Năm học</h3>
          </div>
          
          <div className="flex gap-2 mb-4">
               <input 
                  type="text" 
                  placeholder="VD: 2025-2026"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newYearCode}
                  onChange={(e) => setNewYearCode(e.target.value)}
              />
              <button 
                  onClick={handleAddNewYear}
                  disabled={!newYearCode.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 whitespace-nowrap"
              >
                  Thêm Năm học
              </button>
          </div>

          <div className="overflow-hidden border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold">
                      <tr>
                          <th className="px-4 py-3">Năm học</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3">Hiển thị toàn cục</th>
                          <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {academicYears.map(year => (
                          <tr 
                            key={year.id} 
                            className={`hover:bg-slate-50 transition-colors ${settings.currentAcademicYear === year.code ? 'bg-blue-50' : ''}`}
                            onClick={() => onSetCurrentYear(year.code)} // Click row to set context
                          >
                              <td className="px-4 py-3 font-medium text-slate-800" onClick={(e) => e.stopPropagation()}>
                                {editingYearId === year.id ? (
                                  <div className="flex items-center space-x-2">
                                    <input 
                                      className="w-32 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none"
                                      value={editYearCode}
                                      onChange={(e) => setEditYearCode(e.target.value)}
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditingYear(year);
                                        if (e.key === 'Escape') cancelEditingYear();
                                      }}
                                    />
                                    <button onClick={() => saveEditingYear(year)} className="text-green-600 hover:text-green-800">✓</button>
                                    <button onClick={cancelEditingYear} className="text-red-600 hover:text-red-800">✕</button>
                                  </div>
                                ) : (
                                  <div 
                                    onDoubleClick={() => startEditingYear(year)}
                                    className={`cursor-pointer select-none flex items-center ${year.isLocked ? 'text-slate-400' : ''}`}
                                    title={year.isLocked ? "Không thể sửa khi đang khóa" : "Nhấp đúp để sửa"}
                                  >
                                    {year.code}
                                    {year.isLocked && <span className="ml-2 text-xs italic text-slate-400">(Read-only)</span>}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                      onClick={() => onToggleLockAcademicYear(year.id)}
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold transition-colors ${year.isLocked ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                  >
                                      {year.isLocked ? 'Đã khóa (Chỉ xem)' : 'Đang mở (Cho phép sửa)'}
                                  </button>
                              </td>
                              <td className="px-4 py-3">
                                  {settings.currentAcademicYear === year.code ? (
                                      <span className="text-blue-600 font-bold text-xs flex items-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                          </svg>
                                          Đang chọn
                                      </span>
                                  ) : (
                                      <span className="text-slate-400 text-xs">Nhấp để chọn</span>
                                  )}
                              </td>
                              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                      onClick={() => onDeleteAcademicYear(year.id)}
                                      className={`${year.isLocked || settings.currentAcademicYear === year.code ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-600'} p-1`}
                                      title={year.isLocked ? "Không thể xóa năm học đã khóa" : "Xóa năm học"}
                                      disabled={year.isLocked || settings.currentAcademicYear === year.code}
                                  >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
              * Nhấp vào một dòng Năm học để đặt làm <strong>Năm hiển thị hiện tại</strong> cho toàn hệ thống.
              <br/>
              * Khi năm học bị "Khóa", toàn bộ dữ liệu thuộc năm đó sẽ chuyển sang chế độ <strong>Chỉ xem</strong>.
          </p>
       </div>
    </div>
  );
};
export default GeneralConfigModule;