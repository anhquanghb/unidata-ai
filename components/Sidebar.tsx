import React from 'react';
import { ViewState } from '../types';
import { CloudUpload, Download } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  schoolName: string;
  currentAcademicYear: string;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  hasUnsavedChanges: boolean;
  onSaveToCloud: () => void;
  onExportData: () => void;
  isCloudConnected: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onViewChange, 
  schoolName, 
  currentAcademicYear, 
  isCollapsed, 
  toggleSidebar,
  hasUnsavedChanges,
  onSaveToCloud,
  onExportData,
  isCloudConnected
}) => {
  const menuItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Tổng quan (Dashboard)',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'scientific_management',
      label: 'Quản lý Thông tin',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'faculty_profiles',
      label: 'Hồ sơ Nhân sự',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      ),
    },
    {
      id: 'organization',
      label: 'Cơ cấu tổ chức',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Cài đặt hệ thống',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div 
      className={`bg-slate-800 text-white min-h-screen flex flex-col shadow-xl transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex flex-col items-start justify-between gap-3">
        <div className="flex items-center justify-between w-full">
            {!isCollapsed && (
            <div className="overflow-hidden">
                <h1 className="text-xl font-bold tracking-tight text-blue-400 whitespace-nowrap">UniData</h1>
                <p className="text-xs text-slate-400 mt-1 truncate" title={schoolName}>{schoolName}</p>
                <h2 className="text-sm font-bold text-white mt-1">{currentAcademicYear}</h2>
            </div>
            )}
            <button 
            onClick={toggleSidebar}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
            {isCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
            )}
            </button>
        </div>

        {/* Action Buttons */}
        {!isCollapsed && (
            <div className="w-full flex gap-2 mt-2">
                <button 
                    onClick={onSaveToCloud}
                    disabled={!hasUnsavedChanges || !isCloudConnected}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-bold transition-all ${
                        hasUnsavedChanges 
                            ? 'bg-green-600 text-white shadow-md hover:bg-green-700 animate-pulse' 
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                    title={isCloudConnected ? "Lưu thay đổi lên Đám mây" : "Chưa kết nối Google Drive"}
                >
                    <CloudUpload size={14}/>
                    Lưu Cloud
                </button>
                <button 
                    onClick={onExportData}
                    disabled={!hasUnsavedChanges}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-bold transition-all ${
                        hasUnsavedChanges 
                            ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                    title="Xuất dữ liệu ra file JSON"
                >
                    <Download size={14}/>
                    Xuất File
                </button>
            </div>
        )}
        {isCollapsed && hasUnsavedChanges && (
             <div className="flex flex-col gap-2 mt-2 w-full items-center">
                <button onClick={onSaveToCloud} className="p-2 bg-green-600 rounded-full text-white animate-pulse" title="Lưu Cloud"><CloudUpload size={14}/></button>
             </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex items-center w-full px-3 py-3 rounded-lg transition-colors duration-200 group relative ${
              currentView === item.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? item.label : ''}
          >
            <span className={`${isCollapsed ? '' : 'mr-3'}`}>{item.icon}</span>
            {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-slate-700">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0">UD</div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-xs text-slate-400 truncate">Phòng Tổng hợp</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
