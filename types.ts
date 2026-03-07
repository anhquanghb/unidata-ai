
export interface Unit {
  unit_id: string;
  unit_name: string;
  unit_code: string;
  unit_type: 'school' | 'faculty' | 'department' | 'external';
  unit_parentId?: string;
  unit_publicDriveId?: string; // ID thư mục UniData_Public thực tế của đơn vị này
  isSystem?: boolean; // System unit, cannot be deleted
}

export interface HumanResourceRecord {
  id: string;
  unitId: string;
  facultyId: string;
  role?: string; // Optional: Trưởng khoa, nhân viên, etc. (Legacy, keep for compatibility or map to customPositionName)
  positionLevel?: 'head' | 'deputy' | 'member'; // New: 3 levels
  customPositionName?: string; // New: Custom name for the position
  assignedDate?: string;
  startDate?: string; // Năm/Ngày bắt đầu
  endDate?: string;   // Năm/Ngày kết thúc (nếu null -> đang làm việc)
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string; // Used as unique identifier
  role: 'school_admin' | 'unit_manager';
  isPrimary: boolean;
  managedUnitId?: string;
  permissions: {
    canEditDataConfig: boolean;
    canEditOrgStructure: boolean;
    canProposeEditProcess: boolean; // New: Đề xuất - Chỉnh sửa quy trình
  };
}

export interface WorkingSession {
  start: string;
  end: string;
}

export interface DailySchedule {
  day: string; // "Monday", "Tuesday", ...
  morning: WorkingSession;
  afternoon: WorkingSession;
  isOff: boolean;
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface AcademicYearConfig {
  workingSchedule: DailySchedule[];
  holidays: Holiday[];
}

export interface AcademicYear {
  id: string;
  code: string;
  isLocked: boolean;
  config?: AcademicYearConfig;
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

export type ViewState = 'dashboard' | 'scientific_management' | 'faculty_profiles' | 'organization' | 'settings' | 'iso_designer';

export interface IsoStep {
  id: string;
  name: string;
  description?: string;
  executorRole: 'school_admin' | 'unit_manager' | 'lecturer' | 'student' | 'external';
  executorUnitId?: string; // Optional: specific unit
  isStart?: boolean;
  isEnd?: boolean;
}

export interface IsoTransition {
  id: string;
  fromStepId: string;
  toStepId: string;
  actionName: string; // e.g., "Approve", "Reject", "Submit"
  condition?: string; // Optional logic description
}

export interface IsoControlInfo {
  documentCode: string;
  revision: string;
  effectiveDate: string;
  drafter: string;
  reviewer: string;
  approver: string;
  scanFileId?: string;
  scanLink?: string;
  scanMimeType?: string;
}

export interface IsoPurposeScope {
  purpose: string;
  scope: string;
}

export interface IsoDefinitionTerm {
  id: string;
  term: string;
  definition: string;
}

export interface IsoStepDetail {
  nodeId: string;
  who: string;
  whoConfig?: {
    unitType?: 'school' | 'faculty' | 'department';
    unitId?: string;
    personId?: string;
  };
  what: string;
  when: string;
  whenConfig?: {
    value: number;
    unit: 'working_hours' | 'working_days' | 'weeks' | 'months' | 'years';
  };
  how: string;
}

export interface IsoKPI {
  id: string;
  indicator: string;
  target: string;
}

export interface IsoRecordForm {
  id: string;
  name: string;
  code: string;
  link?: string;
  fileId?: string; // Google Drive File ID
  mimeType?: string;
}

// React Flow Types (Simplified for storage)
export interface IsoFlowchartNodeData {
  id: string;
  type: 'start' | 'process' | 'decision' | 'end'; // oval, rect, diamond, oval
  label: string;
  position: { x: number; y: number };
}

export interface IsoFlowchartEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string; // Yes/No for decision
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface IsoProcess {
  id: string;
  name: string;
  controlInfo: IsoControlInfo;
  purposeScope: IsoPurposeScope;
  definitions: IsoDefinitionTerm[];
  flowchart: {
    nodes: IsoFlowchartNodeData[];
    edges: IsoFlowchartEdgeData[];
  };
  stepDetails: Record<string, IsoStepDetail>; // Keyed by Node ID
  kpis: IsoKPI[];
  records: IsoRecordForm[];
  updatedAt: string;
}

// Legacy IsoDefinition (Keep for compatibility if needed, or replace usages)
export interface IsoDefinition {
  id: string;
  familyId?: string; // Grouping ID for versions
  version?: string; // e.g. "1.0", "1.1"
  name: string;
  code: string; // ISO Code e.g., "ISO-01"
  description?: string;
  steps: IsoStep[];
  transitions: IsoTransition[];
  active: boolean;
  updatedAt: string;
  status?: 'đang thiết kế' | 'đã ban hành' | 'đang chỉnh sửa' | 'đã chuẩn bị đề xuất' | 'dừng ban hành';
  // New structure integration (optional migration)
  processData?: IsoProcess;
}

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
  userEmail?: string; // Added: To validate against system user
  
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
  canProposeEditProcess: boolean; // New: Đề xuất - Chỉnh sửa quy trình
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