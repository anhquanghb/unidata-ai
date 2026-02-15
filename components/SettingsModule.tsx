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

// --- FOLDER STRUCTURE CONSTANTS ---
const ROOT_FOLDER_NAME = 'UniData_Store'; // Level 0
const ZONE_A_NAME = 'UniData_Private';    // Level 1: Owner Only
const ZONE_B_NAME = 'UniData_System';     // Level 1: Limited Share (System Data)
const ZONE_C_NAME = 'UniData_Public';     // Level 1: Public Read-only

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
  const [driveFolderId, setDriveFolderId] = useState(driveSession.rootFolderId || '');
  const [externalSourceFolderId, setExternalSourceFolderId] = useState(driveSession.externalSourceFolderId || '');

  // UI States for Scanning
  const [scanStatus, setScanStatus] = useState<{
      foundFolder: boolean;      // Found UniData_Store
      foundZoneA: boolean;       // Found UniData_Private
      foundZoneB: boolean;       // Found UniData_System
      foundZoneC: boolean;       // Found UniData_Public
      backupCount: number;
  }>({ foundFolder: false, foundZoneA: false, foundZoneB: false, foundZoneC: false, backupCount: 0 });

  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUpdatingRegistry, setIsUpdatingRegistry] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPermission = settings.permissionProfile || { role: 'school_admin', canEditDataConfig: true, canEditOrgStructure: true };

  // Sync props to local state if changed externally
  useEffect(() => {
      setDriveFolderId(driveSession.rootFolderId);
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
          let rootId = '';
          let zoneA = '';
          let zoneB = ''; // UniData_System (Default for System Data)
          let zoneC = '';
          let backupCount = 0;

          // 1. Search for Root Folder (UniData_Store) OWNED BY ME
          const q = `mimeType='application/vnd.google-apps.folder' and name='${ROOT_FOLDER_NAME}' and trashed=false and 'me' in owners`;
          const folderResp = await window.gapi.client.drive.files.list({
              q: q,
              fields: 'files(id, name)',
              spaces: 'drive',
          });
          
          if (folderResp.result.files && folderResp.result.files.length > 0) {
              rootId = folderResp.result.files[0].id;
              
              // 2. If Root Found, Search for Zones inside it
              const qZones = `mimeType='application/vnd.google-apps.folder' and '${rootId}' in parents and trashed=false`;
              const zonesResp = await window.gapi.client.drive.files.list({
                  q: qZones,
                  fields: 'files(id, name)',
                  spaces: 'drive',
              });

              if (zonesResp.result.files) {
                  zonesResp.result.files.forEach((file: any) => {
                      if (file.name === ZONE_A_NAME) zoneA = file.id;
                      if (file.name === ZONE_B_NAME) zoneB = file.id;
                      if (file.name === ZONE_C_NAME) zoneC = file.id;
                  });
              }

              // 3. Count Backups (JSON files) inside Zone B (System)
              if (zoneB) {
                  const qBackups = `mimeType = 'application/json' and '${zoneB}' in parents and trashed=false and name != 'external.txt'`;
                  const backupResp = await window.gapi.client.drive.files.list({
                      q: qBackups,
                      pageSize: 100,
                      fields: 'files(id)',
                  });
                  backupCount = backupResp.result.files ? backupResp.result.files.length : 0;
              }
          }

          // Update local state UI
          setDriveFolderId(rootId);
          setScanStatus({
              foundFolder: !!rootId,
              foundZoneA: !!zoneA,
              foundZoneB: !!zoneB,
              foundZoneC: !!zoneC,
              backupCount: backupCount
          });

          // **AUTO-UPDATE SCHOOL PUBLIC DRIVE ID**
          if (zoneC && schoolInfo.publicDriveId !== zoneC) {
              onUpdateSchoolInfo({ ...schoolInfo, publicDriveId: zoneC });
          }

          const newSession: GoogleDriveConfig = {
             isConnected: true,
             clientId: clientId,
             accessToken: accessToken,
             accountName: `${userName} (${userEmail})`,
             
             // Structure IDs
             rootFolderId: rootId,
             zoneAId: zoneA,
             zoneBId: zoneB,
             zoneCId: zoneC,

             // Legacy Support (Map 'folderId' to Zone B for system ops)
             folderId: zoneB || rootId, 
             folderName: ZONE_B_NAME,
             dataFolderId: zoneB, // Store data directly in Zone B or subfolder (simplified for now)
             
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
    // ... (Same as before)
    if (!window.google || !window.gapi) {
        console.warn("Google libraries not loaded yet.");
        return;
    }

    if (driveSession.isConnected && driveSession.accessToken && promptType === '') {
        const success = await performDriveScan(driveSession.accessToken, clientId);
        if (success) return; 
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (resp: any) => {
            if (resp.error) {
                if (promptType === '' && (resp.error === 'immediate_failed' || resp.error === 'access_denied')) {
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
                } catch (err: any) {
                    console.error("Auth Processing Error", err);
                    if (promptType !== '') alert("Lỗi khi xử lý thông tin tài khoản.");
                }
            }
        },
    });

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
          window.gapi.client.setToken({ access_token: parsed.config.accessToken });
          onUpdateDriveSession(parsed.config); 
          authenticateDrive(parsed.config.clientId || effectiveClientId, ''); 
        } else if (parsed.config?.clientId) {
          authenticateDrive(parsed.config.clientId, '');
        }
      } catch (e) {
        console.error("Session restoration error:", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [isGisLoaded, isGapiLoaded]);

  // --- MANUAL CREATE FOLDER HANDLER (UPDATED FOR ZONES) ---
  const handleCreateDefaultFolders = async () => {
      if (!driveSession.isConnected) return;
      setIsCreatingFolder(true);
      try {
          // 1. Create Root: UniData_Store
          const rootMetadata = {
              name: ROOT_FOLDER_NAME,
              mimeType: 'application/vnd.google-apps.folder'
          };
          const rootResp = await window.gapi.client.drive.files.create({
              resource: rootMetadata,
              fields: 'id'
          });
          const newRootId = rootResp.result.id;

          // 2. Helper to create child folder
          const createChild = async (name: string) => {
              const meta = {
                  name: name,
                  mimeType: 'application/vnd.google-apps.folder',
                  parents: [newRootId]
              };
              const resp = await window.gapi.client.drive.files.create({
                  resource: meta,
                  fields: 'id'
              });
              return resp.result.id;
          };

          // 3. Create Zones concurrently
          const [zoneAId, zoneBId, zoneCId] = await Promise.all([
              createChild(ZONE_A_NAME), // Private
              createChild(ZONE_B_NAME), // System
              createChild(ZONE_C_NAME), // Public
          ]);

          // 4. Set Public Permission for Zone C
          await window.gapi.client.drive.permissions.create({
              fileId: zoneCId,
              resource: {
                  role: 'reader',
                  type: 'anyone'
              }
          });

          // Update State
          setDriveFolderId(newRootId);
          setScanStatus({
              foundFolder: true,
              foundZoneA: true,
              foundZoneB: true,
              foundZoneC: true,
              backupCount: 0
          });

          // **AUTO-UPDATE SCHOOL PUBLIC DRIVE ID**
          onUpdateSchoolInfo({ ...schoolInfo, publicDriveId: zoneCId });

          const updatedSession = {
              ...driveSession,
              rootFolderId: newRootId,
              zoneAId: zoneAId,
              zoneBId: zoneBId,
              zoneCId: zoneCId,
              // Map System logic to Zone B
              folderId: zoneBId,
              folderName: ZONE_B_NAME,
              dataFolderId: zoneBId 
          };

          onUpdateDriveSession(updatedSession);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
              config: updatedSession,
              timestamp: Date.now()
          }));

          alert(`Đã khởi tạo cấu trúc thành công:\n- Root: ${ROOT_FOLDER_NAME}\n- Zones: A (Private), B (System), C (Public)`);

      } catch (e: any) {
          console.error("Create folder error", e);
          alert("Lỗi khi tạo cấu trúc thư mục: " + e.message);
      } finally {
          setIsCreatingFolder(false);
      }
  };

  // --- UPDATE PUBLIC REGISTRY (Zone_C.json) ---
  const handleUpdatePublicRegistry = async () => {
      if (!driveSession.isConnected || !driveSession.zoneCId) {
          alert("Chưa kết nối Google Drive hoặc chưa có thư mục Zone C (Public).");
          return;
      }
      
      setIsUpdatingRegistry(true);
      try {
          // 1. Generate Registry Data
          const registryData = units
              .filter(u => u.publicDriveId)
              .map(u => ({
                  unit_id: u.unit_id,
                  unit_name: u.unit_name,
                  publicDriveId: u.publicDriveId
              }));

          const content = JSON.stringify(registryData, null, 2);
          const blob = new Blob([content], { type: 'application/json' });
          const fileName = 'Zone_C.json';

          // 2. Check if file exists
          const listResp = await window.gapi.client.drive.files.list({
              q: `name = '${fileName}' and '${driveSession.zoneCId}' in parents and trashed = false`,
              fields: 'files(id)'
          });

          const existingFileId = listResp.result.files?.[0]?.id;

          // 3. Update or Create
          if (existingFileId) {
              const form = new FormData();
              form.append('metadata', new Blob([JSON.stringify({})], { type: 'application/json' }));
              form.append('file', blob);

              await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`, {
                  method: 'PATCH',
                  headers: { 'Authorization': `Bearer ${driveSession.accessToken}` },
                  body: form
              });
          } else {
              const metadata = {
                  name: fileName,
                  mimeType: 'application/json',
                  parents: [driveSession.zoneCId]
              };
              const form = new FormData();
              form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
              form.append('file', blob);

              await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${driveSession.accessToken}` },
                  body: form
              });
          }

          alert(`Đã cập nhật Registry (${registryData.length} đơn vị) vào Zone C thành công!`);

      } catch (e: any) {
          console.error("Registry update error", e);
          alert("Lỗi khi cập nhật Registry: " + e.message);
      } finally {
          setIsUpdatingRegistry(false);
      }
  };

  // --- USER HANDLER ---
  const handleConnectDrive = () => {
    if (!effectiveClientId) {
        alert("Vui lòng nhập Google Client ID.");
        return;
    }
    authenticateDrive(effectiveClientId, 'select_account consent');
  };

  const handleDisconnectDrive = () => {
    const confirm = window.confirm("Bạn có chắc muốn ngắt kết nối?\nHệ thống sẽ xóa toàn bộ dữ liệu đang lưu cục bộ để đảm bảo an toàn.");
    if (confirm) {
        if (driveSession.accessToken && window.google) {
            try {
                window.google.accounts.oauth2.revoke(driveSession.accessToken, () => { console.log('Token revoked'); });
            } catch (e) { }
        }
        if (window.gapi && window.gapi.client) window.gapi.client.setToken(null);
        localStorage.clear(); 
        sessionStorage.clear();
        setDriveFolderId('');
        setExternalSourceFolderId('');
        setScanStatus({ foundFolder: false, foundZoneA: false, foundZoneB: false, foundZoneC: false, backupCount: 0 });
        onUpdateDriveSession({
            isConnected: false,
            clientId: effectiveClientId, 
            accessToken: undefined,
            accountName: undefined,
            folderId: '',
            rootFolderId: '',
            folderName: ZONE_B_NAME,
            externalSourceFolderId: ''
        });
        onResetSystemData();
        alert("Đã ngắt kết nối và xóa sạch phiên làm việc.");
    }
  };

  const handleSaveDriveConfigOnly = () => {
      const updated = {
          ...driveSession,
          clientId: manualClientId,
          externalSourceFolderId: externalSourceFolderId 
      };
      onUpdateDriveSession(updated);
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
    // Save to Zone B (System)
    if (!driveSession.isConnected || !driveSession.zoneBId) {
        alert("Chưa kết nối Google Drive hoặc chưa có thư mục Zone B (System).");
        return;
    }
    if (!window.gapi?.client?.getToken() && driveSession.accessToken) {
        window.gapi.client.setToken({ access_token: driveSession.accessToken });
    }
    const tokenObj = window.gapi?.client?.getToken();
    if (!tokenObj) {
         alert("Phiên làm việc lỗi. Đang thử làm mới...");
         handleConnectDrive(); 
         return;
    }

    const { driveConfig: _ignored, ...safeSettings } = (settings as any);
    const data = {
      units, users, settings: safeSettings, academicYears, schoolInfo,
      faculties, facultyTitles, humanResources,
      scientificRecords, trainingRecords, personnelRecords, admissionRecords, classRecords, departmentRecords, businessRecords,
      dataConfigGroups, dynamicDataStore,
      backupDate: new Date().toISOString(),
      version: "2.0.0"
    };

    const fileName = `unidata_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const fileContent = JSON.stringify(data, null, 2);
    const file = new Blob([fileContent], {type: 'application/json'});
    
    // Save to Zone B
    const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [driveSession.zoneBId]
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
            authenticateDrive(effectiveClientId, ''); 
            alert("Phiên đăng nhập hết hạn. Hệ thống đang thử kết nối lại. Vui lòng thử lại sau giây lát.");
            return;
        }

        const json = await response.json();
        
        if (json.id) {
            alert(`Đã lưu bản mới lên Google Drive thành công!\nVị trí: UniData_Store > ${ZONE_B_NAME}\nTên file: ${fileName}`);
            authenticateDrive(effectiveClientId, '');
        } else {
            alert("Lỗi: Không thể lưu file lên Google Drive.");
        }
    } catch (error) {
        alert("Lỗi kết nối mạng khi tải lên Drive.");
    }
  };

  const handleExport = () => {
    // ... (Same as before)
    const { driveConfig: _ignored, ...safeSettings } = (settings as any);
    const data = {
      units, users, settings: safeSettings, academicYears, schoolInfo,
      faculties, facultyTitles, humanResources,
      scientificRecords, trainingRecords, personnelRecords, admissionRecords, classRecords, departmentRecords, businessRecords,
      dataConfigGroups, dynamicDataStore,
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
        }
      } catch (error) {
        alert("Lỗi: File không hợp lệ hoặc bị lỗi định dạng JSON.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleSetCurrentYear = (code: string) => {
    onUpdateSettings({ ...settings, currentAcademicYear: code });
  };

  // Define Tabs based on Permissions
  const tabs = [
      { id: 'backup', label: 'Dữ liệu & Backup' },
      // Only show Users tab for School Admin
      ...(currentPermission.role === 'school_admin' ? [{ id: 'users', label: 'Quản lý User' }] : []),
      { id: 'data_config', label: 'Cấu hình Dữ liệu' },
      { id: 'general', label: 'Cấu hình Chung' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Cài đặt Hệ thống</h2>
        <p className="text-slate-600">Quản lý tham số hệ thống, thông tin trường, người dùng và cấu hình dữ liệu.</p>
      </div>

      <div className="flex space-x-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit overflow-x-auto">
        {tabs.map(tab => (
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
              isReadOnly={!currentPermission.canEditDataConfig} // PASS READ-ONLY STATUS
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
             driveFolderId={driveFolderId} // Runtime ID (Root)
             setDriveFolderId={setDriveFolderId}
             
             // New Props for Creating Folder
             onCreateDefaultFolders={handleCreateDefaultFolders}
             isCreatingFolder={isCreatingFolder}
             scanStatus={scanStatus}
             
             // External Read-Only Source Prop
             externalSourceFolderId={externalSourceFolderId}
             setExternalSourceFolderId={setExternalSourceFolderId}

             // Registry Update Props
             onUpdatePublicRegistry={handleUpdatePublicRegistry}
             isUpdatingRegistry={isUpdatingRegistry}

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