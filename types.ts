
export interface Unit {
  unit_id: string;
  unit_name: string;
  unit_code: string;
  unit_type: 'school' | 'faculty' | 'department';
  unit_parentId?: string;
  publicDriveId?: string; // ID của Zone C (UniData_Public) của đơn vị này
}

export interface HumanResourceRecord {
  id: string;
  unitId: string;
  facultyId: string;
  role?: string; // Optional: Trưởng khoa, nhân viên, etc.
  assignedDate?: string;
  startDate?: string; // Năm/Ngày bắt đầu
  endDate?: string;   // Năm/Ngày kết thúc (nếu null -> đang làm việc)
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'staff';
  email?: string;
}

export interface AcademicYear {
  id: string;
  code: string;
  isLocked: boolean;
}

export interface UniversityReport {
  unitName: string;
  academicYear: string;
  personnel: {
    professors: number;
    associateProfessors: number;
    phd: number;
    masters: number;
  };
  publications: {
    isi: number;
    scopus: number;
    domestic: number;
    otherInternational: number;
  };
  projects: {
    assigned: number;
    ongoing: number;
    completed: number;
  };
  qualitative: {
    researchDirections: string[];
    difficulties: string[];
    proposals: string[];
  };
}

export type ViewState = 'dashboard' | 'scientific_management' | 'faculty_profiles' | 'organization' | 'settings';

export interface ScientificRecord {
  id: string;
  lecturerName: string;
  recordName: string;
  academicYear: string;
  requestSupport: boolean;
  type: string;
  link?: string;
}

export interface FacultyListItem {
  id: string;
  content: { vi: string; en: string };
}

export interface Faculty {
  id: string;
  name: { vi: string; en: string };
  rank: { vi: string; en: string };
  degree: { vi: string; en: string };
  academicTitle: { vi: string; en: string };
  position: { vi: string; en: string };
  experience: { vi: string; en: string };
  careerStartYear: number;
  workload: number;
  email?: string;
  tel?: string;
  mobile?: string;
  office?: string;
  officeHours?: string;
  
  educationList: {
    id: string;
    year: string;
    degree: { vi: string; en: string };
    institution: { vi: string; en: string };
    discipline?: { vi: string; en: string };
  }[];
  academicExperienceList: {
    id: string;
    period: string;
    institution: { vi: string; en: string };
    title: { vi: string; en: string };
    rank?: { vi: string; en: string };
    isFullTime?: boolean;
  }[];
  nonAcademicExperienceList?: any[]; // Simplified
  
  publicationsList: {
    id: string;
    text: { vi: string; en: string };
  }[];
  
  honorsList: FacultyListItem[];
  certificationsList: FacultyListItem[];
  membershipsList: FacultyListItem[];
  serviceActivitiesList: FacultyListItem[];
  professionalDevelopmentList: FacultyListItem[];
}

export interface SchoolInfo {
  school_name: string;
  school_code: string;
  publicDriveId?: string; // ID của Zone C (UniData_Public) của hệ thống hiện tại
}

export interface TrainingRecord {
  id: string;
  programName: string;
  level: string;
  status: string;
  studentsCount: number;
  academicYear: string;
}

export interface PersonnelRecord {
  id: string;
  fullName: string;
  title: string;
  position: string;
  department: string;
  startDate: string;
  academicYear: string;
}

export interface AdmissionRecord {
  id: string;
  major: string;
  quota: number;
  applications: number;
  admitted: number;
  score: number;
  academicYear: string;
}

export interface ClassRecord {
  id: string;
  className: string;
  advisor: string;
  monitor: string;
  size: number;
  academicYear: string;
}

export interface DepartmentRecord {
  id: string;
  activityName: string;
  date: string;
  attendees: number;
  description?: string;
  academicYear: string;
}

export interface BusinessRecord {
  id: string;
  partnerName: string;
  activityType: string;
  value: string;
  status: string;
  academicYear: string;
}

export type DataFieldType = 'text' | 'textarea' | 'number_int' | 'number_float' | 'date' | 'boolean' | 'select_single' | 'select_multiple' | 'reference' | 'reference_multiple' | 'file';

export interface DataFieldOption {
  id: string;
  label: string;
  value: string;
}

export interface DataFieldDefinition {
  id: string;
  key: string;
  label: string;
  type: DataFieldType;
  required: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  options?: DataFieldOption[];
  referenceTarget?: 'units' | 'faculties' | 'academicYears';
}

export type ChartType = 'line' | 'bar' | 'pie' | 'radar';

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xAxisField?: string;
  yAxisField?: string;
  categoryField?: string;
  radarFields?: string[];
}

export interface DataConfigGroup {
  id: string;
  name: string;
  description?: string;
  icon?: string; // New: Icon name for display
  fields: DataFieldDefinition[];
  charts?: ChartConfig[];
}

export interface DynamicRecord {
  id: string;
  academicYear: string;
  updatedAt?: string; // Timestamp for sync logic
  [key: string]: any;
}

export interface GoogleDriveConfig {
  isConnected: boolean;
  clientId?: string;
  accessToken?: string;
  accountName?: string;
  
  // Folder Structure
  rootFolderId?: string; // UniData_Store (Level 0)
  zoneAId?: string;      // UniData_Private (Level 1)
  zoneBId?: string;      // UniData_System (Level 1) - Default Write Target
  zoneCId?: string;      // UniData_Public (Level 1)
  
  folderId?: string;     // Legacy support (points to Zone B usually)
  folderName?: string;   // Legacy/Display name
  dataFolderId?: string; // Legacy/Data subfolder inside Zone B
  
  externalSourceFolderId?: string;
  lastSync?: string;
}

export interface FacultyTitle {
  id: string;
  name: { vi: string; en: string };
  abbreviation: { vi: string; en: string };
}

export interface FacultyTitles {
  ranks: FacultyTitle[];
  degrees: FacultyTitle[];
  academicTitles: FacultyTitle[];
  positions: FacultyTitle[];
  [key: string]: FacultyTitle[];
}

export interface BackupVersion {
  id: string;
  fileName: string;
  createdTime: string;
  size: string;
}

export interface ExternalSource {
  id: string;
  name: string;
  addedAt: string;
}

// --- PERMISSION SYSTEM ---
export interface PermissionProfile {
  role: 'school_admin' | 'unit_manager'; // Define broad role
  canEditDataConfig: boolean; // Can change Schema?
  canEditOrgStructure: boolean; // Can add/delete Units?
  managedUnitId?: string; // If set, restricted to this unit
}

export interface SystemSettings {
  currentAcademicYear: string;
  virtualAssistantUrl?: string;
  extractionPrompt: string;
  analysisPrompt: string;
  driveConfig?: GoogleDriveConfig;
  permissionProfile?: PermissionProfile; // Embedded permission
}

export interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
}

export type Language = 'vi' | 'en';
