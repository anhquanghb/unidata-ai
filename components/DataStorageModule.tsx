import React, { useState } from 'react';
import { DataConfigGroup, DynamicRecord, Unit, Faculty, AcademicYear, GoogleDriveConfig, HumanResourceRecord } from '../types';
import DynamicDataManager from './DynamicDataManager';
import { Database, FolderOpen } from 'lucide-react';

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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(dataConfigGroups.length > 0 ? dataConfigGroups[0].id : null);

  const selectedGroup = dataConfigGroups.find(g => g.id === selectedGroupId);
  const selectedGroupData = selectedGroupId ? (dynamicDataStore[selectedGroupId] || []) : [];

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar: Data Groups List */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
          <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Database size={20} className="text-blue-600" />
                  Nhóm Dữ liệu
              </h2>
              <p className="text-xs text-slate-500 mt-1">Danh mục quản lý thông tin</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {dataConfigGroups.length === 0 && (
                  <div className="text-center p-4 text-slate-400 text-sm italic">
                      Chưa có nhóm dữ liệu nào được cấu hình trong Cài đặt.
                  </div>
              )}
              {dataConfigGroups.map(group => (
                  <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          selectedGroupId === group.id 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : 'text-slate-600 hover:bg-white hover:shadow-sm'
                      }`}
                  >
                      <FolderOpen size={16} />
                      <span className="truncate">{group.name}</span>
                  </button>
              ))}
          </div>
          <div className="p-4 border-t border-slate-200 text-xs text-slate-400 text-center">
              Năm học: <strong>{currentAcademicYear}</strong>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
          {selectedGroup ? (
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
          ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Database size={64} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium">Vui lòng chọn một Nhóm dữ liệu</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default DataStorageModule;