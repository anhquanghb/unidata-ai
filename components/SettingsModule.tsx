import React, { useState, useRef, useEffect } from 'react';
import { SystemSettings, UserProfile, UniversityReport, Unit, AcademicYear, SchoolInfo } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Declare globals for Google Scripts
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface SettingsModuleProps {
  settings: SystemSettings;
  users: UserProfile[];
  reports: UniversityReport[];
  units: Unit[];
  academicYears: AcademicYear[];
  schoolInfo: SchoolInfo;
  onUpdateSettings: (settings: SystemSettings) => void;
  onAddUser: (user: UserProfile) => void;
  onRemoveUser: (id: string) => void;
  onAddAcademicYear: (year: AcademicYear) => void;
  onUpdateAcademicYear: (year: AcademicYear) => void;
  onDeleteAcademicYear: (id: string) => void;
  onToggleLockAcademicYear: (id: string) => void;
  onImportData: (data: any) => void;
  onUpdateSchoolInfo: (info: SchoolInfo) => void;
}

const SCOPES = 'https://www.googleapis.com/auth/drive.file'; // Access only files created by the app
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

const SettingsModule: React.FC<SettingsModuleProps> = ({ 
  settings, 
  users, 
  reports,
  units,
  academicYears,
  schoolInfo,
  onUpdateSettings,
  onAddUser,
  onRemoveUser,
  onAddAcademicYear,
  onUpdateAcademicYear,
  onDeleteAcademicYear,
  onToggleLockAcademicYear,
  onImportData,
  onUpdateSchoolInfo
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'prompts' | 'backup'>('general');

  // Local state for forms
  const [extractionPrompt, setExtractionPrompt] = useState(settings.extractionPrompt);
  const [analysisPrompt, setAnalysisPrompt] = useState(settings.analysisPrompt);
  const [virtualAssistantUrl, setVirtualAssistantUrl] = useState(settings.virtualAssistantUrl || "https://gemini.google.com/app");

  // Drive State
  // Prioritize Environment Variable
  const envClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  
  // State for manual input (used if Env Var is missing)
  const [manualClientId, setManualClientId] = useState(settings.driveConfig?.clientId || '');
  
  // The actual Client ID to use
  const effectiveClientId = envClientId || manualClientId;

  const [driveFolderId, setDriveFolderId] = useState(settings.driveConfig?.folderId || '');
  const [driveFolderName, setDriveFolderName] = useState(settings.driveConfig?.folderName || 'UniData_Backups');
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [isGisLoaded, setIsGisLoaded] = useState(false);

  const [newUser, setNewUser] = useState({ fullName: '', username: '', role: 'staff' as 'admin' | 'staff' });
  const [newYearCode, setNewYearCode] = useState('');

  // Editing Year State
  const [editingYearId, setEditingYearId] = useState<string | null>(null);
  const [editYearCode, setEditYearCode] = useState('');

  // Editing School Info State
  const [editingSchool, setEditingSchool] = useState(false);
  const [editSchoolName, setEditSchoolName] = useState(schoolInfo.name);
  const [editSchoolCode, setEditSchoolCode] = useState(schoolInfo.code);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- GOOGLE DRIVE SCRIPTS LOADING ---
  useEffect(() => {
    const loadGapi = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client', async () => {
          await window.gapi.client.init({
             discoveryDocs: [DISCOVERY_DOC],
          });
          setIsGapiLoaded(true);
        });
      };
      document.body.appendChild(script);
    };

    const loadGis = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => setIsGisLoaded(true);
      document.body.appendChild(script);
    };

    if (!window.gapi) loadGapi(); else setIsGapiLoaded(true);
    if (!window.google) loadGis(); else setIsGisLoaded(true);
  }, []);

  const handleSavePrompts = () => {
    onUpdateSettings({ ...settings, extractionPrompt, analysisPrompt });
    alert("Đã lưu cấu hình AI Prompts!");
  };

  const handleSaveGeneral = () => {
      onUpdateSettings({ ...settings, virtualAssistantUrl });
      alert("Đã lưu cấu hình chung!");
  };

  // --- DRIVE HANDLERS (REAL IMPLEMENTATION) ---
  
  const handleConnectDrive = () => {
    if (!effectiveClientId) {
        alert("Vui lòng nhập Google Client ID hoặc cấu hình biến môi trường VITE_GOOGLE_CLIENT_ID.");
        return;
    }
    if (!isGapiLoaded || !isGisLoaded) {
        alert("Đang tải thư viện Google, vui lòng thử lại sau vài giây.");
        return;
    }

    // Initialize Token Client
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: effectiveClientId,
      scope: SCOPES,
      callback: async (resp: any) => {
        if (resp.error) {
           console.error(resp);
           alert("Lỗi đăng nhập Google Drive: " + resp.error);
           return;
        }

        if (resp.access_token) {
           // Success! Fetch User Info to confirm
           try {
             // Ensure access token is set for GAPI calls
             window.gapi.client.setToken(resp);
             
             const userInfo = await window.gapi.client.drive.about.get({
                fields: "user, storageQuota"
             });

             const userEmail = userInfo.result.user.emailAddress;
             const userName = userInfo.result.user.displayName;

             // --- SEARCH OR CREATE FOLDER LOGIC ---
             let targetFolderId = driveFolderId;

             try {
                 const q = `mimeType='application/vnd.google-apps.folder' and name='${driveFolderName}' and trashed=false`;
                 const folderResp = await window.gapi.client.drive.files.list({
                     q: q,
                     fields: 'files(id, name)',
                     spaces: 'drive',
                 });
                 
                 if (folderResp.result.files && folderResp.result.files.length > 0) {
                     targetFolderId = folderResp.result.files[0].id;
                     console.log("Found existing backup folder:", targetFolderId);
                 } else {
                     const fileMetadata = {
                         name: driveFolderName,
                         mimeType: 'application/vnd.google-apps.folder'
                     };
                     const createResp = await window.gapi.client.drive.files.create({
                         resource: fileMetadata,
                         fields: 'id'
                     });
                     targetFolderId = createResp.result.id;
                     console.log("Created new backup folder:", targetFolderId);
                 }
             } catch (err) {
                 console.error("Error managing drive folder:", err);
                 alert("Cảnh báo: Không thể kiểm tra/tạo thư mục sao lưu. Vui lòng kiểm tra quyền truy cập.");
             }
             
             setDriveFolderId(targetFolderId);

             onUpdateSettings({
                ...settings,
                driveConfig: {
                    ...settings.driveConfig,
                    isConnected: true,
                    clientId: effectiveClientId,
                    accessToken: resp.access_token,
                    accountName: `${userName} (${userEmail})`,
                    folderId: targetFolderId,
                    folderName: driveFolderName
                }
             });

             alert(`Kết nối thành công với tài khoản: ${userEmail}\nThư mục dữ liệu: ${driveFolderName}`);

           } catch (err: any) {
             console.error("Error fetching drive info", err);
             alert("Đăng nhập thành công nhưng xảy ra lỗi khi khởi tạo thư mục.");
           }
        }
      },
    });

    // Trigger Pop-up
    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleDisconnectDrive = () => {
    const confirm = window.confirm("Bạn có chắc muốn ngắt kết nối? Token truy cập sẽ bị xóa.");
    if (confirm) {
        if (settings.driveConfig.accessToken && window.google) {
            window.google.accounts.oauth2.revoke(settings.driveConfig.accessToken, () => {
                console.log('Token revoked');
            });
        }

        onUpdateSettings({
            ...settings,
            driveConfig: {
                ...settings.driveConfig,
                isConnected: false,
                accessToken: undefined,
                accountName: undefined,
                folderId: '',
            }
        });
        setDriveFolderId('');
    }
  };

  const handleSaveDriveConfigOnly = () => {
      // Saves Client ID/Folder without connecting
      onUpdateSettings({
          ...settings,
          driveConfig: {
              ...settings.driveConfig,
              clientId: manualClientId,
              folderId: driveFolderId,
              folderName: driveFolderName
          }
      });
      alert("Đã lưu cấu hình (Chưa kết nối)!");
  };


  // --- USER & YEAR HANDLERS ---
  const handleAddUser = () => {
    if (!newUser.fullName || !newUser.username) return;
    onAddUser({
      id: uuidv4(),
      fullName: newUser.fullName,
      username: newUser.username,
      role: newUser.role,
    });
    setNewUser({ fullName: '', username: '', role: 'staff' });
  };

  const handleAddNewYear = () => {
    if (!newYearCode.trim()) return;
    onAddAcademicYear({
        id: uuidv4(),
        code: newYearCode.trim(),
        isLocked: false
    });
    setNewYearCode('');
  };

  const handleSetCurrentYear = (code: string) => {
    onUpdateSettings({ ...settings, currentAcademicYear: code });
  };

  // Year Editing Handlers
  const startEditingYear = (year: AcademicYear) => {
    if (year.isLocked) return; // Prevent editing if locked
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

  // School Editing Handlers
  const handleSaveSchoolInfo = () => {
    onUpdateSchoolInfo({ name: editSchoolName, code: editSchoolCode });
    setEditingSchool(false);
  }

  const handleExport = () => {
    const data = {
      reports,
      units,
      users,
      settings,
      academicYears,
      schoolInfo,
      backupDate: new Date().toISOString(),
      version: "1.2"
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `unidata_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (window.confirm(`Bạn có chắc chắn muốn nhập dữ liệu từ file này? \nDữ liệu hiện tại sẽ bị thay thế.`)) {
            onImportData(json);
            alert("Nhập dữ liệu thành công!");
        }
      } catch (error) {
        alert("Lỗi: File không hợp lệ hoặc bị lỗi định dạng JSON.");
        console.error(error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Cài đặt Hệ thống</h2>
        <p className="text-slate-600">Quản lý tham số hệ thống, thông tin trường, người dùng và cấu hình AI.</p>
      </div>

      <div className="flex space-x-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          { id: 'general', label: 'Cấu hình Chung' },
          { id: 'users', label: 'Quản lý User' },
          { id: 'prompts', label: 'AI Prompts' },
          { id: 'backup', label: 'Sao lưu dữ liệu' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
        {/* TAB: GENERAL */}
        {activeTab === 'general' && (
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
                             <p className="text-slate-600 mb-4 text-sm">Kết nối với Google Drive để đồng bộ dữ liệu.</p>
                             <div className="flex justify-center gap-2">
                                 {!envClientId && (
                                     <button 
                                        onClick={handleSaveDriveConfigOnly}
                                        className="px-3 py-2 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50"
                                     >
                                        Lưu Client ID
                                     </button>
                                 )}
                                 <button 
                                    onClick={handleConnectDrive}
                                    disabled={!effectiveClientId}
                                    className={`inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${!effectiveClientId ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                 >
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                                    Kết nối Google Drive
                                 </button>
                             </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
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
                                <button onClick={handleDisconnectDrive} className="text-xs text-red-600 hover:underline font-medium">Ngắt kết nối</button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-green-200">
                                <div>
                                    <label className="block text-xs font-semibold text-green-700 mb-1">Tên Thư mục Lưu trữ</label>
                                    <input 
                                        className="w-full border border-green-300 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                        value={driveFolderName}
                                        onChange={(e) => setDriveFolderName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-green-700 mb-1">Folder ID (Tùy chọn)</label>
                                    <input 
                                        className="w-full border border-green-300 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                                        value={driveFolderId}
                                        onChange={(e) => setDriveFolderId(e.target.value)}
                                        placeholder="Để trống để tự tạo"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end mt-2">
                                <button onClick={handleSaveDriveConfigOnly} className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700">Cập nhật thư mục</button>
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
                                  onClick={() => handleSetCurrentYear(year.code)} // Click row to set context
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
        )}

        {/* TAB: BACKUP */}
        {activeTab === 'backup' && (
           <div className="space-y-8 max-w-xl">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-blue-900 mb-2">1. Xuất dữ liệu hệ thống</h3>
                  <p className="text-sm text-blue-700 mb-4">
                      Tải xuống toàn bộ dữ liệu (Báo cáo, Cơ cấu tổ chức, Người dùng, Cài đặt) dưới dạng file JSON để lưu trữ hoặc chuyển sang máy khác.
                  </p>
                  <button 
                      onClick={handleExport}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Xuất dữ liệu (.json)
                  </button>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <h3 className="font-semibold text-orange-900 mb-2">2. Nhập dữ liệu từ file</h3>
                  <p className="text-sm text-orange-700 mb-4">
                      Khôi phục hệ thống từ file backup. <strong className="block mt-1">LƯU Ý: Hành động này sẽ ghi đè toàn bộ dữ liệu hiện tại!</strong>
                  </p>
                  <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept=".json" 
                      className="hidden" 
                  />
                  <button 
                      onClick={handleImportClick}
                      className="flex items-center px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm font-medium"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Chọn file backup (.json)
                  </button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModule;
