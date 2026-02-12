import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardModule from './components/DashboardModule';
import IngestionModule from './components/IngestionModule';
import FacultyModule from './components/FacultyModule';
import OrganizationModule from './components/OrganizationModule';
import AnalysisModule from './components/AnalysisModule';
import DataStorageModule from './components/DataStorageModule';
import SettingsModule from './components/SettingsModule';
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
        return <IngestionModule 
            onDataImport={handleDataImport}
            academicYears={academicYears}
            currentAcademicYearCode={settings.currentAcademicYear}
            isLocked={false} 
            virtualAssistantUrl={settings.virtualAssistantUrl}
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
            onImportData={(d) => console.log('Import Data:', d)}
            onUpdateSchoolInfo={setSchoolInfo}
            onResetSystemData={() => console.log('Reset Data')}
        />;
      default:
         // Fallback for analysis and data storage or others
        if (currentView === 'analysis' as any) { // Assuming analysis exists in viewstate but not handled in standard switch
             return <AnalysisModule reports={[]} customPrompt={settings.analysisPrompt} />;
        }
        // Fallback for Data Storage which is likely handled under 'scientific_management' or separate?
        // Based on Sidebar it seems 'scientific_management' is the IngestionHub.
        // Let's check Sidebar.tsx... 
        // Sidebar has: dashboard, scientific_management, faculty_profiles, organization, settings.
        // DataStorageModule seems unused in main nav or perhaps a submodule? 
        // Assuming it might be a part of scientific_management or a separate view not in sidebar yet.
        return <div>View not found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      <Sidebar 
        currentView={currentView}
        onViewChange={handleViewChange}
        schoolName={schoolInfo.school_name}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={handleToggleSidebar}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;