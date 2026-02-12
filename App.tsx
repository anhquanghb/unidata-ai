import React, { useState, useMemo, useEffect } from 'react';
import { ViewState, UniversityReport, Unit, SystemSettings, UserProfile, AcademicYear, SchoolInfo, ScientificRecord, BackupVersion, TrainingRecord, PersonnelRecord, AdmissionRecord, ClassRecord, DepartmentRecord, BusinessRecord, Faculty, FacultyTitles, Course, HumanResourceRecord, DataConfigGroup, DynamicRecord, GoogleDriveConfig } from './types';
import Sidebar from './components/Sidebar';
import DashboardModule from './components/DashboardModule';
import IngestionModule from './components/IngestionModule';
import AnalysisModule from './components/AnalysisModule';
import DataStorageModule from './components/DataStorageModule';
import OrganizationModule from './components/OrganizationModule';
import SettingsModule from './components/SettingsModule';
import FacultyModule from './components/FacultyModule';
import VersionSelectorModal from './components/VersionSelectorModal';
import { v4 as uuidv4 } from 'uuid';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

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

// Mock Scientific Records
const INITIAL_SCIENTIFIC_RECORDS: ScientificRecord[] = [
  {
    id: uuidv4(),
    lecturerName: "Nguyễn Văn An",
    recordName: "Nghiên cứu ứng dụng Blockchain trong quản lý đào tạo",
    academicYear: "2023-2024",
    requestSupport: true,
    type: "Bài báo ISI/SCOPUS",
    link: "https://drive.google.com/file/d/..."
  },
  {
    id: uuidv4(),
    lecturerName: "Trần Thị Bình",
    recordName: "Giải nhất Olympic Tin học Sinh viên",
    academicYear: "2023-2024",
    requestSupport: false,
    type: "Hướng dẫn sinh viên đạt giải thưởng",
    link: ""
  }
];

// Mock Faculty Data (Dao Anh Quang)
const INITIAL_FACULTIES: Faculty[] = [
  {
  "id": "f-265311016",
  "name": { "vi": "Đào Anh Quang", "en": "Dao Anh Quang" },
  "rank": { "vi": "Giảng viên", "en": "Lecturer" },
  "degree": { "vi": "Tiến sĩ", "en": "Doctor of Philosophy" },
  "academicTitle": { "vi": "", "en": "" },
  "position": { "vi": "Phó trưởng khoa Môi trường và Khoa học tự nhiên", "en": "Vice Dean of Faculty of Environment and Natural Sciences" },
  "experience": { "vi": "11", "en": "11" },
  "careerStartYear": 2015,
  "dob": "",
  "office": "Phòng 306C, CS Hòa Khánh, Đại học Duy Tân",
  "tel": "(0888).792.661",
  "cell": "(+84) 888 79 2661",
  "email": "daoanhquang@duytan.edu.vn",
  "educationList": [
    {
      "id": "edu-1",
      "degree": { "vi": "Tiến sĩ kỹ thuật", "en": "Doctor of Philosophy in Engineering" },
      "discipline": { "vi": "Hóa học và Vật lý vật liệu", "en": "Chemistry and Material Physics" },
      "institution": { "vi": "Trường Đại học Khoa học Kỹ thuật Huazhong, Trung Quốc", "en": "Huazhong University of Science and Technology, China" },
      "year": "2015"
    },
    {
      "id": "edu-2",
      "degree": { "vi": "Thạc sĩ giáo dục học", "en": "Master of Education" },
      "discipline": { "vi": "Phương pháp giảng dạy môn Hóa học", "en": "Chemistry Teaching Methodology" },
      "institution": { "vi": "Đại học Huế, Việt Nam", "en": "Hue University, Vietnam" },
      "year": "2009"
    }
  ],
  "academicExperienceList": [
    {
      "id": "ae-1",
      "institution": { "vi": "Trường Công nghệ, Trường Đại học Duy Tân", "en": "School of Technology, Duy Tan University" },
      "rank": { "vi": "Quản lý & Giảng dạy", "en": "Management & Teaching" },
      "title": { "vi": "Phó trưởng khoa Môi trường và khoa học tự nhiên", "en": "Vice Dean of Faculty of Environment and Natural Sciences" },
      "period": "2022 - Nay",
      "isFullTime": true
    }
  ],
  "nonAcademicExperienceList": [],
  "publicationsList": [
     {
      "id": "pub-1",
      "text": {
        "vi": "Nguyen Minh Quang, et al., 'Chemometrically optimized electrochemical decoupling...', Journal of Electroanalytical Chemistry, 2026.",
        "en": "Nguyen Minh Quang, et al., 'Chemometrically optimized electrochemical decoupling...', Journal of Electroanalytical Chemistry, 2026."
      }
    }
  ],
  "certificationsList": [],
  "honorsList": [],
  "serviceActivitiesList": [],
  "professionalDevelopmentList": [],
  "membershipsList": [
     {
      "id": "mem-1",
      "content": { "vi": "Thành viên Hiệp hội CDIO", "en": "Member of CDIO Association" }
    }
  ]
 }
];

