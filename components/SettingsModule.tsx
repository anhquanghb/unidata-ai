import React, { useState, useRef, useEffect } from 'react';
import { SystemSettings, UserProfile, Unit, AcademicYear, SchoolInfo, ScientificRecord, TrainingRecord, PersonnelRecord, AdmissionRecord, ClassRecord, DepartmentRecord, BusinessRecord, DataConfigGroup, GoogleDriveConfig, Faculty, FacultyTitles, HumanResourceRecord, DynamicRecord } from '../types';
import BackupDataModule from './SettingsModules/BackupDataModule';
import UserManagementModule from './SettingsModules/UserManagementModule';
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
  units: Unit[];
  academicYears: AcademicYear[];
  schoolInfo: SchoolInfo;
  
  // Faculty Module Data
  faculties: Faculty[];
  facultyTitles: FacultyTitles;
  humanResources: HumanResourceRecord[];

  // Data Records (Legacy/Static)
  scientificRecords: ScientificRecord[];
  trainingRecords: TrainingRecord[];
  personnelRecords: PersonnelRecord[];
  admissionRecords: AdmissionRecord[];
  classRecords: ClassRecord[];
  departmentRecords: DepartmentRecord[];
  businessRecords: BusinessRecord[];
  
  // Dynamic Data (Information Management Module)
  dataConfigGroups?: DataConfigGroup[];
  dynamicDataStore?: Record<string, DynamicRecord[]>; // ADDED THIS
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
const STORAGE_KEY = 'UNIDATA_DRIVE_SESSION';
const TOKEN_EXPIRY_MS = 3500 * 1000; // ~58 minutes safety buffer

