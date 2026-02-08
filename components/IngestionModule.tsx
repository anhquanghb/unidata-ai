import React, { useState } from 'react';
import { AcademicYear } from '../types';
import DataScienceModule from './ingestion_modules/DataScienceModule';
import TrainingModule from './ingestion_modules/TrainingModule';
import PersonnelModule from './ingestion_modules/PersonnelModule';
import AdmissionsModule from './ingestion_modules/AdmissionsModule';
import ClassModule from './ingestion_modules/ClassModule';
import DepartmentModule from './ingestion_modules/DepartmentModule';
import BusinessModule from './ingestion_modules/BusinessModule';

interface IngestionModuleProps {
  onDataImport: (type: string, data: any[]) => void;
  academicYears: AcademicYear[];
  currentAcademicYearCode: string;
  isLocked: boolean;
  virtualAssistantUrl?: string; // New prop
}

type SubModuleType = 
  | 'HUB' 
  | 'SCIENTIFIC' 
  | 'TRAINING' 
  | 'PERSONNEL' 
  | 'ADMISSIONS' 
  | 'CLASS' 
  | 'DEPARTMENT' 
  | 'BUSINESS';

const IngestionModule: React.FC<IngestionModuleProps> = ({ 
  onDataImport, 
  currentAcademicYearCode,
  isLocked,
  virtualAssistantUrl
}) => {
  const [activeSubModule, setActiveSubModule] = useState<SubModuleType>('HUB');
  
  const handleGenericImport = (type: string) => (data: any[]) => {
      onDataImport(type, data);
      setActiveSubModule('HUB'); // Return to hub after import
  };

  // --- SUB-COMPONENTS ---

  const ModuleCard = ({ type, title, icon, description, color }: any) => (
    <button
      onClick={() => setActiveSubModule(type)}
      className="flex flex-col items-center p-6 bg-white border border-slate-200 rounded-xl hover:shadow-lg transition-all duration-300 group hover:-translate-y-1"
    >
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${color} text-white shadow-md group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-800 text-lg mb-2">{title}</h3>
      <p className="text-sm text-slate-500 text-center">{description}</p>
    </button>
  );

  const renderHub = () => (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Trung tâm Tiếp nhận Dữ liệu (Ingestion Hub)</h2>
        <div className="flex items-center gap-3">
             <p className="text-slate-600">Chọn phân hệ dữ liệu để thực hiện nhập liệu từ JSON.</p>
             <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold border border-blue-200">
                Năm học: {currentAcademicYearCode}
             </span>
             {isLocked && (
                 <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-200">
                    ĐÃ KHÓA (CHỈ XEM)
                 </span>
             )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ModuleCard 
          type="SCIENTIFIC" 
          title="Thông tin Khoa học" 
          description="Công bố bài báo, đề tài nghiên cứu, hội thảo."
          color="bg-blue-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
        />
        <ModuleCard 
          type="TRAINING" 
          title="Thông tin Đào tạo" 
          description="Chương trình đào tạo, tiến độ giảng dạy, học liệu."
          color="bg-green-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <ModuleCard 
          type="PERSONNEL" 
          title="Thông tin Nhân sự" 
          description="Hồ sơ giảng viên, cán bộ, hợp đồng lao động."
          color="bg-orange-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <ModuleCard 
          type="ADMISSIONS" 
          title="Thông tin Tuyển sinh" 
          description="Dữ liệu thí sinh, điểm chuẩn, nhập học."
          color="bg-purple-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
        />
        <ModuleCard 
          type="CLASS" 
          title="Thông tin Lớp học" 
          description="Danh sách sinh viên, thời khóa biểu."
          color="bg-indigo-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        />
        <ModuleCard 
          type="DEPARTMENT" 
          title="Thông tin Tổ bộ môn" 
          description="Cơ cấu bộ môn, sinh hoạt chuyên môn."
          color="bg-teal-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
        />
        <ModuleCard 
          type="BUSINESS" 
          title="Quan hệ Doanh nghiệp" 
          description="Hợp tác, tài trợ, thực tập sinh."
          color="bg-rose-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
        />
      </div>
    </div>
  );

  const renderActiveModule = () => {
      const commonProps = {
          isLocked,
          currentAcademicYear: currentAcademicYearCode,
          virtualAssistantUrl, // Pass the URL to children
      };

      return (
          <div className="p-8 max-w-6xl mx-auto min-h-screen flex flex-col">
               <div className="mb-6 flex items-center">
                    <button 
                    onClick={() => setActiveSubModule('HUB')}
                    className="mr-4 p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">Quay lại</h2>
                </div>
                
                {activeSubModule === 'SCIENTIFIC' && <DataScienceModule onImport={handleGenericImport('SCIENTIFIC')} {...commonProps} />}
                {activeSubModule === 'TRAINING' && <TrainingModule onImport={handleGenericImport('TRAINING')} {...commonProps} />}
                {activeSubModule === 'PERSONNEL' && <PersonnelModule onImport={handleGenericImport('PERSONNEL')} {...commonProps} />}
                {activeSubModule === 'ADMISSIONS' && <AdmissionsModule onImport={handleGenericImport('ADMISSIONS')} {...commonProps} />}
                {activeSubModule === 'CLASS' && <ClassModule onImport={handleGenericImport('CLASS')} {...commonProps} />}
                {activeSubModule === 'DEPARTMENT' && <DepartmentModule onImport={handleGenericImport('DEPARTMENT')} {...commonProps} />}
                {activeSubModule === 'BUSINESS' && <BusinessModule onImport={handleGenericImport('BUSINESS')} {...commonProps} />}
          </div>
      )
  }

  if (activeSubModule === 'HUB') {
      return renderHub();
  } else {
      return renderActiveModule();
  }
};

export default IngestionModule;
