import React, { useState, useMemo } from 'react';
import { ViewState, UniversityReport, Unit, SystemSettings, UserProfile, AcademicYear, SchoolInfo } from './types';
import Sidebar from './components/Sidebar';
import DashboardModule from './components/DashboardModule';
import IngestionModule from './components/IngestionModule';
import AnalysisModule from './components/AnalysisModule';
import DataStorageModule from './components/DataStorageModule';
import OrganizationModule from './components/OrganizationModule';
import SettingsModule from './components/SettingsModule';
import { v4 as uuidv4 } from 'uuid';

// Mock initial data
const INITIAL_REPORTS: UniversityReport[] = [
  {
    id: uuidv4(),
    unitName: "Viện Công nghệ Thông tin",
    academicYear: "2023-2024",
    personnel: { professors: 2, associateProfessors: 5, phd: 20, masters: 15 },
    publications: { isi: 15, scopus: 25, domestic: 40, otherInternational: 5 },
    projects: { assigned: 5, ongoing: 12, completed: 4 },
    qualitative: {
      researchDirections: ["Trí tuệ nhân tạo", "Khoa học dữ liệu", "An toàn thông tin"],
      difficulties: ["Thiếu phòng lab chuyên sâu"],
      proposals: ["Đầu tư máy chủ GPU"]
    },
    extractionDate: new Date().toISOString()
  },
  {
    id: uuidv4(),
    unitName: "Khoa Điện tử Viễn thông",
    academicYear: "2023-2024",
    personnel: { professors: 1, associateProfessors: 8, phd: 18, masters: 10 },
    publications: { isi: 10, scopus: 20, domestic: 30, otherInternational: 2 },
    projects: { assigned: 3, ongoing: 8, completed: 2 },
    qualitative: {
      researchDirections: ["IoT", "Vi mạch bán dẫn", "5G/6G"],
      difficulties: [],
      proposals: []
    },
    extractionDate: new Date().toISOString()
  },
  {
    id: uuidv4(),
    unitName: "Viện Kinh tế và Quản lý",
    academicYear: "2023-2024",
    personnel: { professors: 3, associateProfessors: 10, phd: 35, masters: 20 },
    publications: { isi: 8, scopus: 15, domestic: 60, otherInternational: 10 },
    projects: { assigned: 10, ongoing: 15, completed: 8 },
    qualitative: {
      researchDirections: ["Kinh tế số", "Quản trị chuỗi cung ứng"],
      difficulties: ["Khó tuyển sinh viên quốc tế"],
      proposals: []
    },
    extractionDate: new Date().toISOString()
  }
];

// IDs for initial linking
const FACULTY_ENV_ID = uuidv4();
const FACULTY_EE_ID = uuidv4();

const INITIAL_UNITS: Unit[] = [
  // Khoa Môi trường và Khoa học tự nhiên
  { id: FACULTY_ENV_ID, name: "Khoa Môi trường và Khoa học tự nhiên", code: "FENS", type: "faculty" },
  { id: uuidv4(), name: "Bộ môn Khoa học môi trường", code: "BM-KHMT", type: "department", parentId: FACULTY_ENV_ID },
  { id: uuidv4(), name: "Bộ môn Hóa học", code: "BM-HH", type: "department", parentId: FACULTY_ENV_ID },

  // Khoa Điện - Điện tử
  { id: FACULTY_EE_ID, name: "Khoa Điện - Điện tử", code: "FEEE", type: "faculty" },
  { id: uuidv4(), name: "Bộ môn Tự động hóa", code: "BM-TDH", type: "department", parentId: FACULTY_EE_ID },
  { id: uuidv4(), name: "Bộ môn Hệ thống điện", code: "BM-HTD", type: "department", parentId: FACULTY_EE_ID },
];

const INITIAL_USERS: UserProfile[] = [
  { id: uuidv4(), fullName: "Nguyễn Văn Admin", username: "admin", role: "admin" },
  { id: uuidv4(), fullName: "Trần Thị Thư Ký", username: "staff01", role: "staff" },
];

const INITIAL_ACADEMIC_YEARS: AcademicYear[] = [
  { id: uuidv4(), code: "2023-2024", isLocked: false },
  { id: uuidv4(), code: "2022-2023", isLocked: true },
];

const DEFAULT_EXTRACTION_PROMPT = `Phân tích văn bản báo cáo hành chính sau đây và trích xuất dữ liệu thống kê vào định dạng JSON.
      
Văn bản báo cáo:
{{text}}`;

const DEFAULT_ANALYSIS_PROMPT = `Bạn là một chuyên gia phân tích dữ liệu đại học (UniData Analyst). 
Dưới đây là dữ liệu tổng hợp từ các báo cáo của các đơn vị trong trường:
{{data}}

Câu hỏi của người dùng: "{{query}}"

Hãy phân tích dữ liệu trên để trả lời câu hỏi. Nếu là câu hỏi dự báo, hãy đưa ra lập luận dựa trên xu hướng dữ liệu hiện tại. Trả lời bằng tiếng Việt chuyên nghiệp, ngắn gọn, súc tích.`;

const INITIAL_SETTINGS: SystemSettings = {
  currentAcademicYear: "2023-2024",
  extractionPrompt: DEFAULT_EXTRACTION_PROMPT,
  analysisPrompt: DEFAULT_ANALYSIS_PROMPT,
};

