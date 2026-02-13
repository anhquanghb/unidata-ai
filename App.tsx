import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardModule from './components/DashboardModule';
import IngestionModule from './components/IngestionModule';
import FacultyModule from './components/FacultyModule';
import OrganizationModule from './components/OrganizationModule';
import AnalysisModule from './components/AnalysisModule';
import DataStorageModule from './components/DataStorageModule';
import SettingsModule from './components/SettingsModule';
import VersionSelectorModal from './components/VersionSelectorModal'; // NEW IMPORT
import { ViewState, Unit, Faculty, HumanResourceRecord, SystemSettings, GoogleDriveConfig, UserProfile, AcademicYear, SchoolInfo, ScientificRecord, TrainingRecord, PersonnelRecord, AdmissionRecord, ClassRecord, DepartmentRecord, BusinessRecord, DataConfigGroup, DynamicRecord, FacultyTitles } from './types';

// Constants for Drive
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly'; 
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Initial Data
const initialSettings: SystemSettings = {
  currentAcademicYear: '2023-2024',
  extractionPrompt: '',
  analysisPrompt: '',
  driveConfig: { isConnected: false }
};

const initialDriveSession: GoogleDriveConfig = { isConnected: false };

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Data States
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [driveSession, setDriveSession] = useState<GoogleDriveConfig>(initialDriveSession);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
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

  const [dataConfigGroups, setDataConfigGroups] = useState<DataConfigGroup[]>([]);
  const [dynamicDataStore, setDynamicDataStore] = useState<Record<string, DynamicRecord[]>>({});

  // --- Handlers & Wrappers ---
  const handleViewChange = (view: ViewState) => setCurrentView(view);
  const handleToggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  // Mark dirty helper
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
  const handleDataImport = (type: string, data: any[]) => {
      console.log(`Importing ${type}`, data);
      if (type === 'SCIENTIFIC') setScientificRecords(prev => [...prev, ...data]);
      if (type === 'TRAINING') setTrainingRecords(prev => [...prev, ...data]);
      if (type === 'PERSONNEL') setPersonnelRecords(prev => [...prev, ...data]);
      if (type === 'ADMISSIONS') setAdmissionRecords(prev => [...prev, ...data]);
      if (type === 'CLASS') setClassRecords(prev => [...prev, ...data]);
      if (type === 'DEPARTMENT') setDepartmentRecords(prev => [...prev, ...data]);
      if (type === 'BUSINESS') setBusinessRecords(prev => [...prev, ...data]);
      markDirty();
  };

  const handleUpdateSettings = (newSettings: SystemSettings) => {
      setSettings(newSettings);
      markDirty();
  };
  const handleUpdateDriveSession = (session: GoogleDriveConfig) => setDriveSession(session); // Drive session changes shouldn't trigger data dirty? Maybe no.

  const handleUpdateDynamicData = (groupId: string, data: DynamicRecord[]) => {
      setDynamicDataStore(prev => ({ ...prev, [groupId]: data }));
      markDirty();
  };
  const handleUpdateDataConfigGroups = (groups: DataConfigGroup[]) => {
      setDataConfigGroups(groups);
      markDirty();
  };

  // Full System Import Handler
  const handleSystemDataImport = (data: any) => {
      if (data === 'RESET') {
          setUsers([]);
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
          setHasUnsavedChanges(false); // Reset implies clean slate
          return;
      }

      if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
      if (data.users) setUsers(data.users);
      if (data.units) setUnits(data.units);
      if (data.academicYears) setAcademicYears(data.academicYears);
      if (data.schoolInfo) setSchoolInfo(data.schoolInfo);
      
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

      if (data.dataConfigGroups) setDataConfigGroups(data.dataConfigGroups);
      if (data.dynamicDataStore) setDynamicDataStore(data.dynamicDataStore);
      
      setHasUnsavedChanges(true); // Imported data counts as "unsaved" until synced to cloud
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

  const handleSaveToCloud = async () => {
      if (!driveSession.isConnected || !driveSession.folderId) {
          alert("Chưa kết nối Google Drive hoặc chưa cấu hình thư mục.");
          return;
      }

      // Check token
      const tokenObj = window.gapi?.client?.getToken();
      if (!tokenObj && driveSession.accessToken) {
          window.gapi.client.setToken({ access_token: driveSession.accessToken });
      } else if (!tokenObj && !driveSession.accessToken) {
          alert("Phiên làm việc hết hạn. Vui lòng kết nối lại trong Cài đặt.");
          return;
      }

      // Prepare Data
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
              headers: new Headers({ 'Authorization': 'Bearer ' + (window.gapi.client.getToken()?.access_token || driveSession.accessToken) }),
              body: form,
          });
          
          if (!response.ok) throw new Error("Upload failed");
          
          alert("Đã lưu bản cập nhật mới lên Cloud thành công!");
          setHasUnsavedChanges(false);
      } catch (error) {
          console.error(error);
          alert("Lỗi khi lưu lên Cloud. Vui lòng kiểm tra kết nối.");
      }
  };

  const handleExportData = () => {
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
      link.download = `unidata_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Export does not clear dirty state usually, but user might want confirmation. We keep it dirty until cloud sync.
  };
  
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
          />;
      case 'organization':
        return <OrganizationModule 
            units={units}
            onUpdateUnits={handleUpdateUnits}
            faculties={faculties}
            humanResources={humanResources}
            onUpdateHumanResources={handleUpdateHumanResources}
        />;
       case 'settings':
        return <SettingsModule 
            settings={settings}
            driveSession={driveSession}
            users={users}
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
            onRemoveUser={(id) => { setUsers(users.filter(u => u.id !== id)); markDirty(); }}
            onAddAcademicYear={(y) => { setAcademicYears([...academicYears, y]); markDirty(); }}
            onUpdateAcademicYear={(y) => { setAcademicYears(academicYears.map(ay => ay.id === y.id ? y : ay)); markDirty(); }}
            onDeleteAcademicYear={(id) => { setAcademicYears(academicYears.filter(ay => ay.id !== id)); markDirty(); }}
            onToggleLockAcademicYear={(id) => { setAcademicYears(academicYears.map(ay => ay.id === id ? {...ay, isLocked: !ay.isLocked} : ay)); markDirty(); }}
            onImportData={handleSystemDataImport}
            onUpdateSchoolInfo={(info) => { setSchoolInfo(info); markDirty(); }}
            onShowVersions={() => setShowVersionModal(true)} 
            onResetSystemData={() => handleSystemDataImport('RESET')}
        />;
      default:
         // Fallback for analysis and data storage or others
        if (currentView === 'analysis' as any) { 
             return <AnalysisModule reports={[]} customPrompt={settings.analysisPrompt} />;
        }
        return <div>View not found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      <Sidebar 
        currentView={currentView}
        onViewChange={handleViewChange}
        schoolName={schoolInfo.school_name}
        currentAcademicYear={settings.currentAcademicYear}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={handleToggleSidebar}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveToCloud={handleSaveToCloud}
        onExportData={handleExportData}
        isCloudConnected={driveSession.isConnected}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-0">
          {renderContent()}
        </main>
      </div>

      {/* GLOBAL MODALS */}
      <VersionSelectorModal 
        isOpen={showVersionModal}
        driveConfig={driveSession}
        onImportData={handleSystemDataImport}
        onClose={() => setShowVersionModal(false)}
        currentData={{
            units, faculties, scientificRecords, trainingRecords, 
            personnelRecords, admissionRecords, dataConfigGroups, dynamicDataStore
        }}
      />
    </div>
  );
};

export default App;
