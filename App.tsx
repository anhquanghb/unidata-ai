import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardModule from './components/DashboardModule';
import DataStorageModule from './components/DataStorageModule';
import OrganizationModule from './components/OrganizationModule';
import FacultyModule from './components/FacultyModule';
import SettingsModule from './components/SettingsModule';
import IngestionModule from './components/IngestionModule';
import AnalysisModule from './components/AnalysisModule';
import VersionSelectorModal from './components/VersionSelectorModal';
import { 
  ViewState, Unit, HumanResourceRecord, Faculty, UserProfile, DataConfigGroup, 
  DynamicRecord, SystemSettings, AcademicYear, SchoolInfo, FacultyTitles, 
  GoogleDriveConfig, ScientificRecord, TrainingRecord, PersonnelRecord, 
  AdmissionRecord, ClassRecord, DepartmentRecord, BusinessRecord, PermissionProfile,
  Course
} from './types';

// Initial States
const initialSettings: SystemSettings = {
  currentAcademicYear: '2023-2024',
  extractionPrompt: '',
  analysisPrompt: '',
  permissionProfile: { role: 'school_admin', canEditDataConfig: true, canEditOrgStructure: true }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Core Data
  const [units, setUnits] = useState<Unit[]>([]);
  const [humanResources, setHumanResources] = useState<HumanResourceRecord[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([
      { id: 'ay-1', code: '2023-2024', isLocked: false }
  ]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({ school_name: 'University Name', school_code: 'UNI' });
  const [facultyTitles, setFacultyTitles] = useState<FacultyTitles>({ ranks: [], degrees: [], academicTitles: [], positions: [] });
  
  // Dynamic Data
  const [dataConfigGroups, setDataConfigGroups] = useState<DataConfigGroup[]>([]);
  const [dynamicDataStore, setDynamicDataStore] = useState<Record<string, DynamicRecord[]>>({});

  // Legacy/Static Records
  const [scientificRecords, setScientificRecords] = useState<ScientificRecord[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [personnelRecords, setPersonnelRecords] = useState<PersonnelRecord[]>([]);
  const [admissionRecords, setAdmissionRecords] = useState<AdmissionRecord[]>([]);
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  const [departmentRecords, setDepartmentRecords] = useState<DepartmentRecord[]>([]);
  const [businessRecords, setBusinessRecords] = useState<BusinessRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Drive Session & Modals
  const [driveSession, setDriveSession] = useState<GoogleDriveConfig>({ isConnected: false });
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  // Current User Mock
  const currentUser = users.find(u => u.isPrimary) || { 
      id: 'admin', username: 'admin', fullName: 'System Admin', 
      role: 'school_admin', isPrimary: true 
  };

  const hasUnsavedChanges = false; 

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

      // 3. Identify Related Users (NEW)
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
                  // Check Unit References against Data Scope
                  const hasUnitRef = unitRefFields.some(key => {
                      const val = record[key];
                      if (Array.isArray(val)) return val.some(v => dataScopeIds.has(v));
                      return dataScopeIds.has(val);
                  });
                  if (hasUnitRef) return true;

                  // Check Faculty References against Related Faculties
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
          managedUnitId: targetUnit.unit_id // Locked to this unit
      };

      const exportData = {
          exportType: "UNIT_PARTIAL",
          rootUnitName: targetUnit.unit_name,
          exportDate: new Date().toISOString(),
          settings: { ...safeSettings, permissionProfile: restrictedPermission }, // INJECT RESTRICTED PERMISSION
          units: filteredUnits,
          users: filteredUsers, // ADDED USERS
          humanResources: filteredHR,
          faculties: filteredFaculties,
          facultyTitles: facultyTitles, // ALWAYS INCLUDE FACULTY TITLES
          dataConfigGroups: dataConfigGroups, 
          dynamicDataStore: filteredDynamicStore,
          academicYears: academicYears, // Include Academic Years
          schoolInfo: schoolInfo // School Info (Public ID kept) is included for context
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

  // --- HANDLERS ---
  const handleUpdateDynamicData = (groupId: string, data: DynamicRecord[]) => {
      setDynamicDataStore(prev => ({ ...prev, [groupId]: data }));
  };

  const handleUpdateDataImport = (type: string, data: any[]) => {
      // Ingestion Logic
      if (type === 'SCIENTIFIC') setScientificRecords(prev => [...prev, ...data]);
      if (type === 'TRAINING') setTrainingRecords(prev => [...prev, ...data]);
      if (type === 'PERSONNEL') setPersonnelRecords(prev => [...prev, ...data]);
      if (type === 'ADMISSIONS') setAdmissionRecords(prev => [...prev, ...data]);
      if (type === 'CLASS') setClassRecords(prev => [...prev, ...data]);
      if (type === 'DEPARTMENT') setDepartmentRecords(prev => [...prev, ...data]);
      if (type === 'BUSINESS') setBusinessRecords(prev => [...prev, ...data]);
  };

  const handleImportSystemData = (data: any) => {
      if (data === 'RESET') {
          setUnits([]); setHumanResources([]); setFaculties([]); setUsers([]); 
          setDataConfigGroups([]); setDynamicDataStore({});
          return;
      }
      if (data.units) setUnits(data.units);
      if (data.humanResources) setHumanResources(data.humanResources);
      if (data.faculties) setFaculties(data.faculties);
      if (data.users) setUsers(data.users);
      if (data.dataConfigGroups) setDataConfigGroups(data.dataConfigGroups);
      if (data.dynamicDataStore) setDynamicDataStore(data.dynamicDataStore);
      if (data.settings) setSettings(data.settings);
      if (data.academicYears) setAcademicYears(data.academicYears);
      if (data.schoolInfo) setSchoolInfo(data.schoolInfo);
      if (data.facultyTitles) setFacultyTitles(data.facultyTitles);
      // Legacy
      if (data.scientificRecords) setScientificRecords(data.scientificRecords);
      if (data.trainingRecords) setTrainingRecords(data.trainingRecords);
      // ... others
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar 
        currentView={currentView}
        onViewChange={setCurrentView}
        schoolName={schoolInfo.school_name}
        currentAcademicYear={settings.currentAcademicYear}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveToCloud={() => {}} // Placeholder for cloud sync trigger
        onExportData={() => {}} // Placeholder for manual export
        isCloudConnected={driveSession.isConnected}
      />
      <main className="flex-1 overflow-auto relative">
        {currentView === 'dashboard' && (
            <DashboardModule 
                scientificRecords={scientificRecords} 
                faculties={faculties} 
                currentAcademicYear={settings.currentAcademicYear}
            />
        )}
        {currentView === 'scientific_management' && (
            <DataStorageModule 
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
            />
        )}
        {currentView === 'organization' && (
            <OrganizationModule 
                units={units}
                onUpdateUnits={setUnits}
                faculties={faculties}
                humanResources={humanResources}
                onUpdateHumanResources={setHumanResources}
                onExportUnitData={handleExportUnitData}
                permission={settings.permissionProfile}
            />
        )}
        {currentView === 'faculty_profiles' && (
            <FacultyModule 
                faculties={faculties}
                setFaculties={setFaculties}
                facultyTitles={facultyTitles}
                setFacultyTitles={setFacultyTitles}
                courses={courses}
                geminiConfig={{}}
                units={units}
                humanResources={humanResources}
                currentAcademicYear={settings.currentAcademicYear}
                permission={settings.permissionProfile}
            />
        )}
        {currentView === 'settings' && (
            <SettingsModule 
                settings={settings}
                driveSession={driveSession}
                users={users}
                currentUser={currentUser}
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
                onUpdateSettings={setSettings}
                onUpdateDriveSession={setDriveSession}
                onAddUser={(u) => setUsers([...users, u])}
                onUpdateUsers={setUsers}
                onRemoveUser={(id) => setUsers(users.filter(u => u.id !== id))}
                onAddAcademicYear={(y) => setAcademicYears([...academicYears, y])}
                onUpdateAcademicYear={(y) => setAcademicYears(academicYears.map(ay => ay.id === y.id ? y : ay))}
                onDeleteAcademicYear={(id) => setAcademicYears(academicYears.filter(ay => ay.id !== id))}
                onToggleLockAcademicYear={(id) => setAcademicYears(academicYears.map(ay => ay.id === id ? { ...ay, isLocked: !ay.isLocked } : ay))}
                onImportData={handleImportSystemData}
                onUpdateSchoolInfo={setSchoolInfo}
                onShowVersions={() => setIsVersionModalOpen(true)}
                onResetSystemData={() => handleImportSystemData('RESET')}
            />
        )}
        {/* Legacy Ingestion View if needed, or mapped via 'scientific_management' */}
        {/* ... */}
      </main>

      {isVersionModalOpen && (
          <VersionSelectorModal 
              isOpen={isVersionModalOpen}
              driveConfig={driveSession}
              onImportData={handleImportSystemData}
              onClose={() => setIsVersionModalOpen(false)}
              currentData={{
                  units, humanResources, faculties, users, dataConfigGroups, 
                  dynamicDataStore, settings, academicYears, schoolInfo
              }}
          />
      )}
    </div>
  );
};

export default App;
