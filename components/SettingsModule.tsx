import React, { useState, useRef, useEffect } from 'react';
import { SystemSettings, UserProfile, UniversityReport, Unit, AcademicYear, SchoolInfo, ScientificRecord, TrainingRecord, PersonnelRecord, AdmissionRecord, ClassRecord, DepartmentRecord, BusinessRecord, DataConfigGroup } from '../types';
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
  onAddUser: (user: UserProfile) => void;
  onRemoveUser: (id: string) => void;
  onAddAcademicYear: (year: AcademicYear) => void;
  onUpdateAcademicYear: (year: AcademicYear) => void;
  onDeleteAcademicYear: (id: string) => void;
  onToggleLockAcademicYear: (id: string) => void;
  onImportData: (data: any) => void;
  onUpdateSchoolInfo: (info: SchoolInfo) => void;
  onShowVersions?: () => void;
}

// Updated SCOPES to include readonly access for restoring backups
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly'; 
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const STORAGE_KEY = 'UNIDATA_DRIVE_SESSION'; // Key for localStorage
const TOKEN_EXPIRY_MS = 50 * 60 * 1000; // 50 minutes safety threshold

const SettingsModule: React.FC<SettingsModuleProps> = ({ 
  settings, 
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
  onAddUser,
  onRemoveUser,
  onAddAcademicYear,
  onUpdateAcademicYear,
  onDeleteAcademicYear,
  onToggleLockAcademicYear,
  onImportData,
  onUpdateSchoolInfo,
  onShowVersions
}) => {
  // Ordered: Backup -> Users -> Prompts -> DataConfig -> General
  const [activeTab, setActiveTab] = useState<'backup' | 'users' | 'prompts' | 'data_config' | 'general'>('backup');

  // Drive State
  // Prioritize Environment Variable
  const envClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  
  // State for manual input (used if Env Var is missing)
  const [manualClientId, setManualClientId] = useState(settings.driveConfig?.clientId || '');
  
  // The actual Client ID to use
  const effectiveClientId = envClientId || manualClientId;

  const [driveFolderId, setDriveFolderId] = useState(settings.driveConfig?.folderId || '');
  const [driveFolderName, setDriveFolderName] = useState(settings.driveConfig?.folderName || 'UniData_Backups');
  // State for the Read-Only Source Folder
  const [externalSourceFolderId, setExternalSourceFolderId] = useState(settings.driveConfig?.externalSourceFolderId || '');

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

  // --- AUTHENTICATION CORE FUNCTION ---
  const authenticateDrive = (clientId: string, promptType: string, savedConfig?: any) => {
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
                    localStorage.removeItem(STORAGE_KEY);
                    // Update state to disconnected
                    onUpdateSettings({
                        ...settings,
                        driveConfig: {
                            ...settings.driveConfig,
                            isConnected: false,
                            accessToken: undefined
                        }
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

                    // --- FOLDER LOGIC ---
                    // If we have saved config, prefer using that ID/Name to avoid duplicate lookups/creates
                    let targetFolderId = savedConfig?.folderId || driveFolderId;
                    let targetFolderName = savedConfig?.folderName || driveFolderName;

                    if (!targetFolderId) {
                         // Search or Create Root Backup Folder
                         try {
                             const q = `mimeType='application/vnd.google-apps.folder' and name='${targetFolderName}' and trashed=false`;
                             const folderResp = await window.gapi.client.drive.files.list({
                                 q: q,
                                 fields: 'files(id, name)',
                                 spaces: 'drive',
                             });
                             
                             if (folderResp.result.files && folderResp.result.files.length > 0) {
                                 targetFolderId = folderResp.result.files[0].id;
                             } else {
                                 const fileMetadata = {
                                     name: targetFolderName,
                                     mimeType: 'application/vnd.google-apps.folder'
                                 };
                                 const createResp = await window.gapi.client.drive.files.create({
                                     resource: fileMetadata,
                                     fields: 'id'
                                 });
                                 targetFolderId = createResp.result.id;
                             }
                         } catch (err) {
                             console.error("Folder error:", err);
                             if (promptType !== '') alert("Cảnh báo: Không thể quản lý thư mục backup.");
                         }
                    }

                    // --- DATA SUB-FOLDER LOGIC (New Feature) ---
                    let dataFolderId = savedConfig?.dataFolderId;
                    if (targetFolderId) {
                         try {
                             const qData = `mimeType='application/vnd.google-apps.folder' and name='Data' and '${targetFolderId}' in parents and trashed=false`;
                             const dataFolderResp = await window.gapi.client.drive.files.list({
                                 q: qData,
                                 fields: 'files(id, name)',
                                 spaces: 'drive',
                             });

                             if (dataFolderResp.result.files && dataFolderResp.result.files.length > 0) {
                                 dataFolderId = dataFolderResp.result.files[0].id;
                             } else {
                                 // Create 'Data' subfolder
                                 const dataFolderMetadata = {
                                     name: 'Data',
                                     mimeType: 'application/vnd.google-apps.folder',
                                     parents: [targetFolderId]
                                 };
                                 const createDataResp = await window.gapi.client.drive.files.create({
                                     resource: dataFolderMetadata,
                                     fields: 'id'
                                 });
                                 dataFolderId = createDataResp.result.id;
                             }
                         } catch (err) {
                             console.error("Data Sub-folder error:", err);
                         }
                    }

                    // Update local state
                    setDriveFolderId(targetFolderId);
                    setDriveFolderName(targetFolderName);
                    // Use existing external ID if available, don't overwrite with empty unless intentional
                    const finalExternalId = savedConfig?.externalSourceFolderId || externalSourceFolderId;
                    setExternalSourceFolderId(finalExternalId);

                    const newConfig = {
                       isConnected: true,
                       clientId: clientId,
                       accessToken: resp.access_token,
                       accountName: `${userName} (${userEmail})`,
                       folderId: targetFolderId,
                       folderName: targetFolderName,
                       dataFolderId: dataFolderId, // Store subfolder ID
                       externalSourceFolderId: finalExternalId // Store read-only source ID
                    };

                    // Update Global Settings
                    onUpdateSettings({
                       ...settings,
                       driveConfig: newConfig
                    });

                    // Save to LocalStorage
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({
                        config: newConfig,
                        timestamp: Date.now()
                    }));

                    if (promptType === 'consent') {
                        alert(`Kết nối thành công!\nTài khoản: ${userEmail}\nThư mục Upload: ${targetFolderName}/Data`);
                    }

                } catch (err: any) {
                    console.error("Auth Processing Error", err);
                    if (promptType !== '') alert("Lỗi khi xử lý thông tin tài khoản.");
                }
            }
        },
    });

    // Request token
    // prompt: '' -> Silent refresh
    // prompt: 'consent' -> Force account selection
    tokenClient.requestAccessToken({ prompt: promptType });
  };


  // --- RESTORE SESSION & AUTO REFRESH ---
  useEffect(() => {
    if (!isGisLoaded || !isGapiLoaded) return;
    
    // Check local storage
    const savedSession = localStorage.getItem(STORAGE_KEY);
    
    if (savedSession) {
        try {
            const parsed = JSON.parse(savedSession);
            const savedConfig = parsed.config;
            const clientId = envClientId || savedConfig.clientId;

            if (!clientId) return;

            // Sync manual ID state if needed
            if (!envClientId && savedConfig.clientId !== manualClientId) {
                setManualClientId(savedConfig.clientId);
            }

            const now = Date.now();
            const isExpired = (now - parsed.timestamp) >= TOKEN_EXPIRY_MS;

            if (!isExpired) {
                // Token is still valid (fresh enough) -> Restore immediately
                // This gives the "Instant Connected" experience
                onUpdateSettings({ ...settings, driveConfig: savedConfig });
                setDriveFolderId(savedConfig.folderId);
                setDriveFolderName(savedConfig.folderName);
                if (savedConfig.externalSourceFolderId) setExternalSourceFolderId(savedConfig.externalSourceFolderId);
                
                // Ensure GAPI has the token
                if (window.gapi.client) {
                    window.gapi.client.setToken({ access_token: savedConfig.accessToken });
                }
            } else {
                // Token Expired -> Silent Refresh
                // "Khi Token hết hạn: Hệ thống gọi requestAccessToken({ prompt: '' })"
                console.log("Session expired. Attempting silent refresh...");
                authenticateDrive(clientId, '', savedConfig);
            }
        } catch (e) {
            console.error("Error restoring session:", e);
            localStorage.removeItem(STORAGE_KEY);
        }
    }
  }, [isGisLoaded, isGapiLoaded]); // Run once when libs are ready

  // --- USER HANDLER ---
  const handleConnectDrive = () => {
    if (!effectiveClientId) {
        alert("Vui lòng nhập Google Client ID.");
        return;
    }
    // "Lần đầu: Gọi requestAccessToken({ prompt: 'consent' })"
    // "Xác thực lại: Gọi requestAccessToken({ prompt: 'consent' })"
    authenticateDrive(effectiveClientId, 'consent');
  };

  const handleDisconnectDrive = () => {
    const confirm = window.confirm("Bạn có chắc muốn ngắt kết nối? Token truy cập sẽ bị xóa.");
    if (confirm) {
        if (settings.driveConfig.accessToken && window.google) {
            window.google.accounts.oauth2.revoke(settings.driveConfig.accessToken, () => {
                console.log('Token revoked');
            });
        }
        
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
        setExternalSourceFolderId('');
    }
  };

  const handleSaveDriveConfigOnly = () => {
      onUpdateSettings({
          ...settings,
          driveConfig: {
              ...settings.driveConfig,
              clientId: manualClientId,
              folderId: driveFolderId,
              folderName: driveFolderName,
              externalSourceFolderId: externalSourceFolderId // Persist the new field
          }
      });
      alert("Đã lưu cấu hình! Vui lòng nhấn nút 'Kiểm tra kết nối' để hoàn tất.");
  };

  // --- SAVE TO DRIVE HANDLER ---
  const handleSaveToDrive = async () => {
    if (!settings.driveConfig.isConnected || !settings.driveConfig.folderId) {
        alert("Chưa kết nối Google Drive.");
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
      version: "1.2"
    };

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
            settings={settings}
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