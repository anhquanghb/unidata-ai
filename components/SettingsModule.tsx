import React, { useState, useRef, useEffect } from 'react';
import { SystemSettings, UserProfile, UniversityReport, Unit, AcademicYear, SchoolInfo, ScientificRecord, TrainingRecord, PersonnelRecord, AdmissionRecord, ClassRecord, DepartmentRecord, BusinessRecord, DataConfigGroup, GoogleDriveConfig } from '../types';
import BackupDataModule from './SettingsModules/BackupDataModule';
import UserManagementModule from './SettingsModules/UserManagementModule';
import AIPromptModule from './SettingsModules/AIPromptModule';
import GeneralConfigModule from './SettingsModules/GeneralConfigModule';
import DataConfigModule from './SettingsModules/DataConfigModule';

// Declare globals for Google Scripts
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface SettingsModuleProps {
  settings: SystemSettings;
  driveSession: GoogleDriveConfig; // Separated Session State
  users: UserProfile[];
  reports: UniversityReport[];
  units: Unit[];
  academicYears: AcademicYear[];
  schoolInfo: SchoolInfo;
  
  // Data Records
  scientificRecords: ScientificRecord[];
  trainingRecords: TrainingRecord[];
  personnelRecords: PersonnelRecord[];
  admissionRecords: AdmissionRecord[];
  classRecords: ClassRecord[];
  departmentRecords: DepartmentRecord[];
  businessRecords: BusinessRecord[];
  
  // Data Config
  dataConfigGroups?: DataConfigGroup[];
  onUpdateDataConfigGroups?: (groups: DataConfigGroup[]) => void;

  onUpdateSettings: (settings: SystemSettings) => void;
  onUpdateDriveSession: (session: GoogleDriveConfig) => void; // Handler for Session Updates
  onAddUser: (user: UserProfile) => void;
  onRemoveUser: (id: string) => void;
  onAddAcademicYear: (year: AcademicYear) => void;
  onUpdateAcademicYear: (year: AcademicYear) => void;
  onDeleteAcademicYear: (id: string) => void;
  onToggleLockAcademicYear: (id: string) => void;
  onImportData: (data: any) => void;
  onUpdateSchoolInfo: (info: SchoolInfo) => void;
  onShowVersions?: () => void;
  onResetSystemData: () => void; // New prop for clearing data
}

// Updated SCOPES to include readonly access for restoring backups
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly'; 
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const DEFAULT_FOLDER_NAME = 'UniData_Backups'; // HARDCODED FOLDER NAME

