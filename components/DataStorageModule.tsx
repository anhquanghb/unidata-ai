import React, { useState } from 'react';
import { DataConfigGroup, DynamicRecord, Unit, Faculty, AcademicYear, GoogleDriveConfig, HumanResourceRecord } from '../types';
import DynamicDataManager from './DynamicDataManager';
import { Database, FolderOpen, ArrowLeft, BookOpen, Briefcase, Users, GraduationCap, Award, Globe, Activity, Star, Zap, Archive, Layout } from 'lucide-react';

interface DataStorageModuleProps {
  isLocked: boolean;
  currentAcademicYear: string;
  
  // Dynamic Data
  dataConfigGroups: DataConfigGroup[];
  dynamicDataStore: Record<string, DynamicRecord[]>;
  onUpdateDynamicData: (groupId: string, data: DynamicRecord[]) => void;
  onUpdateDataConfigGroups: (groups: DataConfigGroup[]) => void;

  // Context Lookups
  units: Unit[];
  faculties: Faculty[];
  humanResources: HumanResourceRecord[]; // Added prop
  academicYears: AcademicYear[];
  
  // Drive Config for File Upload
  driveConfig?: GoogleDriveConfig;
}

// Map icon string names to components
const ICON_MAP: Record<string, React.ReactNode> = {
    'BookOpen': <BookOpen size={32}/>,
    'Briefcase': <Briefcase size={32}/>,
    'Users': <Users size={32}/>,
    'GraduationCap': <GraduationCap size={32}/>,
    'Award': <Award size={32}/>,
    'Globe': <Globe size={32}/>,
    'Database': <Database size={32}/>,
    'Activity': <Activity size={32}/>,
    'Star': <Star size={32}/>,
    'Zap': <Zap size={32}/>,
    'Archive': <Archive size={32}/>,
    'Layout': <Layout size={32}/>,
};

const DataStorageModule: React.FC<DataStorageModuleProps> = ({ 
    isLocked, 
    currentAcademicYear,
    dataConfigGroups,
    dynamicDataStore,
    onUpdateDynamicData,
    onUpdateDataConfigGroups,
    units,
    faculties,
    humanResources,
    academicYears,
    driveConfig
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const selectedGroup = dataConfigGroups.find(g => g.id === selectedGroupId);
  const selectedGroupData = selectedGroupId ? (dynamicDataStore[selectedGroupId] || []) : [];

  const renderHub = () => (
      <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Quản lý Thông tin (Dynamic Data Hub)</h2>
              <div className="flex items-center gap-3 text-slate-600">
                  <p>Chọn nhóm dữ liệu để xem chi tiết và quản lý.</p>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold border border-blue-200">
                      Năm học: {currentAcademicYear}
                  </span>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {dataConfigGroups.map(group => {
                  const recordCount = (dynamicDataStore[group.id] || []).filter(d => d.academicYear === currentAcademicYear).length;
                  return (
                      <button
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          className="flex flex-col items-start p-6 bg-white border border-slate-200 rounded-xl hover:shadow-lg transition-all duration-300 group hover:-translate-y-1 text-left relative overflow-hidden"
                      >
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-blue-50 text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors`}>
                              {ICON_MAP[group.icon || 'Database'] || <Database size={32}/>}
                          </div>
                          <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1">{group.name}</h3>
                          <p className="text-sm text-slate-500 mb-4 line-clamp-2 h-10">{group.description || 'Không có mô tả'}</p>
                          
                          <div className="mt-auto pt-4 border-t border-slate-100 w-full flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-400 uppercase">Số lượng</span>
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-700">{recordCount} bản ghi</span>
                          </div>
                      </button>
                  );
              })}
              
              {dataConfigGroups.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                      <Database size={48} className="mx-auto mb-4 opacity-20"/>
                      <p>Chưa có nhóm dữ liệu nào được cấu hình.</p>
                      <p className="text-sm mt-2">Vui lòng vào <strong>Cài đặt &rarr; Cấu hình Dữ liệu</strong> để tạo mới.</p>
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {selectedGroup ? (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4">
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm z-20">
                  <button 
                      onClick={() => setSelectedGroupId(null)}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-blue-600 transition-colors"
                      title="Quay lại danh sách"
                  >
                      <ArrowLeft size={20}/>
                  </button>
                  <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                      <div className="text-blue-600">
                          {ICON_MAP[selectedGroup.icon || 'Database'] || <Database size={24}/>}
                      </div>
                      <div>
                          <h2 className="font-bold text-slate-800 text-lg leading-tight">{selectedGroup.name}</h2>
                          <p className="text-xs text-slate-500">Quản lý dữ liệu chi tiết</p>
                      </div>
                  </div>
              </div>
              
              <div className="flex-1 overflow-hidden">
                  <DynamicDataManager 
                      key={selectedGroup.id}
                      group={selectedGroup}
                      data={selectedGroupData}
                      isLocked={isLocked}
                      currentAcademicYear={currentAcademicYear}
                      onUpdateData={(newData) => onUpdateDynamicData(selectedGroup.id, newData)}
                      onUpdateGroupConfig={(newGroup) => {
                          const updatedGroups = dataConfigGroups.map(g => g.id === newGroup.id ? newGroup : g);
                          onUpdateDataConfigGroups(updatedGroups);
                      }}
                      // Lookups
                      units={units}
                      faculties={faculties}
                      humanResources={humanResources}
                      academicYears={academicYears}
                      // Drive Config
                      driveConfig={driveConfig}
                  />
              </div>
          </div>
      ) : (
          <div className="flex-1 overflow-y-auto">
              {renderHub()}
          </div>
      )}
    </div>
  );
};

export default DataStorageModule;