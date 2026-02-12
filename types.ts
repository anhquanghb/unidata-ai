export interface PersonnelStats {
  professors: number;
  associateProfessors: number;
  phd: number;
  masters: number;
}

export interface PublicationStats {
  isi: number;
  scopus: number;
  domestic: number;
  otherInternational: number;
}

export interface ProjectStats {
  assigned: number;
  ongoing: number;
  completed: number;
}

export interface QualitativeData {
  researchDirections: string[];
  difficulties: string[];
  proposals: string[];
}

export interface UniversityReport {
  id: string;
  unitName: string; // Tên Khoa/Viện
  academicYear: string;
  personnel: PersonnelStats;
  publications: PublicationStats;
  projects: ProjectStats;
  qualitative: QualitativeData;
  extractionDate: string;
}

// --- Data Management Interfaces ---

export interface ScientificRecord {
  id: string;
  lecturerName: string;
  recordName: string;
  academicYear: string;
  requestSupport: boolean;
  type: string;
  link?: string;
  unitId?: string;
}

export interface TrainingRecord {
  id: string;
  programName: string; // Tên chương trình/học phần
  level: string; // Đại học, Sau đại học
  status: string; // Đang tuyển sinh, Đang đào tạo
  studentsCount: number;
  academicYear: string;
}

export interface PersonnelRecord {
  id: string;
  fullName: string;
  title: string; // Học hàm/Học vị
  position: string; // Chức vụ
  department: string; // Bộ môn/Phòng
  startDate: string;
  academicYear: string;
}

export interface AdmissionRecord {
  id: string;
  major: string; // Ngành
  quota: number; // Chỉ tiêu
  applications: number; // Số hồ sơ
  admitted: number; // Trúng tuyển
  score: number; // Điểm chuẩn
  academicYear: string;
}

export interface ClassRecord {
  id: string;
  className: string;
  advisor: string;
  monitor: string; // Lớp trưởng
  size: number;
  academicYear: string;
}

export interface DepartmentRecord {
  id: string;
  activityName: string;
  date: string;
  attendees: number;
  description: string;
  academicYear: string;
}

export interface BusinessRecord {
  id: string;
  partnerName: string;
  activityType: string; // MOU, Tài trợ, Thực tập
  value?: string; // Giá trị hợp đồng/tài trợ
  status: string;
  academicYear: string;
}

// --- System Interfaces ---

export interface Unit {
  id: string;
  name: string;
  code: string;
  type: 'school' | 'faculty' | 'department';
  parentId?: string;
}

// NEW: Data structure for linking Faculty to Units
export interface HumanResourceRecord {
  id: string;
  unitId: string;
  facultyId: string;
  role?: string; // Optional: Trưởng khoa, nhân viên, etc.
  assignedDate?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'staff';
  unitId?: string;
}

export interface AcademicYear {
  id: string;
  code: string;
  isLocked: boolean;
}

export interface SchoolInfo {
  name: string;
  code: string;
}

export interface GoogleDriveConfig {
  isConnected: boolean;
  clientId?: string; // Required for real OAuth
  accessToken?: string; // Session token
  accountName?: string;
  folderId: string;
  folderName: string;
  dataFolderId?: string; // Sub-folder for file uploads
  externalSourceFolderId?: string; // New: Read-only source folder
  lastSync?: string;
}

export interface BackupVersion {
  id: string;
  fileName: string;
  createdTime: string;
  size: string;
}

export interface ExternalSource {
  id: string;   // Folder ID of the external drive
  name: string; // Display name
  addedAt: string;
}

export interface SystemSettings {
  currentAcademicYear: string;
  extractionPrompt: string;
  analysisPrompt: string;
  virtualAssistantUrl: string;
  // driveConfig removed to prevent persistence
}

export type ViewState = 'dashboard' | 'ingestion' | 'analysis' | 'scientific_management' | 'organization' | 'settings' | 'faculty_profiles';

