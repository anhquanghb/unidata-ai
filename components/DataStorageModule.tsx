import React, { useState } from 'react';
import { UniversityReport, ScientificRecord } from '../types';
import DataScienceModule from './DataScienceModule';
import TrainingModule from './ingestion_modules/TrainingModule';
import PersonnelModule from './ingestion_modules/PersonnelModule';
import AdmissionsModule from './ingestion_modules/AdmissionsModule';
import ClassModule from './ingestion_modules/ClassModule';
import DepartmentModule from './ingestion_modules/DepartmentModule';
import BusinessModule from './ingestion_modules/BusinessModule';

interface DataStorageModuleProps {
  reports: UniversityReport[];
  scientificRecords: ScientificRecord[];
  onAddScientificRecord: (record: ScientificRecord) => void;
  onDeleteScientificRecord: (id: string) => void;
  isLocked: boolean;
  currentAcademicYear: string;
}

type TabType = 'SCIENTIFIC' | 'TRAINING' | 'PERSONNEL' | 'ADMISSIONS' | 'CLASS' | 'DEPARTMENT' | 'BUSINESS';

const DataStorageModule: React.FC<DataStorageModuleProps> = ({ 
    reports, 
    scientificRecords, 
    onAddScientificRecord,
    onDeleteScientificRecord,
    isLocked, 
    currentAcademicYear 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('SCIENTIFIC');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'SCIENTIFIC', label: 'Khoa học & Công nghệ' },
    { id: 'TRAINING', label: 'Đào tạo' },
    { id: 'PERSONNEL', label: 'Nhân sự' },
    { id: 'ADMISSIONS', label: 'Tuyển sinh' },
    { id: 'CLASS', label: 'Lớp sinh viên' },
    { id: 'DEPARTMENT', label: 'Tổ bộ môn' },
    { id: 'BUSINESS', label: 'Quan hệ Doanh nghiệp' },
  ];

  const handleDummyImport = (data: any[]) => {
    console.log("Import functionality is not enabled in this view.", data);
  };

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header Area */}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Quản lý Thông tin Dữ liệu</h2>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-slate-600">Kho dữ liệu số hóa tập trung toàn trường.</p>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                    {currentAcademicYear}
                </span>
                {isLocked && (
                    <span className="flex items-center px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Read Only
                    </span>
                )}
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200 overflow-x-auto">
        <div className="flex space-x-1">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
         {activeTab === 'SCIENTIFIC' && (
             <DataScienceModule 
                reports={reports}
                scientificRecords={scientificRecords}
                onAddScientificRecord={onAddScientificRecord}
                onDeleteScientificRecord={onDeleteScientificRecord}
                isLocked={isLocked}
                currentAcademicYear={currentAcademicYear}
             />
         )}
         {activeTab === 'TRAINING' && (
             <TrainingModule isLocked={isLocked} currentAcademicYear={currentAcademicYear} onImport={handleDummyImport} />
         )}
         {activeTab === 'PERSONNEL' && (
             <PersonnelModule isLocked={isLocked} currentAcademicYear={currentAcademicYear} onImport={handleDummyImport} />
         )}
         {activeTab === 'ADMISSIONS' && (
             <AdmissionsModule isLocked={isLocked} currentAcademicYear={currentAcademicYear} onImport={handleDummyImport} />
         )}
         {activeTab === 'CLASS' && (
             <ClassModule isLocked={isLocked} currentAcademicYear={currentAcademicYear} onImport={handleDummyImport} />
         )}
         {activeTab === 'DEPARTMENT' && (
             <DepartmentModule isLocked={isLocked} currentAcademicYear={currentAcademicYear} onImport={handleDummyImport} />
         )}
         {activeTab === 'BUSINESS' && (
             <BusinessModule isLocked={isLocked} currentAcademicYear={currentAcademicYear} onImport={handleDummyImport} />
         )}
      </div>
    </div>
  );
};

export default DataStorageModule;