import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import DashboardModule from './components/DashboardModule';
import DataStorageModule from './components/DataStorageModule';
import OrganizationModule from './components/OrganizationModule';
import FacultyModule from './components/FacultyModule';
import SettingsModule from './components/SettingsModule';
import IngestionModule from './components/IngestionModule';
import ISODesignerModule from './components/ISODesignerModule';
import VersionSelectorModal from './components/VersionSelectorModal';
import InitDataPromptModal from './components/InitDataPromptModal';
import { 
  ViewState, Unit, HumanResourceRecord, Faculty, UserProfile, DataConfigGroup, 
  DynamicRecord, SystemSettings, AcademicYear, SchoolInfo, FacultyTitles, 
  GoogleDriveConfig, ScientificRecord, TrainingRecord, PersonnelRecord, 
  AdmissionRecord, ClassRecord, DepartmentRecord, BusinessRecord, PermissionProfile,
  Course, IsoDefinition
} from './types';

// Constants for Drive
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly'; 
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const STORAGE_KEY = 'UNIDATA_DRIVE_SESSION';
const ROOT_FOLDER_NAME = 'UniData_Store';
const ZONE_B_NAME = 'UniData_System';

// Initial States
const initialSettings: SystemSettings = {
  currentAcademicYear: '2023-2024',
  extractionPrompt: '',
  analysisPrompt: '',
  permissionProfile: { role: 'school_admin', canEditDataConfig: true, canEditOrgStructure: true, canProposeEditProcess: true }
};