// --- NEW FACULTY MODULE TYPES ---

export type Language = 'vi' | 'en';

export interface BilingualString {
  vi: string;
  en: string;
}

export interface FacultyListItem {
  id: string;
  content: BilingualString;
}

export interface FacultyEducation {
  id: string;
  year: string;
  degree: BilingualString;
  discipline: BilingualString;
  institution: BilingualString;
}

export interface FacultyExperience {
  id: string;
  period: string;
  institution: BilingualString;
  rank: BilingualString;
  title: BilingualString;
  isFullTime: boolean;
}

export interface FacultyNonAcademicExperience {
  id: string;
  period: string;
  company: BilingualString;
  title: BilingualString;
  description: BilingualString;
  isFullTime: boolean;
}

export interface FacultyPublication {
  id: string;
  text: BilingualString;
}

export interface Faculty {
  id: string;
  name: BilingualString;
  rank: BilingualString;
  degree: BilingualString;
  academicTitle: BilingualString;
  position: BilingualString;
  experience: BilingualString; // String to hold calculated years
  dob?: string;
  office?: string;
  officeHours?: string;
  tel?: string;
  cell?: string;
  email?: string;
  educationList: FacultyEducation[];
  academicExperienceList: FacultyExperience[];
  nonAcademicExperienceList: FacultyNonAcademicExperience[];
  publicationsList: FacultyPublication[];
  certificationsList: FacultyListItem[];
  honorsList: FacultyListItem[];
  serviceActivitiesList: FacultyListItem[];
  professionalDevelopmentList: FacultyListItem[];
  membershipsList: FacultyListItem[];
  isAbet?: boolean;
  instructorDetails?: any;
  careerStartYear?: number;
  workload?: number; // Calculated field
}

export interface FacultyTitle {
    id: string;
    name: BilingualString;
    abbreviation: BilingualString;
}

export interface FacultyTitles {
    degrees: FacultyTitle[];
    ranks: FacultyTitle[];
    academicTitles: FacultyTitle[];
    positions: FacultyTitle[];
}

// Simplified Course interface for Faculty Stats
export interface Course {
    id: string;
    code: string;
    name: string;
    credits: number;
    instructorIds: string[];
    isAbet?: boolean;
    isEssential?: boolean;
}

// --- DATA CONFIGURATION MODULE TYPES ---

export type DataFieldType = 
  // Primitive
  | 'text' 
  | 'textarea' 
  | 'number_int' 
  | 'number_float' 
  | 'date'
  // Choice
  | 'select_single' 
  | 'select_multiple'
  // Logic & Reference
  | 'boolean'
  | 'reference'
  // File
  | 'file';

export type ReferenceTarget = 'units' | 'academicYears' | 'faculties';

export interface DataFieldOption {
  id: string;
  label: string;
  value: string;
}

export interface DataFieldDefinition {
  id: string;
  key: string;       // JSON property key (e.g., 'researchTitle')
  label: string;     // Display label (e.g., 'Tên đề tài')
  type: DataFieldType;
  required: boolean;
  description?: string;
  // For Choice Types
  options?: DataFieldOption[];
  // For Reference Types
  referenceTarget?: ReferenceTarget;
}

export type ChartType = 'line' | 'bar' | 'pie' | 'radar';

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  // Configuration specific to chart type
  xAxisField?: string;      // Used for Line/Bar (Dimension)
  yAxisField?: string;      // Used for Line/Bar (Metric)
  categoryField?: string;   // Used for Pie (Category)
  radarFields?: string[];   // Used for Radar (Metrics)
  color?: string;
}

export interface DataConfigGroup {
  id: string;
  name: string;        // e.g., "Quản lý Sinh viên", "Nghiên cứu Khoa học"
  description?: string;
  fields: DataFieldDefinition[];
  charts?: ChartConfig[]; // New: Store chart configurations
}

export interface DynamicRecord {
  id: string;
  academicYear?: string; // Always injected
  [key: string]: any;
}