const SettingsModule: React.FC<SettingsModuleProps> = ({ 
  settings, 
  driveSession,
  users, 
  units, 
  academicYears,
  schoolInfo,
  // Faculty Data
  faculties,
  facultyTitles,
  humanResources,
  // Records
  scientificRecords,
  trainingRecords,
  personnelRecords,
  admissionRecords,
  classRecords,
  departmentRecords,
  businessRecords,
  // Dynamic Data
  dataConfigGroups = [],
  dynamicDataStore = {}, // Default empty
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
  // Ordered: Backup -> Users -> DataConfig -> General
  const [activeTab, setActiveTab] = useState<'backup' | 'users' | 'data_config' | 'general'>('backup');

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

  // UI States for Scanning
  const [scanStatus, setScanStatus] = useState<{
      foundFolder: boolean;
      foundDataFolder: boolean;
      foundConfig: boolean;
      backupCount: number;
  }>({ foundFolder: false, foundDataFolder: false, foundConfig: false, backupCount: 0 });

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

  // --- REUSABLE SCAN LOGIC ---
  const performDriveScan = async (accessToken: string, clientId: string) => {
      try {
          // Set token for GAPI calls
          window.gapi.client.setToken({ access_token: accessToken });
          
          const userInfo = await window.gapi.client.drive.about.get({
             fields: "user, storageQuota"
          });

          const userEmail = userInfo.result.user.emailAddress;
          const userName = userInfo.result.user.displayName;

          // --- STRICT SCAN LOGIC ---
          let targetFolderId = '';
          let dataFolderId = '';
          let foundConfig = false;
          let backupCount = 0;

          // 1. Search for Root Backup Folder (UniData_Backups) OWNED BY ME
          // STRICT QUERY: Must be owned by 'me'
          const q = `mimeType='application/vnd.google-apps.folder' and name='${DEFAULT_FOLDER_NAME}' and trashed=false and 'me' in owners`;
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

              // 3. Search for Configuration File (external.txt)
              const qConfig = `name = 'external.txt' and '${targetFolderId}' in parents and trashed=false`;
              const configResp = await window.gapi.client.drive.files.list({
                  q: qConfig,
                  fields: 'files(id, name)',
              });
              if (configResp.result.files && configResp.result.files.length > 0) {
                  foundConfig = true;
              }

              // 4. Count Backups (JSON files)
              const qBackups = `mimeType = 'application/json' and '${targetFolderId}' in parents and trashed=false and name != 'external.txt'`;
              const backupResp = await window.gapi.client.drive.files.list({
                  q: qBackups,
                  pageSize: 100, // Limit check
                  fields: 'files(id)',
              });
              backupCount = backupResp.result.files ? backupResp.result.files.length : 0;
          }

          // Update local state UI
          setDriveFolderId(targetFolderId);
          setScanStatus({
              foundFolder: !!targetFolderId,
              foundDataFolder: !!dataFolderId,
              foundConfig: foundConfig,
              backupCount: backupCount
          });

          const newSession: GoogleDriveConfig = {
             isConnected: true,
             clientId: clientId,
             accessToken: accessToken,
             accountName: `${userName} (${userEmail})`,
             folderId: targetFolderId, 
             folderName: DEFAULT_FOLDER_NAME,
             dataFolderId: dataFolderId, 
             externalSourceFolderId: externalSourceFolderId,
             lastSync: new Date().toISOString()
          };

          // Update Global Session State
          onUpdateDriveSession(newSession);

          // Persist session to LocalStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
              config: newSession,
              timestamp: Date.now()
          }));

          return true; // Success
      } catch (err: any) {
          console.error("Drive Scan Error", err);
          return false; // Failed
      }
  };

  // --- AUTHENTICATION CORE FUNCTION ---
  const authenticateDrive = async (clientId: string, promptType: string) => {
    if (!window.google || !window.gapi) {
        console.warn("Google libraries not loaded yet.");
        return;
    }

    // Optimization: If we have a token and aren't forcing a prompt, try to reuse it directly
    if (driveSession.isConnected && driveSession.accessToken && promptType === '') {
        console.log("Checking existing Drive session...");
        const success = await performDriveScan(driveSession.accessToken, clientId);
        if (success) return; // Valid token, no need to popup
        console.log("Existing token invalid or scan failed. Refreshing...");
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (resp: any) => {
            if (resp.error) {
                if (promptType === '' && (resp.error === 'immediate_failed' || resp.error === 'access_denied')) {
                    console.log("Silent refresh failed or access denied. Clearing session.");
                    onUpdateDriveSession({
                        ...driveSession,
                        isConnected: false,
                        accessToken: undefined
                    });
                    localStorage.removeItem(STORAGE_KEY);
                } else {
                    alert("Lỗi đăng nhập Google Drive: " + resp.error);
                }
                return;
            }

            if (resp.access_token) {
                try {
                    await performDriveScan(resp.access_token, clientId);
                    if (promptType.includes('select_account')) {
                       // Optional: success feedback
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

  // --- SILENT HYDRATION ON LOAD ---
  useEffect(() => {
    if (!isGisLoaded || !isGapiLoaded) return;
    
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        const now = Date.now();
        const isExpired = (now - parsed.timestamp) >= TOKEN_EXPIRY_MS;

        if (!isExpired && parsed.config?.accessToken) {
          // TOKEN VALID: Load immediately
          console.log("Restoring valid Drive session...");
          window.gapi.client.setToken({ access_token: parsed.config.accessToken });
          onUpdateDriveSession(parsed.config); 
          
          // Trigger background scan to update UI status (found/not found)
          authenticateDrive(parsed.config.clientId || effectiveClientId, ''); 
        } else if (parsed.config?.clientId) {
          // TOKEN EXPIRED: Try silent refresh
          console.log("Session expired, attempting silent refresh...");
          authenticateDrive(parsed.config.clientId, '');
        }
      } catch (e) {
        console.error("Session restoration error:", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [isGisLoaded, isGapiLoaded]);

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
          setScanStatus({
              foundFolder: true,
              foundDataFolder: true,
              foundConfig: false,
              backupCount: 0
          });

          const updatedSession = {
              ...driveSession,
              folderId: newFolderId,
              dataFolderId: newDataFolderId,
              folderName: DEFAULT_FOLDER_NAME
          };

          onUpdateDriveSession(updatedSession);
          
          // Update Persistence
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
              config: updatedSession,
              timestamp: Date.now()
          }));

          alert(`Đã khởi tạo thành công:\n- Thư mục gốc: ${DEFAULT_FOLDER_NAME}\n- Thư mục con: Data`);

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
        // 1. Revoke Consent (Token revocation)
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

        // 3. Clear Local Storage
        localStorage.clear(); // Clears STORAGE_KEY and everything else
        sessionStorage.clear();

        // 4. Reset local state immediately
        setDriveFolderId('');
        setExternalSourceFolderId('');
        setScanStatus({ foundFolder: false, foundDataFolder: false, foundConfig: false, backupCount: 0 });

        // 5. Reset Drive Session State explicitly to clear IDs
        onUpdateDriveSession({
            isConnected: false,
            clientId: effectiveClientId, 
            accessToken: undefined,
            accountName: undefined,
            folderId: '',
            folderName: DEFAULT_FOLDER_NAME,
            dataFolderId: '',
            externalSourceFolderId: ''
        });

        // 6. Clear all application data
        onResetSystemData();
        
        alert("Đã ngắt kết nối và xóa sạch phiên làm việc.");
    }
  };

  const handleSaveDriveConfigOnly = () => {
      // Just saves Client ID and External Source ID to session state (runtime)
      const updated = {
          ...driveSession,
          clientId: manualClientId,
          externalSourceFolderId: externalSourceFolderId 
      };
      onUpdateDriveSession(updated);
      
      // Update storage if connected
      if (driveSession.isConnected) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
              config: updated,
              timestamp: Date.now()
          }));
      }
      alert("Đã cập nhật cấu hình phiên làm việc!");
  };

  // --- SAVE TO DRIVE HANDLER ---
  const handleSaveToDrive = async () => {
    if (!driveSession.isConnected || !driveSession.folderId) {
        alert("Chưa kết nối Google Drive hoặc chưa có thư mục lưu trữ.");
        return;
    }

    // Restore token to GAPI if lost but exists in session
    if (!window.gapi?.client?.getToken() && driveSession.accessToken) {
        window.gapi.client.setToken({ access_token: driveSession.accessToken });
    }

    // Double check token validity before upload
    const tokenObj = window.gapi?.client?.getToken();
    if (!tokenObj) {
         // If still no token, assume session invalid
         alert("Phiên làm việc lỗi. Đang thử làm mới...");
         handleConnectDrive(); // Re-trigger auth
         return;
    }

    // SANITIZE SETTINGS: Remove driveConfig or any sensitive runtime keys
    // We create a clean settings object that does NOT include drive state
    const { driveConfig: _ignored, ...safeSettings } = (settings as any);

    const data = {
      units,
      users,
      settings: safeSettings, // Use cleaned settings
      academicYears,
      schoolInfo,
      // Faculty Data
      faculties,
      facultyTitles,
      humanResources,
      // Records
      scientificRecords,
      trainingRecords,
      personnelRecords,
      admissionRecords,
      classRecords,
      departmentRecords,
      businessRecords,
      // Dynamic Data Config & STORE
      dataConfigGroups,
      dynamicDataStore,
      backupDate: new Date().toISOString(),
      version: "2.0.0"
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
            console.log("401 Unauthorized during upload. Refreshing...");
            authenticateDrive(effectiveClientId, ''); // Try silent refresh
            alert("Phiên đăng nhập hết hạn. Hệ thống đang thử kết nối lại. Vui lòng thử lại sau giây lát.");
            return;
        }

        const json = await response.json();
        
        if (json.id) {
            alert(`Đã lưu bản mới lên Google Drive thành công!\nTên file: ${fileName}`);
            // Re-scan to update count
            authenticateDrive(effectiveClientId, '');
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
    // SANITIZE SETTINGS: Remove driveConfig
    const { driveConfig: _ignored, ...safeSettings } = (settings as any);

    const data = {
      units,
      users,
      settings: safeSettings, // Use cleaned settings
      academicYears,
      schoolInfo,
      // Faculty Data
      faculties,
      facultyTitles,
      humanResources,
      // Records
      scientificRecords,
      trainingRecords,
      personnelRecords,
      admissionRecords,
      classRecords,
      departmentRecords,
      businessRecords,
      // Dynamic Data
      dataConfigGroups,
      dynamicDataStore,
      backupDate: new Date().toISOString(),
      version: "2.0.0"
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
            // alert("Nhập dữ liệu thành công!"); // Let the parent handle success message to avoid duplicate alerts if migration happens
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
        <p className="text-slate-600">Quản lý tham số hệ thống, thông tin trường, người dùng và cấu hình dữ liệu.</p>
      </div>

      <div className="flex space-x-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit overflow-x-auto">
        {[
          { id: 'backup', label: 'Dữ liệu & Backup' },
          { id: 'users', label: 'Quản lý User' },
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
             scanStatus={scanStatus}
             
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