const INITIAL_TITLES: FacultyTitles = {
    ranks: [
      { id: "r1", name: { vi: "Giảng viên", en: "Lecturer" }, abbreviation: { vi: "GV", en: "Lec" } },
      { id: "r2", name: { vi: "Giảng viên cao cấp", en: "Senior Lecturer" }, abbreviation: { vi: "GVC", en: "Snr Lec" } },
      { id: "r3", name: { vi: "Trợ giảng", en: "Teaching Assistant" }, abbreviation: { vi: "TG", en: "TA" } },
      { id: "r4", name: { vi: "Chuyên viên", en: "Specialist" }, abbreviation: { vi: "CV", en: "Spec" } },
      { id: "r5", name: { vi: "Kỹ thuật viên", en: "Technician" }, abbreviation: { vi: "KTV", en: "Tech" } }
    ],
    degrees: [
      { id: "d1", name: { vi: "Tiến sĩ", en: "Ph.D" }, abbreviation: { vi: "TS", en: "PhD" } },
      { id: "d2", name: { vi: "Thạc sĩ", en: "Master" }, abbreviation: { vi: "ThS", en: "MA/MSc" } },
      { id: "d3", name: { vi: "Kỹ sư", en: "Engineer" }, abbreviation: { vi: "KS", en: "Eng" } },
      { id: "d4", name: { vi: "Cử nhân", en: "Bachelor" }, abbreviation: { vi: "CN", en: "BA/BSc" } }
    ],
    academicTitles: [
      { id: "at1", name: { vi: "Không", en: "None" }, abbreviation: { vi: "", en: "" } },
      { id: "at2", name: { vi: "Giáo sư", en: "Professor" }, abbreviation: { vi: "GS", en: "Prof" } },
      { id: "at3", name: { vi: "Phó giáo sư", en: "Associate Professor" }, abbreviation: { vi: "PGS", en: "Assoc. Prof" } }
    ],
    positions: [
      { id: "p1", name: { vi: "Giảng viên", en: "Faculty Member" }, abbreviation: { vi: "GV", en: "Fac" } },
      { id: "p2", name: { vi: "Trưởng khoa", en: "Dean" }, abbreviation: { vi: "TK", en: "Dean" } },
      { id: "p3", name: { vi: "Phó trưởng khoa", en: "Vice Dean" }, abbreviation: { vi: "PTK", en: "V.Dean" } },
      { id: "p4", name: { vi: "Trưởng bộ môn", en: "Head of Department" }, abbreviation: { vi: "TBM", en: "HoD" } },
      { id: "pos-1768969239310", name: { vi: "Nghiên cứu viên", en: "Researcher" }, abbreviation: { vi: "NCV", en: "Res" } },
      { id: "pos-1768970272946", name: { vi: "Giảng viên thỉnh giảng", en: "Invited lecturer" }, abbreviation: { vi: "TG", en: "Inv" } }
    ]
};

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

