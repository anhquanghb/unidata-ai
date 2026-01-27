import React, { useState } from 'react';
import { UniversityReport } from '../types';
import DataScienceModule from './DataScienceModule';

interface DataStorageModuleProps {
  reports: UniversityReport[];
  isLocked: boolean;
  currentAcademicYear: string;
}

type TabType = 'SCIENTIFIC' | 'TRAINING' | 'PERSONNEL' | 'ADMISSIONS' | 'CLASS' | 'DEPARTMENT' | 'BUSINESS';

const DataStorageModule: React.FC<DataStorageModuleProps> = ({ reports, isLocked, currentAcademicYear }) => {
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

  const renderPlaceholder = (title: string) => (
     <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
        <h3 className="text-lg font-medium text-slate-700">Phân hệ {title}</h3>
        <p className="text-slate-500 mt-2">Tính năng đang được phát triển. Vui lòng quay lại sau.</p>
     </div>
  );

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
                isLocked={isLocked}
                currentAcademicYear={currentAcademicYear}
             />
         )}
         {activeTab === 'TRAINING' && renderPlaceholder('Đào tạo')}
         {activeTab === 'PERSONNEL' && renderPlaceholder('Nhân sự')}
         {activeTab === 'ADMISSIONS' && renderPlaceholder('Tuyển sinh')}
         {activeTab === 'CLASS' && renderPlaceholder('Lớp sinh viên')}
         {activeTab === 'DEPARTMENT' && renderPlaceholder('Tổ bộ môn')}
         {activeTab === 'BUSINESS' && renderPlaceholder('Quan hệ Doanh nghiệp')}
      </div>
    </div>
  );
};

export default DataStorageModule;