const initialDriveSession: GoogleDriveConfig = { isConnected: false };

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Data States
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [driveSession, setDriveSession] = useState<GoogleDriveConfig>(initialDriveSession);
  
  // Default User (Ensure structure matches new type)
  const [users, setUsers] = useState<UserProfile[]>([
      { id: 'administrator', username: 'admin', fullName: 'System Administrator', role: 'school_admin', isPrimary: true, email: '' }
  ]);

  const [units, setUnits] = useState<Unit[]>([]);
  
  // Derive Current User based on Drive Email
  const currentUser = useMemo(() => {
      if (!driveSession.isConnected || !driveSession.userEmail) {
          // Fallback if not connected: Return default primary admin or null/guest
          return undefined; 
      }
      const found = users.find(u => u.email === driveSession.userEmail);
      return found;
  }, [driveSession.isConnected, driveSession.userEmail, users]);

  // Derived Managed Unit Name
  const managedUnitName = useMemo(() => {
      if (currentUser?.role === 'unit_manager' && currentUser.managedUnitId) {
          const u = units.find(unit => unit.unit_id === currentUser.managedUnitId);
          return u ? u.unit_name : 'Unknown Unit';
      }
      return undefined;
  }, [currentUser, units]);

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([{id: 'ay-1', code: '2023-2024', isLocked: false}]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({ school_name: 'Đại học Duy Tân', school_code: 'DTU' });
  
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [facultyTitles, setFacultyTitles] = useState<FacultyTitles>({
      ranks: [], degrees: [], academicTitles: [], positions: []
  });
  const [humanResources, setHumanResources] = useState<HumanResourceRecord[]>([]);
  
  const [scientificRecords, setScientificRecords] = useState<ScientificRecord[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [personnelRecords, setPersonnelRecords] = useState<PersonnelRecord[]>([]); 
  const [admissionRecords, setAdmissionRecords] = useState<AdmissionRecord[]>([]);
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  const [departmentRecords, setDepartmentRecords] = useState<DepartmentRecord[]>([]);
  const [businessRecords, setBusinessRecords] = useState<BusinessRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isoDefinitions, setIsoDefinitions] = useState<IsoDefinition[]>([]);

  const [dataConfigGroups, setDataConfigGroups] = useState<DataConfigGroup[]>([]);
  const [dynamicDataStore, setDynamicDataStore] = useState<Record<string, DynamicRecord[]>>({});
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [showInitDataPrompt, setShowInitDataPrompt] = useState(false);
  const [hasCheckedAutoLoad, setHasCheckedAutoLoad] = useState(false);

  // --- GOOGLE DRIVE LOGIC ---
  
  // 1. Basic Scan Logic (Simplified for App level, SettingsModule does deep scan)
  const performAppDriveScan = async (accessToken: string): Promise<Partial<GoogleDriveConfig>> => {
      try {
          window.gapi.client.setToken({ access_token: accessToken });
          
          const userInfo = await window.gapi.client.drive.about.get({ fields: "user" });
          const userEmail = userInfo.result.user.emailAddress;
          const accountName = userInfo.result.user.displayName;

          // Find Root - Allow finding Shared Folders (removed 'me' in owners)
          const q = `mimeType='application/vnd.google-apps.folder' and name='${ROOT_FOLDER_NAME}' and trashed=false`;
          const folderResp = await window.gapi.client.drive.files.list({ q, fields: 'files(id)' });
          const rootFolderId = folderResp.result.files?.[0]?.id || '';

          // Find Zone B (System)
          let zoneBId = '';
          if (rootFolderId) {
              const qB = `mimeType='application/vnd.google-apps.folder' and name='${ZONE_B_NAME}' and '${rootFolderId}' in parents and trashed=false`;
              const zoneResp = await window.gapi.client.drive.files.list({ q: qB, fields: 'files(id)' });
              zoneBId = zoneResp.result.files?.[0]?.id || '';
          } else {
              // Fallback: Search for Zone B directly (if shared directly)
              const qB = `mimeType='application/vnd.google-apps.folder' and name='${ZONE_B_NAME}' and trashed=false`;
              const zoneResp = await window.gapi.client.drive.files.list({ q: qB, fields: 'files(id)' });
              zoneBId = zoneResp.result.files?.[0]?.id || '';
          }

          // Find Zone C (Public)
          let zoneCId = '';
          if (rootFolderId) {
              const qC = `mimeType='application/vnd.google-apps.folder' and name='UniData_Public' and '${rootFolderId}' in parents and trashed=false`;
              const zoneCResp = await window.gapi.client.drive.files.list({ q: qC, fields: 'files(id)' });
              zoneCId = zoneCResp.result.files?.[0]?.id || '';
          } else {
              // Fallback: Search for Zone C directly
              const qC = `mimeType='application/vnd.google-apps.folder' and name='UniData_Public' and trashed=false`;
              const zoneCResp = await window.gapi.client.drive.files.list({ q: qC, fields: 'files(id)' });
              zoneCId = zoneCResp.result.files?.[0]?.id || '';
          }

          return {
              isConnected: true,
              accessToken,
              userEmail,
              accountName: `${accountName} (${userEmail})`,
              rootFolderId,
              zoneBId,
              zoneCId,
              folderId: zoneBId || rootFolderId // Fallback legacy
          };
      } catch (e) {
          console.error("Auth Scan Error", e);
          return { isConnected: false };
      }
  };

  // 2. Auth Handler
  const handleConnectDrive = () => {
      const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || settings.driveConfig?.clientId;
      if (!clientId) {
          alert("Vui lòng cấu hình Client ID trong Cài đặt hoặc biến môi trường.");
          setCurrentView('settings'); // Redirect to settings to input ID
          return;
      }

      if (!window.google) return;

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: async (resp: any) => {
              if (resp.error) {
                  alert("Lỗi đăng nhập: " + resp.error);
                  return;
              }
              if (resp.access_token) {
                  const scanResult = await performAppDriveScan(resp.access_token);
                  if (scanResult.isConnected) {
                      const newSession = { ...driveSession, ...scanResult, clientId };
                      setDriveSession(newSession);
                      // Persist
                      localStorage.setItem(STORAGE_KEY, JSON.stringify({
                          config: newSession,
                          timestamp: Date.now()
                      }));
                  }
              }
          },
      });
      tokenClient.requestAccessToken({ prompt: 'select_account consent' });
  };

  // 3. Disconnect Handler
  const handleDisconnectDrive = () => {
      if (window.confirm("Bạn có chắc muốn ngắt kết nối tài khoản Google?")) {
          if (driveSession.accessToken && window.google) {
              window.google.accounts.oauth2.revoke(driveSession.accessToken, () => {});
          }
          if (window.gapi?.client) window.gapi.client.setToken(null);
          
          const cleanSession = { isConnected: false, clientId: driveSession.clientId }; // Keep ClientID
          setDriveSession(cleanSession);
          localStorage.removeItem(STORAGE_KEY);
          setHasCheckedAutoLoad(false);
      }
  };

  // --- Handlers & Wrappers ---
  const markDirty = () => setHasUnsavedChanges(true);

  // --- WRAPPED SETTERS ---
  const handleSetFaculties: React.Dispatch<React.SetStateAction<Faculty[]>> = (value) => {
      setFaculties(value);
      markDirty();
  };
  const handleSetFacultyTitles: React.Dispatch<React.SetStateAction<FacultyTitles>> = (value) => {
      setFacultyTitles(value);
      markDirty();
  };
  const handleUpdateUnits = (newUnits: Unit[]) => {
      setUnits(newUnits);
      markDirty();
  };
  const handleUpdateHumanResources = (newHr: HumanResourceRecord[]) => {
      setHumanResources(newHr);
      markDirty();
  };
  const handleUpdateSettings = (newSettings: SystemSettings) => {
      setSettings(newSettings);
      markDirty();
  };
  const handleUpdateDriveSession = (session: GoogleDriveConfig) => setDriveSession(session); 

  const handleUpdateDynamicData = (groupId: string, data: DynamicRecord[]) => {
      setDynamicDataStore(prev => ({ ...prev, [groupId]: data }));
      markDirty();
  };
  const handleUpdateDataConfigGroups = (groups: DataConfigGroup[]) => {
      setDataConfigGroups(groups);
      markDirty();
  };
  const handleUpdateIsoDefinitions = (defs: IsoDefinition[]) => {
      setIsoDefinitions(defs);
      markDirty();
  };

  // --- ENSURE SYSTEM UNITS EXIST ---
  useEffect(() => {
      const systemUnits: Unit[] = [
          { unit_id: 'unit_school_mgmt', unit_name: 'Quản lý cấp trường', unit_code: 'SCHOOL_MGMT', unit_type: 'school', isSystem: true },
          { unit_id: 'unit_external', unit_name: 'Đối tượng ngoài', unit_code: 'EXTERNAL', unit_type: 'external', isSystem: true }
      ];

      // Use functional update to safely check and add missing units without race conditions
      setUnits(prev => {
          const currentIds = new Set(prev.map(u => u.unit_id));
          const missingUnits = systemUnits.filter(sysUnit => !currentIds.has(sysUnit.unit_id));
          
          if (missingUnits.length > 0) {
              console.log("Injecting missing system units:", missingUnits.map(u => u.unit_name));
              return [...prev, ...missingUnits];
          }
          return prev;
      });
  }, [units.length]); // Only re-run if length changes to avoid infinite loops if references change but content doesn't

  // --- AUTO UPDATE IDs LOGIC (Refined for Primary Users) ---
  useEffect(() => {
      if (!driveSession.isConnected || !driveSession.zoneCId || !driveSession.userEmail) return;

      // 1. Identify the current logged-in user within the system
      const matchedUser = users.find(u => u.email === driveSession.userEmail);

      if (!matchedUser) {
          // console.warn(`Drive Email ${driveSession.userEmail} does not match any system user.`);
          return;
      }

      // 2. Only proceed if this user is designated as "Primary" for their role
      if (matchedUser.isPrimary) {
          
          if (matchedUser.role === 'school_admin') {
              // PRIMARY SCHOOL ADMIN: Updates School Public ID
              if (schoolInfo.publicDriveId !== driveSession.zoneCId) {
                  console.log("Auto-updating School Public Drive ID (Primary School Admin)");
                  setSchoolInfo(prev => ({ ...prev, publicDriveId: driveSession.zoneCId }));
                  markDirty();
              }
          } else if (matchedUser.role === 'unit_manager' && matchedUser.managedUnitId) {
              // PRIMARY UNIT MANAGER: Updates Specific Unit Public ID
              const managedId = matchedUser.managedUnitId;
              const targetUnit = units.find(u => u.unit_id === managedId);
              
              if (targetUnit && targetUnit.unit_publicDriveId !== driveSession.zoneCId) {
                  console.log(`Auto-updating Unit Public Drive ID for ${targetUnit.unit_name} (Primary Unit Manager)`);
                  setUnits(prevUnits => prevUnits.map(u => 
                      u.unit_id === managedId ? { ...u, unit_publicDriveId: driveSession.zoneCId } : u
                  ));
                  markDirty();
              }
          }
      }
  }, [driveSession, users, units, schoolInfo]);


  // --- AUTO LOAD BACKUP LOGIC ---
  useEffect(() => {
      if (driveSession.isConnected && driveSession.zoneBId && !hasCheckedAutoLoad) {
          const checkBackup = async () => {
              try {
                  // Search for backup files
                  const response = await window.gapi.client.drive.files.list({
                      q: `'${driveSession.zoneBId}' in parents and mimeType = 'application/json' and name contains 'unidata_backup_' and trashed = false`,
                      fields: 'files(id, name, createdTime)',
                      orderBy: 'createdTime desc',
                      pageSize: 1
                  });
                  
                  const files = response.result.files;
                  if (files && files.length > 0) {
                      // Found backup -> Load it
                      const latestFile = files[0];
                      console.log("Auto-loading latest backup:", latestFile.name);
                      
                      const contentResp = await fetch(`https://www.googleapis.com/drive/v3/files/${latestFile.id}?alt=media`, {
                          headers: { 'Authorization': `Bearer ${driveSession.accessToken}` }
                      });
                      
                      if (contentResp.ok) {
                          const data = await contentResp.json();
                          handleSystemDataImport(data);
                          alert(`Đã tự động tải bản sao lưu mới nhất: ${latestFile.name}`);
                      }
                  } else {
                      // No backup found -> Prompt user
                      setShowInitDataPrompt(true);
                  }
              } catch (e) {
                  console.error("Auto-load backup error", e);
              } finally {
                  setHasCheckedAutoLoad(true);
              }
          };
          checkBackup();
      }
  }, [driveSession.isConnected, driveSession.zoneBId, hasCheckedAutoLoad]);

  // --- SYSTEM INTEGRITY: CASCADE ID UPDATES ---
  const handleCascadeFacultyIdChange = (oldId: string, newId: string) => {
      let changeCount = 0;

      // 1. Update Human Resources (Assignment Table)
      const updatedHR = humanResources.map(hr => {
          if (hr.facultyId === oldId) {
              changeCount++;
              return { ...hr, facultyId: newId };
          }
          return hr;
      });
      if (JSON.stringify(updatedHR) !== JSON.stringify(humanResources)) {
          setHumanResources(updatedHR);
      }

      // 2. Update Dynamic Data Store (Lookups)
      let storeChanged = false;
      const newStore = { ...dynamicDataStore };

      dataConfigGroups.forEach(group => {
          // Find fields that reference 'faculties'
          const refFields = group.fields.filter(f => 
              (f.type === 'reference' || f.type === 'reference_multiple') && 
              f.referenceTarget === 'faculties'
          );

          if (refFields.length > 0) {
              const groupData = newStore[group.id] || [];
              let groupChanged = false;
              
              const newGroupData = groupData.map(record => {
                  let recordChanged = false;
                  const newRecord = { ...record };

                  refFields.forEach(field => {
                      const val = record[field.key];
                      // Single Reference
                      if (field.type === 'reference' && val === oldId) {
                          newRecord[field.key] = newId;
                          recordChanged = true;
                          changeCount++;
                      } 
                      // Multiple Reference
                      else if (field.type === 'reference_multiple' && Array.isArray(val) && val.includes(oldId)) {
                          newRecord[field.key] = val.map((v: string) => v === oldId ? newId : v);
                          recordChanged = true;
                          changeCount++;
                      }
                  });

                  if (recordChanged) {
                      groupChanged = true;
                      return newRecord;
                  }
                  return record;
              });

              if (groupChanged) {
                  newStore[group.id] = newGroupData;
                  storeChanged = true;
              }
          }
      });

      if (storeChanged) {
          setDynamicDataStore(newStore);
      }

      if (changeCount > 0) {
          markDirty();
          console.log(`Updated ${changeCount} references for Faculty ID change from ${oldId} to ${newId}`);
      }
  };

  // --- UNIT SPECIFIC EXPORT LOGIC ---
  const handleExportUnitData = (unitId: string) => {
      const targetUnit = units.find(u => u.unit_id === unitId);
      if (!targetUnit) return;

      // 1. Identify Hierarchy (Self + Children + Parents)
      const relatedUnitIds = new Set<string>(); // For Structure (Units Tree)
      const dataScopeIds = new Set<string>();   // For Content (Users, HR, Records) - Self + Descendants

      relatedUnitIds.add(unitId);
      dataScopeIds.add(unitId);

      // Collect Children (Recursive)
      const collectChildren = (parentId: string) => {
          units.filter(u => u.unit_parentId === parentId).forEach(child => {
              relatedUnitIds.add(child.unit_id);
              dataScopeIds.add(child.unit_id); // Add to data scope
              collectChildren(child.unit_id);
          });
      };
      collectChildren(unitId);

      // Collect Parents (Recursive)
      let currentParentId = targetUnit.unit_parentId;
      while (currentParentId) {
          relatedUnitIds.add(currentParentId);
          // Note: Parents are NOT added to dataScopeIds to avoid leaking parent's data/users
          const parent = units.find(u => u.unit_id === currentParentId);
          currentParentId = parent ? parent.unit_parentId : undefined;
      }

      // **CRITICAL UPDATE: Preserve School Public ID when exporting**
      const filteredUnits = units.filter(u => relatedUnitIds.has(u.unit_id));

      // 2. Identify Related Personnel
      // Only include personnel belonging to the Exported Units (Data Scope)
      const filteredHR = humanResources.filter(hr => dataScopeIds.has(hr.unitId));
      const relatedFacultyIds = new Set(filteredHR.map(hr => hr.facultyId));
      const filteredFaculties = faculties.filter(f => relatedFacultyIds.has(f.id));

      // 3. Identify Related Users
      // Only include users managing the units in the Data Scope
      const filteredUsers = users.filter(u => u.managedUnitId && dataScopeIds.has(u.managedUnitId));

      // 4. Identify Related Dynamic Data
      const filteredDynamicStore: Record<string, DynamicRecord[]> = {};
      
      dataConfigGroups.forEach(group => {
          const unitRefFields = group.fields.filter(f => (f.type === 'reference' || f.type === 'reference_multiple') && f.referenceTarget === 'units').map(f => f.key);
          const facultyRefFields = group.fields.filter(f => (f.type === 'reference' || f.type === 'reference_multiple') && f.referenceTarget === 'faculties').map(f => f.key);
          
          if (unitRefFields.length > 0 || facultyRefFields.length > 0) {
              const allRecords = dynamicDataStore[group.id] || [];
              const relevantRecords = allRecords.filter(record => {
                  const hasUnitRef = unitRefFields.some(key => {
                      const val = record[key];
                      if (Array.isArray(val)) return val.some(v => dataScopeIds.has(v));
                      return dataScopeIds.has(val);
                  });
                  if (hasUnitRef) return true;

                  const hasFacultyRef = facultyRefFields.some(key => {
                      const val = record[key];
                      if (Array.isArray(val)) return val.some(v => relatedFacultyIds.has(v));
                      return relatedFacultyIds.has(val);
                  });
                  return hasFacultyRef;
              });

              if (relevantRecords.length > 0) {
                  filteredDynamicStore[group.id] = relevantRecords;
              }
          }
      });

      // 5. Construct JSON Payload with Restricted Permissions
      const { driveConfig: _ignored, ...safeSettings } = (settings as any);
      
      // CREATE RESTRICTED PERMISSION PROFILE FOR EXPORT
      const restrictedPermission: PermissionProfile = {
          role: 'unit_manager',
          canEditDataConfig: false, // Unit cannot edit schema
          canEditOrgStructure: false, // Unit cannot edit structure (globally), but can edit children
          canProposeEditProcess: false,
          managedUnitId: targetUnit.unit_id // Locked to this unit
      };

      const exportData = {
          exportType: "UNIT_PARTIAL",
          rootUnitName: targetUnit.unit_name,
          exportDate: new Date().toISOString(),
          settings: { ...safeSettings, permissionProfile: restrictedPermission }, // INJECT RESTRICTED PERMISSION
          units: filteredUnits,
          users: filteredUsers,
          humanResources: filteredHR,
          faculties: filteredFaculties,
          facultyTitles: facultyTitles,
          dataConfigGroups: dataConfigGroups, 
          dynamicDataStore: filteredDynamicStore,
          academicYears: academicYears, 
          schoolInfo: schoolInfo 
      };

      // 6. Download File
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `UniData_Package_${targetUnit.unit_code || 'Unit'}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Full System Import Handler
  const handleSystemDataImport = (data: any) => {
      if (data === 'RESET') {
          setUsers([{ id: 'administrator', username: 'admin', fullName: 'System Administrator', role: 'school_admin', isPrimary: true }]);
          setUnits([]);
          setFaculties([]);
          setHumanResources([]);
          setScientificRecords([]);
          setTrainingRecords([]);
          setPersonnelRecords([]);
          setAdmissionRecords([]);
          setClassRecords([]);
          setDepartmentRecords([]);
          setBusinessRecords([]);
          setDataConfigGroups([]);
          setDynamicDataStore({});
          setSettings({ ...initialSettings }); // Reset to default permissions
          setHasUnsavedChanges(false); 
          return;
      }

      // LOAD SETTINGS FIRST to apply Permissions
      if (data.settings) {
          setSettings(prev => ({ 
              ...prev, 
              ...data.settings,
              permissionProfile: data.settings.permissionProfile || prev.permissionProfile || initialSettings.permissionProfile
          }));
      }

      if (data.users) setUsers(data.users);
      if (data.units) setUnits(data.units);
      if (data.academicYears) setAcademicYears(data.academicYears);
      
      // PROTECT SCHOOL INFO ON IMPORT IF PARTIAL IMPORT
      if (data.schoolInfo) {
          // If partial import (Unit Manager level), we keep the school info from the import (Parent)
          setSchoolInfo(data.schoolInfo);
      }
      
      if (data.faculties) setFaculties(data.faculties);
      if (data.facultyTitles) setFacultyTitles(data.facultyTitles);
      if (data.humanResources) setHumanResources(data.humanResources);

      if (data.scientificRecords) setScientificRecords(data.scientificRecords);
      if (data.trainingRecords) setTrainingRecords(data.trainingRecords);
      if (data.personnelRecords) setPersonnelRecords(data.personnelRecords);
      if (data.admissionRecords) setAdmissionRecords(data.admissionRecords);
      if (data.classRecords) setClassRecords(data.classRecords);
      if (data.departmentRecords) setDepartmentRecords(data.departmentRecords);
      if (data.businessRecords) setBusinessRecords(data.businessRecords);
      if (data.isoDefinitions) setIsoDefinitions(data.isoDefinitions);

      if (data.dataConfigGroups) setDataConfigGroups(data.dataConfigGroups);
      if (data.dynamicDataStore) setDynamicDataStore(data.dynamicDataStore);
      
      setHasUnsavedChanges(true); 
  };

  // --- GOOGLE DRIVE LOGIC (GLOBAL) ---
  useEffect(() => {
    // Load GAPI/GIS globally
    const loadGapi = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client', async () => {
          await window.gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
        });
      };
      document.body.appendChild(script);
    };
    const loadGis = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      document.body.appendChild(script);
    };
    if (!window.gapi) loadGapi();
    if (!window.google) loadGis();
  }, []);

  const handleSaveToCloud = async (overrideIsoDefinitions?: IsoDefinition[]) => {
      if (!driveSession.isConnected) {
          alert("Chưa kết nối Google Drive.");
          return;
      }

      const tokenObj = window.gapi?.client?.getToken();
      if (!tokenObj && driveSession.accessToken) {
          window.gapi.client.setToken({ access_token: driveSession.accessToken });
      } else if (!tokenObj && !driveSession.accessToken) {
          alert("Phiên làm việc hết hạn. Vui lòng kết nối lại trong Cài đặt.");
          return;
      }

      const accessToken = window.gapi.client.getToken()?.access_token || driveSession.accessToken;

      // Prepare Data
      const currentIsoDefs = overrideIsoDefinitions || isoDefinitions;
      const { driveConfig: _ignored, ...safeSettings } = (settings as any);
      const data = {
          units, users, settings: safeSettings, academicYears, schoolInfo,
          faculties, facultyTitles, humanResources,
          scientificRecords, trainingRecords, personnelRecords, admissionRecords, classRecords, departmentRecords, businessRecords,
          isoDefinitions: currentIsoDefs,
          dataConfigGroups, dynamicDataStore,
          backupDate: new Date().toISOString(),
          version: "2.1.0"
      };

      const fileContent = JSON.stringify(data, null, 2);
      const fileBlob = new Blob([fileContent], {type: 'application/json'});
      
      // Filenames
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `unidata_backup_${timestamp}.json`;
      const isoFileName = `isodata_${timestamp}.json`;

      // Helper to upload file
      const uploadFile = async (name: string, blob: Blob, parentId: string) => {
          const metadata = {
              name: name,
              mimeType: 'application/json',
              parents: [parentId]
          };
          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', blob);

          const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
              method: 'POST',
              headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
              body: form,
          });
          if (!response.ok) throw new Error(`Failed to upload ${name}`);
          return await response.json();
      };

      // Helper to update/create file (Overwrite if exists)
      const publishFile = async (name: string, blob: Blob, parentId: string) => {
          const listResp = await window.gapi.client.drive.files.list({
              q: `name = '${name}' and '${parentId}' in parents and trashed = false`,
              fields: 'files(id)',
          });
          const existingFileId = listResp.result.files?.[0]?.id;

          if (existingFileId) {
              const form = new FormData();
              form.append('metadata', new Blob([JSON.stringify({})], { type: 'application/json' }));
              form.append('file', blob);
              await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`, {
                  method: 'PATCH',
                  headers: { 'Authorization': 'Bearer ' + accessToken },
                  body: form
              });
          } else {
              await uploadFile(name, blob, parentId);
          }
      };

      try {
          let messages = [];

          // 1. Save unidata_backup & external.json to Zone B
          if (currentUser?.role === 'school_admin' || currentUser?.role === 'unit_manager') {
              if (driveSession.zoneBId) {
                  // Backup -> New File
                  await uploadFile(backupFileName, fileBlob, driveSession.zoneBId);
                  messages.push(`- Đã lưu backup: ${backupFileName} vào Zone B`);

                  // External -> Update/Overwrite
                  await publishFile('external.json', fileBlob, driveSession.zoneBId);
                  messages.push(`- Đã cập nhật external.json vào Zone B`);
              } else {
                  console.warn("Zone B ID missing, skipping system backup.");
              }
          }

          // 2. Save isodata_*.json to Zone C
          if (currentUser?.permissions?.canProposeEditProcess || (currentUser?.role === 'school_admin' && currentUser?.isPrimary)) {
              if (driveSession.zoneCId) {
                  const publishedOnly = currentIsoDefs.filter(d => d.status === 'đã ban hành');
                  const isoContent = JSON.stringify(publishedOnly, null, 2);
                  const isoBlob = new Blob([isoContent], { type: 'application/json' });
                  
                  // NEW: Save as isodata_[timestamp].json (New File)
                  await uploadFile(isoFileName, isoBlob, driveSession.zoneCId);
                  messages.push(`- Đã lưu ${isoFileName} vào Zone C`);
              } else {
                  console.warn("Zone C ID missing, skipping ISO publish.");
              }
          }

          if (messages.length > 0) {
              alert(`Lưu trữ thành công:\n${messages.join('\n')}`);
              setHasUnsavedChanges(false);
          } else {
              alert("Không có hành động lưu trữ nào được thực hiện (do thiếu quyền hoặc thiếu thư mục đích).");
          }

      } catch (error: any) {
          console.error(error);
          alert("Lỗi khi lưu lên Cloud: " + error.message);
      }
  };

  const handleExportData = () => {
      const { driveConfig: _ignored, ...safeSettings } = (settings as any);
      const data = {
          units, users, settings: safeSettings, academicYears, schoolInfo,
          faculties, facultyTitles, humanResources,
          scientificRecords, trainingRecords, personnelRecords, admissionRecords, classRecords, departmentRecords, businessRecords,
          isoDefinitions,
          dataConfigGroups, dynamicDataStore,
          backupDate: new Date().toISOString(),
          version: "2.1.0"
      };
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `unidata_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  // Get Current Permission based on the identified User
  // Fallback to default permissions if no user is found/connected
  const activePermission = currentUser 
      ? { 
          role: currentUser.role, 
          canEditDataConfig: currentUser.role === 'school_admin' || (currentUser.role === 'unit_manager' && currentUser.isPrimary), 
          canEditOrgStructure: true,
          canProposeEditProcess: currentUser.permissions?.canProposeEditProcess || false,
          managedUnitId: currentUser.managedUnitId
        }
      : (settings.permissionProfile || initialSettings.permissionProfile);
  
  // Resolve Managed Unit Name for Banner
  const managedUnit = activePermission.role === 'unit_manager' && activePermission.managedUnitId 
      ? units.find(u => u.unit_id === activePermission.managedUnitId)
      : null;

  // Render Content
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardModule 
          scientificRecords={scientificRecords}
          faculties={faculties}
          currentAcademicYear={settings.currentAcademicYear}
        />;
      case 'scientific_management':
        return <DataStorageModule 
             isLocked={false}
             currentAcademicYear={settings.currentAcademicYear}
             dataConfigGroups={dataConfigGroups}
             dynamicDataStore={dynamicDataStore}
             onUpdateDynamicData={handleUpdateDynamicData}
             onUpdateDataConfigGroups={handleUpdateDataConfigGroups}
             units={units}
             faculties={faculties}
             humanResources={humanResources}
             academicYears={academicYears}
             driveConfig={driveSession}
        />;
      case 'faculty_profiles':
        return <FacultyModule 
             faculties={faculties}
             setFaculties={handleSetFaculties}
             facultyTitles={facultyTitles}
             setFacultyTitles={handleSetFacultyTitles}
             courses={[]} 
             geminiConfig={{ apiKey: (import.meta as any).env?.API_KEY }}
             units={units}
             humanResources={humanResources}
             currentAcademicYear={settings.currentAcademicYear}
             permission={activePermission} // Pass Permission
             onCascadeIdChange={handleCascadeFacultyIdChange} // PASS CASCADE HANDLER
          />;
      case 'organization':
        return <OrganizationModule 
            units={units}
            onUpdateUnits={handleUpdateUnits}
            faculties={faculties}
            humanResources={humanResources}
            onUpdateHumanResources={handleUpdateHumanResources}
            onExportUnitData={handleExportUnitData}
            permission={activePermission} // Pass Permission
        />;
       case 'settings':
        return <SettingsModule 
            settings={settings}
            driveSession={driveSession}
            users={users}
            currentUser={currentUser} // Pass identified user
            units={units}
            academicYears={academicYears}
            schoolInfo={schoolInfo}
            faculties={faculties}
            facultyTitles={facultyTitles}
            humanResources={humanResources}
            scientificRecords={scientificRecords}
            trainingRecords={trainingRecords}
            personnelRecords={personnelRecords}
            admissionRecords={admissionRecords}
            classRecords={classRecords}
            departmentRecords={departmentRecords}
            businessRecords={businessRecords}
            dataConfigGroups={dataConfigGroups}
            dynamicDataStore={dynamicDataStore}
            onUpdateDataConfigGroups={handleUpdateDataConfigGroups}
            onUpdateSettings={handleUpdateSettings}
            onUpdateDriveSession={handleUpdateDriveSession}
            onAddUser={(u) => { setUsers([...users, u]); markDirty(); }}
            onUpdateUsers={(updatedUsers) => { setUsers(updatedUsers); markDirty(); }}
            onRemoveUser={(id) => { setUsers(users.filter(u => u.id !== id)); markDirty(); }}
            onAddAcademicYear={(y) => { setAcademicYears([...academicYears, y]); markDirty(); }}
            onUpdateAcademicYear={(y) => { setAcademicYears(academicYears.map(ay => ay.id === y.id ? y : ay)); markDirty(); }}
            onDeleteAcademicYear={(id) => { setAcademicYears(academicYears.filter(ay => ay.id !== id)); markDirty(); }}
            onToggleLockAcademicYear={(id) => { setAcademicYears(academicYears.map(ay => ay.id === id ? {...ay, isLocked: !ay.isLocked} : ay)); markDirty(); }}
            onImportData={handleSystemDataImport}
            onUpdateSchoolInfo={(info) => { setSchoolInfo(info); markDirty(); }}
            onShowVersions={() => setIsVersionModalOpen(true)} 
            onResetSystemData={() => handleSystemDataImport('RESET')}
            onSaveToCloud={handleSaveToCloud}
        />;
      case 'iso_designer':
        return <ISODesignerModule 
            isoDefinitions={isoDefinitions}
            onUpdateIsoDefinitions={handleUpdateIsoDefinitions}
            handleSaveToCloud={handleSaveToCloud}
            units={units}
            humanResources={humanResources}
            faculties={faculties}
            driveSession={driveSession}
            currentUser={currentUser}
            schoolInfo={schoolInfo}
        />;
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      <Sidebar 
        currentView={currentView}
        onViewChange={setCurrentView}
        schoolName={schoolInfo.school_name}
        currentAcademicYear={settings.currentAcademicYear}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveToCloud={handleSaveToCloud}
        onExportData={handleExportData}
        
        // Auth Props
        driveSession={driveSession}
        currentUser={currentUser}
        managedUnitName={managedUnitName}
        onConnectDrive={handleConnectDrive}
        onDisconnectDrive={handleDisconnectDrive}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Permission Banner */}
        {activePermission.role === 'unit_manager' && (
            <div className="bg-amber-100 text-amber-800 px-4 py-1 text-xs font-bold text-center border-b border-amber-200">
                {managedUnit ? managedUnit.unit_name.toUpperCase() : 'CHẾ ĐỘ CẤP ĐƠN VỊ'} - ID: {activePermission.managedUnitId} {currentUser?.isPrimary ? '(PRIMARY)' : '(SECONDARY)'}.
            </div>
        )}
        <main className="flex-1 overflow-y-auto p-0">
          {renderContent()}
        </main>
      </div>

      {/* GLOBAL MODALS */}
      <VersionSelectorModal 
        isOpen={isVersionModalOpen}
        driveConfig={driveSession}
        onImportData={handleSystemDataImport}
        onClose={() => setIsVersionModalOpen(false)}
        currentData={{
            units, faculties, scientificRecords, trainingRecords, 
            personnelRecords, admissionRecords, dataConfigGroups, dynamicDataStore
        }}
      />

      <InitDataPromptModal
        isOpen={showInitDataPrompt}
        onClose={() => setShowInitDataPrompt(false)}
        onInitEmpty={() => {
            handleSystemDataImport('RESET');
            setShowInitDataPrompt(false);
        }}
        onSelectExternal={() => {
            setShowInitDataPrompt(false);
            setIsVersionModalOpen(true);
        }}
      />
    </div>
  );
};

export default App;