// Initial Human Resources Data
const INITIAL_HR_RECORDS: HumanResourceRecord[] = [
    {
        id: uuidv4(),
        unitId: FACULTY_ENV_ID,
        facultyId: "f-265311016", // Dao Anh Quang
        role: "Phó trưởng khoa"
    }
];

// Initial Data Config Groups (Example: Scientific Research)
const SCIENTIFIC_GROUP_ID = uuidv4();
const INITIAL_DATA_CONFIGS: DataConfigGroup[] = [
  {
    id: SCIENTIFIC_GROUP_ID,
    name: "Quản lý Đề tài Nghiên cứu",
    description: "Cấu hình trường dữ liệu cho đề tài các cấp",
    fields: [
      { id: uuidv4(), key: "topicName", label: "Tên đề tài", type: "text", required: true },
      { id: uuidv4(), key: "budget", label: "Kinh phí (VNĐ)", type: "number_int", required: false },
      { id: uuidv4(), key: "startDate", label: "Năm bắt đầu", type: "number_int", required: true },
      { 
        id: uuidv4(), 
        key: "status", 
        label: "Trạng thái", 
        type: "select_single", 
        required: true,
        options: [
          { id: "opt1", label: "Đang thực hiện", value: "ongoing" },
          { id: "opt2", label: "Đã nghiệm thu", value: "completed" },
          { id: "opt3", label: "Đã thanh lý", value: "cancelled" }
        ]
      },
      { id: uuidv4(), key: "leadUnit", label: "Đơn vị chủ trì", type: "reference", required: true, referenceTarget: "units" },
      { id: uuidv4(), key: "contractFile", label: "Hợp đồng (Scan)", type: "file", required: false }
    ],
    charts: [
        { id: uuidv4(), title: 'Tổng Kinh phí theo Năm', type: 'line', xAxisField: 'startDate', yAxisField: 'budget' },
        { id: uuidv4(), title: 'Số lượng theo Trạng thái', type: 'pie', categoryField: 'status' }
    ]
  }
];

// Mock data for the dynamic group
const INITIAL_DYNAMIC_DATA: Record<string, DynamicRecord[]> = {
    [SCIENTIFIC_GROUP_ID]: [
        { id: uuidv4(), topicName: "AI Research 2023", budget: 50000000, startDate: 2023, status: "completed", leadUnit: FACULTY_ENV_ID, academicYear: "2023-2024" },
        { id: uuidv4(), topicName: "Blockchain Edu", budget: 120000000, startDate: 2024, status: "ongoing", leadUnit: FACULTY_EE_ID, academicYear: "2023-2024" },
        { id: uuidv4(), topicName: "Smart City IoT", budget: 80000000, startDate: 2023, status: "ongoing", leadUnit: FACULTY_EE_ID, academicYear: "2023-2024" },
        { id: uuidv4(), topicName: "Green Energy", budget: 30000000, startDate: 2022, status: "cancelled", leadUnit: FACULTY_ENV_ID, academicYear: "2022-2023" }
    ]
};

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
  virtualAssistantUrl: "https://gemini.google.com/app",
  // driveConfig has been removed from SystemSettings
};

const INITIAL_DRIVE_SESSION: GoogleDriveConfig = {
    isConnected: false,
    folderId: "",
    folderName: "UniData_Backups"
};

