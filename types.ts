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
  lastSync?: string;
}

export interface BackupVersion {
  id: string;
  fileName: string;
  createdTime: string;
  size: string;
}

export interface SystemSettings {
  currentAcademicYear: string;
  extractionPrompt: string;
  analysisPrompt: string;
  virtualAssistantUrl: string;
  driveConfig: GoogleDriveConfig; // New Field
}

export type ViewState = 'dashboard' | 'ingestion' | 'analysis' | 'scientific_management' | 'organization' | 'settings';
