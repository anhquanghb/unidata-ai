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

export interface Unit {
  id: string;
  name: string;
  code: string;
  type: 'school' | 'faculty' | 'department'; // Cấp Trường, Cấp Khoa, Cấp Bộ môn
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
  code: string; // e.g. "2023-2024"
  isLocked: boolean;
}

export interface SchoolInfo {
  name: string;
  code: string;
}

export interface SystemSettings {
  currentAcademicYear: string; // Refers to AcademicYear.code
  extractionPrompt: string;
  analysisPrompt: string;
}

export type ViewState = 'dashboard' | 'ingestion' | 'analysis' | 'scientific_management' | 'organization' | 'settings';