const SettingsModule: React.FC<SettingsModuleProps> = ({ 
  settings, 
  driveSession,
  users, 
  reports, 
  units, 
  academicYears,
  schoolInfo,
  // Records
  scientificRecords,
  trainingRecords,
  personnelRecords,
  admissionRecords,
  classRecords,
  departmentRecords,
  businessRecords,
  // Data Config
  dataConfigGroups = [],
  onUpdateDataConfigGroups,
  // Handlers
  onUpdateSettings,
  onUpdateDriveSession,
  onAddUser,
  onRemoveUser,
  onAddAcademicYear,
  onUpdateAcademicYear,
  onDeleteAcademicYear,
  onToggleLockAcademicYear,
  onImportData,
  onUpdateSchoolInfo,
  onShowVersions,
  onResetSystemData
}) => {
  // Ordered: Backup -> Users -> Prompts -> DataConfig -> General
  const [activeTab, setActiveTab] = useState<'backup' | 'users' | 'prompts' | 'data_config' | 'general'>('backup');

  // Drive State
  // Prioritize Environment Variable
  const envClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  
  // State for manual input (used if Env Var is missing) - Ephemeral
  const [manualClientId, setManualClientId] = useState(driveSession.clientId || '');
  
  // The actual Client ID to use
  const effectiveClientId = envClientId || manualClientId;

  // Local state for Drive (RUNTIME ONLY, NOT SAVED TO SETTINGS/DISK)
  const [driveFolderId, setDriveFolderId] = useState(driveSession.folderId || '');
  const [externalSourceFolderId, setExternalSourceFolderId] = useState(driveSession.externalSourceFolderId || '');

  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync props to local state if changed externally
  useEffect(() => {
      setDriveFolderId(driveSession.folderId);
      setExternalSourceFolderId(driveSession.externalSourceFolderId || '');
  }, [driveSession]);

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

  // --- AUTHENTICATION CORE FUNCTION ---
  const authenticateDrive = (clientId: string, promptType: string) => {
    if (!window.google || !window.gapi) {
        console.warn("Google libraries not loaded yet.");
        return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (resp: any) => {
            if (resp.error) {
                if (promptType === '' && (resp.error === 'immediate_failed' || resp.error === 'access_denied')) {
                    console.log("Silent refresh failed or access denied. Clearing session.");
                    // Update session state to disconnected
                    onUpdateDriveSession({
                        ...driveSession,
                        isConnected: false,
                        accessToken: undefined
                    });
                } else {
                    alert("Lỗi đăng nhập Google Drive: " + resp.error);
                }
                return;
            }

            if (resp.access_token) {
                try {
                    // Ensure access token is set for GAPI calls
                    window.gapi.client.setToken(resp);
                    
                    const userInfo = await window.gapi.client.drive.about.get({
                       fields: "user, storageQuota"
                    });

                    const userEmail = userInfo.result.user.emailAddress;
                    const userName = userInfo.result.user.displayName;

                    // --- SCAN ONLY LOGIC ---
                    let targetFolderId = '';
                    let dataFolderId = '';

                    // 1. Search for Root Backup Folder (UniData_Backups)
                    try {
                        const q = `mimeType='application/vnd.google-apps.folder' and name='${DEFAULT_FOLDER_NAME}' and trashed=false`;
                        const folderResp = await window.gapi.client.drive.files.list({
                            q: q,
                            fields: 'files(id, name)',
                            spaces: 'drive',
                        });
                        
                        if (folderResp.result.files && folderResp.result.files.length > 0) {
                            targetFolderId = folderResp.result.files[0].id;
                            console.log("Found existing folder:", targetFolderId);

                            // 2. If Found, Search for 'Data' Sub-folder
                            const qData = `mimeType='application/vnd.google-apps.folder' and name='Data' and '${targetFolderId}' in parents and trashed=false`;
                            const dataFolderResp = await window.gapi.client.drive.files.list({
                                q: qData,
                                fields: 'files(id, name)',
                                spaces: 'drive',
                            });

                            if (dataFolderResp.result.files && dataFolderResp.result.files.length > 0) {
                                dataFolderId = dataFolderResp.result.files[0].id;
                            }
                        }
                        // If not found, targetFolderId remains empty string
                    } catch (err) {
                        console.error("Folder scan error:", err);
                        alert("Lỗi khi quét thư mục trên Drive.");
                    }

                    // Update local state UI
                    setDriveFolderId(targetFolderId);

                    const newSession: GoogleDriveConfig = {
                       isConnected: true,
                       clientId: clientId,
                       accessToken: resp.access_token,
                       accountName: `${userName} (${userEmail})`,
                       folderId: targetFolderId, // Can be empty if not found
                       folderName: DEFAULT_FOLDER_NAME,
                       dataFolderId: dataFolderId, 
                       externalSourceFolderId: externalSourceFolderId
                    };

                    // Update Global Session State
                    onUpdateDriveSession(newSession);

                    if (promptType.includes('select_account')) {
                        if (targetFolderId) {
                            alert(`Kết nối thành công!\nĐã tìm thấy thư mục: ${DEFAULT_FOLDER_NAME}`);
                        } else {
                            // No alert here, UI will show "Create Folder" button
                        }
                    }

                } catch (err: any) {
                    console.error("Auth Processing Error", err);
                    if (promptType !== '') alert("Lỗi khi xử lý thông tin tài khoản.");
                }
            }
        },
    });

    // Request token
    tokenClient.requestAccessToken({ prompt: promptType });
  };

  // --- MANUAL CREATE FOLDER HANDLER ---
  const handleCreateDefaultFolders = async () => {
      if (!driveSession.isConnected) return;
      setIsCreatingFolder(true);
      try {
          // 1. Create Root Folder
          const fileMetadata = {
              name: DEFAULT_FOLDER_NAME,
              mimeType: 'application/vnd.google-apps.folder'
          };
          const createResp = await window.gapi.client.drive.files.create({
              resource: fileMetadata,
              fields: 'id'
          });
          const newFolderId = createResp.result.id;

          // 2. Create Data Subfolder
          const dataFolderMetadata = {
              name: 'Data',
              mimeType: 'application/vnd.google-apps.folder',
              parents: [newFolderId]
          };
          const createDataResp = await window.gapi.client.drive.files.create({
              resource: dataFolderMetadata,
              fields: 'id'
          });
          const newDataFolderId = createDataResp.result.id;

          // 3. Update State
          setDriveFolderId(newFolderId);
          onUpdateDriveSession({
              ...driveSession,
              folderId: newFolderId,
              dataFolderId: newDataFolderId,
              folderName: DEFAULT_FOLDER_NAME
          });
          alert(`Đã khởi tạo thành công thư mục: ${DEFAULT_FOLDER_NAME}`);

      } catch (e: any) {
          console.error("Create folder error", e);
          alert("Lỗi khi tạo thư mục: " + e.message);
      } finally {
          setIsCreatingFolder(false);
      }
  };

  // --- USER HANDLER ---
  const handleConnectDrive = () => {
    if (!effectiveClientId) {
        alert("Vui lòng nhập Google Client ID.");
        return;
    }
    // FORCE 'select_account' to prevent auto-login to the previous account
    authenticateDrive(effectiveClientId, 'select_account consent');
  };

  const handleDisconnectDrive = () => {
    const confirm = window.confirm("Bạn có chắc muốn ngắt kết nối?\nHệ thống sẽ xóa toàn bộ dữ liệu đang lưu cục bộ để đảm bảo an toàn.");
    if (confirm) {
        // 1. Revoke Consent
        if (driveSession.accessToken && window.google) {
            try {
                window.google.accounts.oauth2.revoke(driveSession.accessToken, () => {
                    console.log('Token revoked');
                });
            } catch (e) {
                console.warn("Revoke failed (token might be invalid already)");
            }
        }
        
        // 2. Clear GAPI client cache completely
        if (window.gapi && window.gapi.client) {
            window.gapi.client.setToken(null);
        }

        // 3. Clear Local Storage to prevent sticky sessions
        localStorage.clear();
        sessionStorage.clear();

        // 4. Clear all application data and disconnect via App prop
        onResetSystemData();

        // 5. Reset local state
        setDriveFolderId('');
        setExternalSourceFolderId('');
        
        // Optional: Reload page to force fresh environment, but state reset should be enough
        // window.location.reload(); 
    }
  };

  const handleSaveDriveConfigOnly = () => {
      // Just saves Client ID and External Source ID to session state (runtime)
      onUpdateDriveSession({
          ...driveSession,
          clientId: manualClientId,
          externalSourceFolderId: externalSourceFolderId 
      });
      alert("Đã cập nhật cấu hình phiên làm việc!");
  };

  // --- SAVE TO DRIVE HANDLER ---
  const handleSaveToDrive = async () => {
    if (!driveSession.isConnected || !driveSession.folderId) {
        alert("Chưa kết nối Google Drive hoặc chưa có thư mục lưu trữ.");
        return;
    }

    // Double check token validity before upload
    const tokenObj = window.gapi?.client?.getToken();
    if (!tokenObj) {
         alert("Phiên làm việc lỗi. Đang thử làm mới...");
         handleConnectDrive(); // Re-trigger auth
         return;
    }

    // Prepare COMPLETE system data
    // Note: driveSession is NOT included in the saved 'settings' object here
    // because it is separate state in App.tsx now.
    const data = {
      // Core
      reports,
      units,
      users,
      settings, 
      academicYears,
      schoolInfo,
      // Records
      scientificRecords,
      trainingRecords,
      personnelRecords,
      admissionRecords,
      classRecords,
      departmentRecords,
      businessRecords,
      // Data Config
      dataConfigGroups,
      // Metadata
      backupDate: new Date().toISOString(),
      version: "1.4"
    };

    const fileName = `unidata_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const fileContent = JSON.stringify(data, null, 2);
    const file = new Blob([fileContent], {type: 'application/json'});
    
    const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [driveSession.folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    try {
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + tokenObj.access_token }),
            body: form,
        });
        
        if (response.status === 401) {
            // Token expired during upload
            console.log("401 Unauthorized during upload. Refreshing...");
            authenticateDrive(effectiveClientId, ''); // Try silent refresh
            alert("Phiên đăng nhập hết hạn. Hệ thống đang thử kết nối lại. Vui lòng thử lại sau giây lát.");
            return;
        }

        const json = await response.json();
        
        if (json.id) {
            alert(`Đã lưu bản mới lên Google Drive thành công!\nTên file: ${fileName}`);
        } else {
            console.error("Drive Upload Error:", json);
            alert("Lỗi: Không thể lưu file lên Google Drive.");
        }
    } catch (error) {
        console.error("Upload Request Error:", error);
        alert("Lỗi kết nối mạng khi tải lên Drive.");
    }
  };

  const handleExport = () => {
    // Prepare COMPLETE system data
    const data = {
      // Core
      reports,
      units,
      users,
      settings,
      academicYears,
      schoolInfo,
      // Records
      scientificRecords,
      trainingRecords,
      personnelRecords,
      admissionRecords,
      classRecords,
      departmentRecords,
      businessRecords,
      // Data Config
      dataConfigGroups,
      // Metadata
      backupDate: new Date().toISOString(),
      version: "1.4"
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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Cài đặt Hệ thống</h2>
        <p className="text-slate-600">Quản lý tham số hệ thống, thông tin trường, người dùng, AI và cấu hình dữ liệu.</p>
      </div>

      <div className="flex space-x-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit overflow-x-auto">
        {[
          { id: 'backup', label: 'Dữ liệu & Backup' },
          { id: 'users', label: 'Quản lý User' },
          { id: 'prompts', label: 'AI Prompts' },
          { id: 'data_config', label: 'Cấu hình Dữ liệu' },
          { id: 'general', label: 'Cấu hình Chung' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-all ${
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
            driveSession={driveSession}
            onExport={handleExport}
            onSaveToDrive={handleSaveToDrive}
            onImportClick={handleImportClick}
            onFileChange={handleFileChange}
            fileInputRef={fileInputRef}
            onShowVersions={onShowVersions}
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

         {/* TAB: DATA CONFIG */}
         {activeTab === 'data_config' && onUpdateDataConfigGroups && (
           <DataConfigModule 
              groups={dataConfigGroups}
              onUpdateGroups={onUpdateDataConfigGroups}
           />
        )}

        {/* TAB: GENERAL */}
        {activeTab === 'general' && (
          <GeneralConfigModule 
             settings={settings}
             driveSession={driveSession}
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
             driveFolderId={driveFolderId} // Runtime ID
             setDriveFolderId={setDriveFolderId}
             
             // New Props for Creating Folder
             onCreateDefaultFolders={handleCreateDefaultFolders}
             isCreatingFolder={isCreatingFolder}
             
             // External Read-Only Source Prop
             externalSourceFolderId={externalSourceFolderId}
             setExternalSourceFolderId={setExternalSourceFolderId}

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