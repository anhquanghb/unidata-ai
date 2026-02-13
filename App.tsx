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
  const [showVersionModal, setShowVersionModal] = useState(false); // NEW STATE

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

  // Handlers
  const handleViewChange = (view: ViewState) => setCurrentView(view);
  const handleToggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  // Data Import Handler (Generic)
  const handleDataImport = (type: string, data: any[]) => {
      console.log(`Importing ${type}`, data);
      if (type === 'SCIENTIFIC') setScientificRecords(prev => [...prev, ...data]);
      if (type === 'TRAINING') setTrainingRecords(prev => [...prev, ...data]);
      if (type === 'PERSONNEL') setPersonnelRecords(prev => [...prev, ...data]);
      if (type === 'ADMISSIONS') setAdmissionRecords(prev => [...prev, ...data]);
      if (type === 'CLASS') setClassRecords(prev => [...prev, ...data]);
      if (type === 'DEPARTMENT') setDepartmentRecords(prev => [...prev, ...data]);
      if (type === 'BUSINESS') setBusinessRecords(prev => [...prev, ...data]);
  };

  const handleUpdateSettings = (newSettings: SystemSettings) => setSettings(newSettings);
  const handleUpdateDriveSession = (session: GoogleDriveConfig) => setDriveSession(session);

  const handleUpdateDynamicData = (groupId: string, data: DynamicRecord[]) => {
      setDynamicDataStore(prev => ({
          ...prev,
          [groupId]: data
      }));
  };

  // Full System Import Handler
  const handleSystemDataImport = (data: any) => {
      if (data === 'RESET') {
          // Reset all to initial state (except Drive Session which is handled separately usually, but here we can keep it connected)
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
          // Keep settings but maybe reset non-config parts?
          // For now, keep as is.
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
             onUpdateDataConfigGroups={setDataConfigGroups}
             units={units}
             faculties={faculties}
             humanResources={humanResources}
             academicYears={academicYears}
             driveConfig={driveSession}
        />;
      case 'faculty_profiles':
        return <FacultyModule 
             faculties={faculties}
             setFaculties={setFaculties}
             facultyTitles={facultyTitles}
             setFacultyTitles={setFacultyTitles}
             courses={[]} 
             geminiConfig={{ apiKey: (import.meta as any).env?.API_KEY }}
             units={units}
             humanResources={humanResources}
             currentAcademicYear={settings.currentAcademicYear}
          />;
      case 'organization':
        return <OrganizationModule 
            units={units}
            onUpdateUnits={setUnits}
            faculties={faculties}
            humanResources={humanResources}
            onUpdateHumanResources={setHumanResources}
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
            onUpdateDataConfigGroups={setDataConfigGroups}
            onUpdateSettings={handleUpdateSettings}
            onUpdateDriveSession={handleUpdateDriveSession}
            onAddUser={(u) => setUsers([...users, u])}
            onRemoveUser={(id) => setUsers(users.filter(u => u.id !== id))}
            onAddAcademicYear={(y) => setAcademicYears([...academicYears, y])}
            onUpdateAcademicYear={(y) => setAcademicYears(academicYears.map(ay => ay.id === y.id ? y : ay))}
            onDeleteAcademicYear={(id) => setAcademicYears(academicYears.filter(ay => ay.id !== id))}
            onToggleLockAcademicYear={(id) => setAcademicYears(academicYears.map(ay => ay.id === id ? {...ay, isLocked: !ay.isLocked} : ay))}
            onImportData={handleSystemDataImport}
            onUpdateSchoolInfo={setSchoolInfo}
            onShowVersions={() => setShowVersionModal(true)} // PASSED PROP
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