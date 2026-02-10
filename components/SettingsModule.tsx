import React, { useState, useRef, useEffect } from 'react';
import { SystemSettings, UserProfile, UniversityReport, Unit, AcademicYear, SchoolInfo } from '../types';
import BackupDataModule from './SettingsModules/BackupDataModule';
import UserManagementModule from './SettingsModules/UserManagementModule';
import AIPromptModule from './SettingsModules/AIPromptModule';
import GeneralConfigModule from './SettingsModules/GeneralConfigModule';

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
const STORAGE_KEY = 'UNIDATA_DRIVE_SESSION'; // Key for localStorage

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
  // Ordered: Backup -> Users -> Prompts -> General
  const [activeTab, setActiveTab] = useState<'backup' | 'users' | 'prompts' | 'general'>('backup');

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

  // --- RESTORE SESSION FROM LOCAL STORAGE ---
  useEffect(() => {
    // Only restore if not already connected and gapi is loaded (to set token)
    if (!settings.driveConfig.isConnected) {
        const savedSession = localStorage.getItem(STORAGE_KEY);
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                // Check if token is likely expired (approx 1 hour usually). 
                // We use 50 minutes to be safe.
                const now = Date.now();
                const elapsed = now - parsed.timestamp;
                const EXPIRE_THRESHOLD = 50 * 60 * 1000; // 50 minutes

                if (elapsed < EXPIRE_THRESHOLD) {
                    console.log("Restoring Drive session from LocalStorage...");
                    
                    // Update Global State
                    onUpdateSettings({
                        ...settings,
                        driveConfig: parsed.config
                    });

                    // Update Local State
                    setDriveFolderId(parsed.config.folderId);
                    setDriveFolderName(parsed.config.folderName);
                    
                } else {
                    console.log("Saved Drive session expired. Clearing.");
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch (e) {
                console.error("Error restoring session:", e);
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }
  }, [settings.driveConfig.isConnected]);

  // --- SYNC GAPI TOKEN WHEN SETTINGS CHANGE ---
  useEffect(() => {
      if (isGapiLoaded && settings.driveConfig.isConnected && settings.driveConfig.accessToken) {
          // Ensure gapi client has the token so API calls work
          const currentToken = window.gapi.client.getToken();
          if (!currentToken) {
              window.gapi.client.setToken({ access_token: settings.driveConfig.accessToken });
          }
      }
  }, [isGapiLoaded, settings.driveConfig.isConnected, settings.driveConfig.accessToken]);

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

             const newConfig = {
                isConnected: true,
                clientId: effectiveClientId,
                accessToken: resp.access_token,
                accountName: `${userName} (${userEmail})`,
                folderId: targetFolderId,
                folderName: driveFolderName
             };

             // Update State
             onUpdateSettings({
                ...settings,
                driveConfig: newConfig
             });

             // Save to LocalStorage for persistence
             localStorage.setItem(STORAGE_KEY, JSON.stringify({
                 config: newConfig,
                 timestamp: Date.now()
             }));

             alert(`Kiểm tra kết nối thành công!\nTrạng thái: Đã kết nối\nTài khoản: ${userEmail}\nThư mục: ${driveFolderName}`);

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
    const confirm = window.confirm("Bạn có chắc muốn ngắt kết nối? Token truy cập sẽ bị xóa và bạn sẽ cần đăng nhập lại.");
    if (confirm) {
        if (settings.driveConfig.accessToken && window.google) {
            window.google.accounts.oauth2.revoke(settings.driveConfig.accessToken, () => {
                console.log('Token revoked');
            });
        }
        
        // Clear Local Storage
        localStorage.removeItem(STORAGE_KEY);

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
      alert("Đã lưu cấu hình! Vui lòng nhấn nút 'Kiểm tra kết nối' để hoàn tất và kích hoạt trạng thái Đã kết nối.");
  };

  // --- SAVE TO DRIVE HANDLER ---
  const handleSaveToDrive = async () => {
    if (!settings.driveConfig.isConnected || !settings.driveConfig.folderId) {
        alert("Chưa kết nối Google Drive. Vui lòng quay lại tab 'Cấu hình Chung' để kết nối.");
        return;
    }

    // Check for token validity
    const tokenObj = window.gapi?.client?.getToken();
    const accessToken = tokenObj?.access_token || settings.driveConfig.accessToken;

    if (!accessToken) {
         alert("Phiên làm việc Google Drive đã hết hạn hoặc chưa được khởi tạo. Vui lòng kết nối lại.");
         handleDisconnectDrive();
         return;
    }

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

    // VERSIONING: Always create a new filename based on timestamp
    const fileName = `unidata_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const fileContent = JSON.stringify(data, null, 2);
    const file = new Blob([fileContent], {type: 'application/json'});
    
    const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [settings.driveConfig.folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    try {
        // Use fetch for multipart upload as gapi client doesn't support it easily for content upload
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form,
        });
        
        if (response.status === 401) {
            alert("Phiên đăng nhập hết hạn. Vui lòng kết nối lại.");
            handleDisconnectDrive();
            return;
        }

        const json = await response.json();
        
        if (json.id) {
            alert(`Đã lưu bản mới lên Google Drive thành công!\nTên file: ${fileName}`);
        } else {
            console.error("Drive Upload Error:", json);
            alert("Lỗi: Không thể lưu file lên Google Drive. Chi tiết trong console.");
        }
    } catch (error) {
        console.error("Upload Request Error:", error);
        alert("Lỗi kết nối mạng khi tải lên Drive.");
    }
  };

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

  const handleSetCurrentYear = (code: string) => {
    onUpdateSettings({ ...settings, currentAcademicYear: code });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Cài đặt Hệ thống</h2>
        <p className="text-slate-600">Quản lý tham số hệ thống, thông tin trường, người dùng và cấu hình AI.</p>
      </div>

      <div className="flex space-x-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          { id: 'backup', label: 'Sao lưu dữ liệu' },
          { id: 'users', label: 'Quản lý User' },
          { id: 'prompts', label: 'AI Prompts' },
          { id: 'general', label: 'Cấu hình Chung' },
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
        {/* TAB: BACKUP */}
        {activeTab === 'backup' && (
          <BackupDataModule 
            settings={settings}
            onExport={handleExport}
            onSaveToDrive={handleSaveToDrive}
            onImportClick={handleImportClick}
            onFileChange={handleFileChange}
            fileInputRef={fileInputRef}
          />
        )}

        {/* TAB: USERS */}
        {activeTab === 'users' && (
          <UserManagementModule 
            users={users}
            onAddUser={onAddUser}
            onRemoveUser={onRemoveUser}
          />
        )}

        {/* TAB: PROMPTS */}
        {activeTab === 'prompts' && (
           <AIPromptModule 
              settings={settings}
              onUpdateSettings={onUpdateSettings}
           />
        )}

        {/* TAB: GENERAL */}
        {activeTab === 'general' && (
          <GeneralConfigModule 
             settings={settings}
             schoolInfo={schoolInfo}
             academicYears={academicYears}
             onUpdateSettings={onUpdateSettings}
             onUpdateSchoolInfo={onUpdateSchoolInfo}
             onAddAcademicYear={onAddAcademicYear}
             onUpdateAcademicYear={onUpdateAcademicYear}
             onDeleteAcademicYear={onDeleteAcademicYear}
             onToggleLockAcademicYear={onToggleLockAcademicYear}
             
             // Drive Props
             manualClientId={manualClientId}
             setManualClientId={setManualClientId}
             driveFolderId={driveFolderId}
             setDriveFolderId={setDriveFolderId}
             driveFolderName={driveFolderName}
             setDriveFolderName={setDriveFolderName}
             envClientId={envClientId}
             effectiveClientId={effectiveClientId}
             onConnectDrive={handleConnectDrive}
             onDisconnectDrive={handleDisconnectDrive}
             onSaveDriveConfigOnly={handleSaveDriveConfigOnly}
             onSetCurrentYear={handleSetCurrentYear}
          />
        )}
      </div>
    </div>
  );
};

export default SettingsModule;