const INITIAL_SCHOOL_INFO: SchoolInfo = {
  name: "Trường Công nghệ và Kỹ thuật",
  code: "SET"
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [reports, setReports] = useState<UniversityReport[]>(INITIAL_REPORTS);
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(INITIAL_ACADEMIC_YEARS);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(INITIAL_SCHOOL_INFO);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // --- GLOBAL STATE DERIVATION ---
  
  // 1. Get current active year object
  const currentAcademicYearObj = useMemo(() => 
    academicYears.find(y => y.code === settings.currentAcademicYear), 
    [academicYears, settings.currentAcademicYear]
  );

  // 2. Check if locked
  const isCurrentYearLocked = currentAcademicYearObj ? currentAcademicYearObj.isLocked : false;

  // 3. Filter reports by current year for ALL modules
  const filteredReports = useMemo(() => 
    reports.filter(r => r.academicYear === settings.currentAcademicYear),
    [reports, settings.currentAcademicYear]
  );


  // --- HANDLERS ---

  const handleDataExtracted = (newReport: UniversityReport) => {
    setReports(prev => [newReport, ...prev]);
    setCurrentView('scientific_management'); 
  };

  const handleAddUnit = (unit: Unit) => {
    setUnits([...units, unit]);
  };

  const handleUpdateUnit = (updatedUnit: Unit) => {
    setUnits(units.map(u => u.id === updatedUnit.id ? updatedUnit : u));
  };

  const handleRemoveUnit = (id: string) => {
    // Enhanced to delete children for this demo:
    const deleteIds = new Set([id]);
    const findChildren = (parentId: string) => {
      units.forEach(u => {
        if (u.parentId === parentId) {
          deleteIds.add(u.id);
          findChildren(u.id);
        }
      });
    };
    findChildren(id);
    setUnits(units.filter(u => !deleteIds.has(u.id)));
  };

  const handleAddUser = (user: UserProfile) => {
    setUsers([...users, user]);
  };

  const handleRemoveUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  // Academic Year Handlers
  const handleAddAcademicYear = (year: AcademicYear) => {
    setAcademicYears([...academicYears, year]);
  };

  const handleUpdateAcademicYear = (updatedYear: AcademicYear) => {
    const oldYear = academicYears.find(y => y.id === updatedYear.id);
    setAcademicYears(academicYears.map(y => y.id === updatedYear.id ? updatedYear : y));
    
    // If we renamed the current active year, update settings
    if (oldYear && oldYear.code === settings.currentAcademicYear && oldYear.code !== updatedYear.code) {
      setSettings(prev => ({
        ...prev,
        currentAcademicYear: updatedYear.code
      }));
    }
  };

  const handleDeleteAcademicYear = (id: string) => {
    setAcademicYears(academicYears.filter(y => y.id !== id));
  };

  const handleToggleLockAcademicYear = (id: string) => {
    setAcademicYears(academicYears.map(y => 
      y.id === id ? { ...y, isLocked: !y.isLocked } : y
    ));
  };

  const handleImportData = (data: any) => {
    if (data.reports) setReports(data.reports);
    if (data.units) setUnits(data.units);
    if (data.users) setUsers(data.users);
    if (data.academicYears) setAcademicYears(data.academicYears);
    if (data.settings) setSettings(data.settings);
    if (data.schoolInfo) setSchoolInfo(data.schoolInfo);
  };

  const handleUpdateSchoolInfo = (info: SchoolInfo) => {
    setSchoolInfo(info);
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardModule 
            reports={filteredReports} 
            currentAcademicYear={settings.currentAcademicYear}
          />
        );
      case 'ingestion':
        return (
          <IngestionModule 
            onDataExtracted={handleDataExtracted} 
            customPrompt={settings.extractionPrompt}
            academicYears={academicYears}
            currentAcademicYearCode={settings.currentAcademicYear}
            isLocked={isCurrentYearLocked}
          />
        );
      case 'analysis':
        return (
          <AnalysisModule 
            reports={filteredReports} 
            customPrompt={settings.analysisPrompt}
          />
        );
      case 'scientific_management':
        return (
          <DataStorageModule 
            reports={filteredReports} 
            isLocked={isCurrentYearLocked}
            currentAcademicYear={settings.currentAcademicYear}
          />
        );
      case 'organization':
        return (
          <OrganizationModule 
            units={units}
            onAddUnit={handleAddUnit}
            onUpdateUnit={handleUpdateUnit}
            onRemoveUnit={handleRemoveUnit}
            isLocked={isCurrentYearLocked}
          />
        );
      case 'settings':
        return (
          <SettingsModule
            reports={reports}
            units={units}
            settings={settings}
            users={users}
            academicYears={academicYears}
            schoolInfo={schoolInfo}
            onUpdateSettings={setSettings}
            onAddUser={handleAddUser}
            onRemoveUser={handleRemoveUser}
            onAddAcademicYear={handleAddAcademicYear}
            onUpdateAcademicYear={handleUpdateAcademicYear}
            onDeleteAcademicYear={handleDeleteAcademicYear}
            onToggleLockAcademicYear={handleToggleLockAcademicYear}
            onImportData={handleImportData}
            onUpdateSchoolInfo={handleUpdateSchoolInfo}
          />
        );
      default:
        return <DashboardModule reports={filteredReports} currentAcademicYear={settings.currentAcademicYear} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        schoolName={schoolInfo.name}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <main className="flex-1 overflow-y-auto transition-all duration-300">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