const INITIAL_SCHOOL_INFO: SchoolInfo = {
  name: "Trường Công nghệ và Kỹ thuật",
  code: "SET"
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [reports, setReports] = useState<UniversityReport[]>(INITIAL_REPORTS);
  const [scientificRecords, setScientificRecords] = useState<ScientificRecord[]>(INITIAL_SCIENTIFIC_RECORDS);
  
  // State for all other data modules
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [personnelRecords, setPersonnelRecords] = useState<PersonnelRecord[]>([]);
  const [admissionRecords, setAdmissionRecords] = useState<AdmissionRecord[]>([]);
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  const [departmentRecords, setDepartmentRecords] = useState<DepartmentRecord[]>([]);
  const [businessRecords, setBusinessRecords] = useState<BusinessRecord[]>([]);

  // State for Faculty Module
  const [faculties, setFaculties] = useState<Faculty[]>(INITIAL_FACULTIES);
  const [facultyTitles, setFacultyTitles] = useState<FacultyTitles>(INITIAL_TITLES);
  // Dummy courses state for Faculty Module stats context
  const [courses, setCourses] = useState<Course[]>([]);

  // State for Human Resources (Organization Module)
  const [humanResources, setHumanResources] = useState<HumanResourceRecord[]>(INITIAL_HR_RECORDS);
  
  // State for Data Configuration Module (DYNAMIC)
  const [dataConfigGroups, setDataConfigGroups] = useState<DataConfigGroup[]>(INITIAL_DATA_CONFIGS);
  const [dynamicDataStore, setDynamicDataStore] = useState<Record<string, DynamicRecord[]>>(INITIAL_DYNAMIC_DATA);

  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(INITIAL_ACADEMIC_YEARS);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(INITIAL_SCHOOL_INFO);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Runtime Drive Session State (Not persisted in settings)
  const [driveSession, setDriveSession] = useState<GoogleDriveConfig>(INITIAL_DRIVE_SESSION);

  // Cloud/Version State
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [backupVersions, setBackupVersions] = useState<BackupVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (driveSession.isConnected && driveSession.folderId) {
        // Trigger modal opening on fresh load if needed, or user action
        setIsVersionModalOpen(true);
    }
  }, [driveSession.isConnected, driveSession.folderId]);

  const handleVersionConfirm = async (versionId: string, customFileId?: string) => {
      // If versionId is empty and no customFileId, it means "Fresh Start"
      if (!versionId && !customFileId) {
          setIsVersionModalOpen(false);
          return;
      }

      const fileId = customFileId || versionId;
      const accessToken = driveSession.accessToken;
      if (!accessToken) {
          alert("Không tìm thấy Access Token. Vui lòng kết nối lại Google Drive.");
          return;
      }

      try {
          setIsLoadingVersions(true);

          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const backupData = await response.json();

          if (!backupData.version && !backupData.reports && !backupData.users) {
             throw new Error("File không đúng định dạng dữ liệu hệ thống UniData.");
          }

          handleImportData(backupData);

          alert(`Khôi phục dữ liệu thành công!`);
          setIsVersionModalOpen(false);

      } catch (error: any) {
          console.error("Lỗi khi tải bản sao lưu:", error);
          alert("Lỗi khi tải dữ liệu từ Google Drive: " + (error.message || error));
      } finally {
          setIsLoadingVersions(false);
      }
  };


  // --- GLOBAL STATE DERIVATION ---
  
  const currentAcademicYearObj = useMemo(() => 
    academicYears.find(y => y.code === settings.currentAcademicYear), 
    [academicYears, settings.currentAcademicYear]
  );

  const isCurrentYearLocked = currentAcademicYearObj ? currentAcademicYearObj.isLocked : false;

  const filteredReports = useMemo(() => 
    reports.filter(r => r.academicYear === settings.currentAcademicYear),
    [reports, settings.currentAcademicYear]
  );
  
  const filteredScientificRecords = useMemo(() => 
    scientificRecords.filter(r => r.academicYear === settings.currentAcademicYear),
    [scientificRecords, settings.currentAcademicYear]
  );

  // --- Current Data Snapshot for Syncing ---
  const currentDataSnapshot = useMemo(() => ({
      units,
      reports,
      scientificRecords,
      trainingRecords,
      personnelRecords,
      admissionRecords,
      classRecords,
      departmentRecords,
      businessRecords,
      faculties,
      humanResources,
      dataConfigGroups,
      dynamicDataStore,
      users,
      settings,
      academicYears,
      schoolInfo
  }), [units, reports, scientificRecords, trainingRecords, personnelRecords, admissionRecords, classRecords, departmentRecords, businessRecords, faculties, humanResources, dataConfigGroups, dynamicDataStore, users, settings, academicYears, schoolInfo]);


  // --- HANDLERS ---

  const handleDataExtracted = (newReport: UniversityReport) => {
    setReports(prev => [newReport, ...prev]);
    setCurrentView('scientific_management'); 
  };
  
  const handleDataImport = (type: string, data: any[]) => {
      switch (type) {
          case 'SCIENTIFIC':
              setScientificRecords(prev => [...data, ...prev]);
              break;
          case 'TRAINING':
              setTrainingRecords(prev => [...data, ...prev]);
              break;
          case 'PERSONNEL':
              setPersonnelRecords(prev => [...data, ...prev]);
              break;
          case 'ADMISSIONS':
              setAdmissionRecords(prev => [...data, ...prev]);
              break;
          case 'CLASS':
              setClassRecords(prev => [...data, ...prev]);
              break;
          case 'DEPARTMENT':
              setDepartmentRecords(prev => [...data, ...prev]);
              break;
          case 'BUSINESS':
              setBusinessRecords(prev => [...data, ...prev]);
              break;
          default:
              console.warn("Unknown import type:", type);
      }
  };
  
  const handleAddScientificRecord = (record: ScientificRecord) => {
    setScientificRecords(prev => [record, ...prev]);
  };

  const handleDeleteScientificRecord = (id: string) => {
    setScientificRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleAddUnit = (unit: Unit) => {
    setUnits([...units, unit]);
  };

  const handleUpdateUnit = (updatedUnit: Unit) => {
    setUnits(units.map(u => u.id === updatedUnit.id ? updatedUnit : u));
  };

  const handleRemoveUnit = (id: string) => {
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

  const handleAddAcademicYear = (year: AcademicYear) => {
    setAcademicYears([...academicYears, year]);
  };

  const handleUpdateAcademicYear = (updatedYear: AcademicYear) => {
    const oldYear = academicYears.find(y => y.id === updatedYear.id);
    setAcademicYears(academicYears.map(y => y.id === updatedYear.id ? updatedYear : y));
    
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
    // Restore Core Data
    if (data.reports) setReports(data.reports);
    if (data.units) setUnits(data.units);
    if (data.users) setUsers(data.users);
    if (data.academicYears) setAcademicYears(data.academicYears);
    
    // Restore settings (without overwriting drive session)
    if (data.settings) {
        setSettings(data.settings);
    }
    
    if (data.schoolInfo) setSchoolInfo(data.schoolInfo);

    // Restore Record Data
    if (data.scientificRecords) setScientificRecords(data.scientificRecords);
    if (data.trainingRecords) setTrainingRecords(data.trainingRecords);
    if (data.personnelRecords) setPersonnelRecords(data.personnelRecords);
    if (data.admissionRecords) setAdmissionRecords(data.admissionRecords);
    if (data.classRecords) setClassRecords(data.classRecords);
    if (data.departmentRecords) setDepartmentRecords(data.departmentRecords);
    if (data.businessRecords) setBusinessRecords(data.businessRecords);

    // Restore Faculty Module Data
    if (data.faculties) setFaculties(data.faculties);
    if (data.facultyTitles) setFacultyTitles(data.facultyTitles);
    if (data.humanResources) setHumanResources(data.humanResources);
    
    // Restore Data Config & Dynamic Data
    if (data.dataConfigGroups) setDataConfigGroups(data.dataConfigGroups);
    if (data.dynamicDataStore) setDynamicDataStore(data.dynamicDataStore);
  };

  const handleResetSystemData = () => {
      // Clear all business data
      setReports([]);
      setScientificRecords([]);
      setTrainingRecords([]);
      setPersonnelRecords([]);
      setAdmissionRecords([]);
      setClassRecords([]);
      setDepartmentRecords([]);
      setBusinessRecords([]);
      setFaculties([]);
      setHumanResources([]);
      setDynamicDataStore({});
      
      // Reset Organization/System data to defaults or empty
      setUnits([]); 
      setUsers([]);
      setAcademicYears(INITIAL_ACADEMIC_YEARS); // Keep default years to avoid UI crash
      
      // Reset Settings
      setSettings(INITIAL_SETTINGS); 
      setSchoolInfo(INITIAL_SCHOOL_INFO);
      
      // Reset Drive Session (Disconnect)
      setDriveSession(INITIAL_DRIVE_SESSION);

      // Force Clear Cache
      localStorage.clear();
  };

  const handleUpdateSchoolInfo = (info: SchoolInfo) => {
    setSchoolInfo(info);
  }

  // --- Dynamic Data Handlers ---
  const handleUpdateDynamicData = (groupId: string, data: DynamicRecord[]) => {
      setDynamicDataStore(prev => ({
          ...prev,
          [groupId]: data
      }));
  };

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
            onDataImport={handleDataImport}
            academicYears={academicYears}
            currentAcademicYearCode={settings.currentAcademicYear}
            isLocked={isCurrentYearLocked}
            virtualAssistantUrl={settings.virtualAssistantUrl}
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
            // Generic props
            isLocked={isCurrentYearLocked}
            currentAcademicYear={settings.currentAcademicYear}
            // Dynamic Data Props
            dataConfigGroups={dataConfigGroups}
            dynamicDataStore={dynamicDataStore}
            onUpdateDynamicData={handleUpdateDynamicData}
            onUpdateDataConfigGroups={setDataConfigGroups} // To save chart configs
            // Context for Lookups
            units={units}
            faculties={faculties}
            academicYears={academicYears}
            // Drive Session (New)
            driveConfig={driveSession}
          />
        );
      case 'faculty_profiles':
        return (
          <FacultyModule 
             faculties={faculties}
             setFaculties={setFaculties}
             facultyTitles={facultyTitles}
             setFacultyTitles={setFacultyTitles}
             courses={courses}
             geminiConfig={{ apiKey: (import.meta as any).env?.API_KEY }}
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
            faculties={faculties}
            humanResources={humanResources}
            onUpdateHumanResources={setHumanResources}
          />
        );
      case 'settings':
        return (
          <SettingsModule
            // Core
            reports={reports}
            units={units}
            settings={settings}
            driveSession={driveSession} // Passed separately
            users={users}
            academicYears={academicYears}
            schoolInfo={schoolInfo}
            // Records
            scientificRecords={scientificRecords}
            trainingRecords={trainingRecords}
            personnelRecords={personnelRecords}
            admissionRecords={admissionRecords}
            classRecords={classRecords}
            departmentRecords={departmentRecords}
            businessRecords={businessRecords}
            // Data Config
            dataConfigGroups={dataConfigGroups}
            onUpdateDataConfigGroups={setDataConfigGroups}
            // Handlers
            onUpdateSettings={setSettings}
            onUpdateDriveSession={setDriveSession} // Handler for session updates
            onAddUser={handleAddUser}
            onRemoveUser={handleRemoveUser}
            onAddAcademicYear={handleAddAcademicYear}
            onUpdateAcademicYear={handleUpdateAcademicYear}
            onDeleteAcademicYear={handleDeleteAcademicYear}
            onToggleLockAcademicYear={handleToggleLockAcademicYear}
            onImportData={handleImportData}
            onUpdateSchoolInfo={handleUpdateSchoolInfo}
            onShowVersions={() => setIsVersionModalOpen(true)}
            onResetSystemData={handleResetSystemData}
          />
        );
      default:
        return <DashboardModule reports={filteredReports} currentAcademicYear={settings.currentAcademicYear} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
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

      {/* Version Selector Modal */}
      <VersionSelectorModal 
        isOpen={isVersionModalOpen}
        onConfirm={handleVersionConfirm}
        onImportData={handleImportData}
        onClose={() => setIsVersionModalOpen(false)}
        driveConfig={driveSession}
        currentData={currentDataSnapshot}
      />
    </div>
  );
};

export default App;