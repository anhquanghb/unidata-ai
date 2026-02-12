import React, { useState, useMemo } from 'react';
import { Unit, Faculty, HumanResourceRecord, DataConfigGroup, DynamicRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Building, Users, Plus, Trash2, Search, GraduationCap, FileJson } from 'lucide-react';

interface OrganizationModuleProps {
  units: Unit[];
  onAddUnit: (unit: Unit) => void;
  onUpdateUnit: (unit: Unit) => void;
  onRemoveUnit: (id: string) => void;
  isLocked: boolean;
  faculties?: Faculty[];
  humanResources?: HumanResourceRecord[];
  onUpdateHumanResources?: (records: HumanResourceRecord[]) => void;
  // Props for Data Export
  dataConfigGroups?: DataConfigGroup[];
  dynamicDataStore?: Record<string, DynamicRecord[]>;
}

const OrganizationModule: React.FC<OrganizationModuleProps> = ({ 
    units, 
    onAddUnit, 
    onUpdateUnit, 
    onRemoveUnit, 
    isLocked,
    faculties = [],
    humanResources = [],
    onUpdateHumanResources,
    dataConfigGroups = [],
    dynamicDataStore = {}
}) => {
  // View State
  const [activeTab, setActiveTab] = useState<'structure' | 'hr'>('structure');

  // --- STRUCTURE TAB STATE ---
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitCode, setNewUnitCode] = useState('');
  const [addLevel, setAddLevel] = useState<'faculty' | 'department'>('department');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  // --- HR TAB STATE ---
  const [hrSelectedLevel1Id, setHrSelectedLevel1Id] = useState<string>('');
  const [hrSelectedLevel2Id, setHrSelectedLevel2Id] = useState<string>('');
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [personSearchQuery, setPersonSearchQuery] = useState('');

  // Filter Data
  const level1Units = units.filter(u => u.unit_type === 'faculty');
  const level2Units = units.filter(u => u.unit_type === 'department' && (!selectedFacultyId || u.unit_parentId === selectedFacultyId));
  
  // HR Data Filtering
  const hrLevel2Options = useMemo(() => {
      return units.filter(u => u.unit_type === 'department' && u.unit_parentId === hrSelectedLevel1Id);
  }, [units, hrSelectedLevel1Id]);

  const activeHrUnitId = hrSelectedLevel2Id || hrSelectedLevel1Id;

  const activeHrList = useMemo(() => {
      if (!activeHrUnitId) return [];
      const assignments = humanResources.filter(hr => hr.unitId === activeHrUnitId);
      return assignments.map(hr => {
          const faculty = faculties.find(f => f.id === hr.facultyId);
          return { ...hr, faculty };
      }).filter(item => item.faculty); // Ensure faculty exists
  }, [humanResources, faculties, activeHrUnitId]);

  // --- EXPORT LOGIC ---
  const handleExportUnitData = (unit: Unit) => {
      // 1. Identify relevant units hierarchy
      let exportUnits: Unit[] = [];
      
      if (unit.unit_type === 'faculty') {
          // If exporting Faculty: Include Self AND Child Departments
          const children = units.filter(u => u.unit_parentId === unit.unit_id);
          exportUnits = [unit, ...children];
      } else {
          // If exporting Department: Include Self AND Parent Faculty
          const parent = units.find(u => u.unit_id === unit.unit_parentId);
          exportUnits = [unit];
          if(parent) exportUnits.push(parent);
      }

      // 2. Identify relevant IDs
      const relevantUnitIds = exportUnits.map(u => u.unit_id);

      // 3. Filter Dynamic Data (Information Module)
      const exportDynamicData: Record<string, DynamicRecord[]> = {};

      dataConfigGroups.forEach(group => {
          // Find if this group has a field referencing 'units'
          const unitField = group.fields.find(f => 
              (f.type === 'reference' || f.type === 'reference_multiple') && 
              f.referenceTarget === 'units'
          );

          if (unitField) {
              const allRecords = dynamicDataStore[group.id] || [];
              const filtered = allRecords.filter(rec => {
                  const val = rec[unitField.key];
                  if (Array.isArray(val)) {
                      // Multi-reference: record belongs if ANY unit is relevant
                      return val.some((v: string) => relevantUnitIds.includes(v));
                  } else {
                      // Single-reference
                      return relevantUnitIds.includes(val);
                  }
              });
              
              if (filtered.length > 0) {
                  exportDynamicData[group.id] = filtered;
              }
          }
      });

      // 4. Construct Payload
      const exportPayload = {
          metadata: {
              exportDate: new Date().toISOString(),
              rootUnit: unit.unit_name,
              type: unit.unit_type
          },
          dataConfigGroups: dataConfigGroups, // Export ALL configurations
          units: exportUnits, // Filtered Org Structure
          dynamicDataStore: exportDynamicData // Filtered Data
      };

      // 5. Trigger Download
      const fileName = `Export_${unit.unit_code}_${new Date().toISOString().slice(0, 10)}.json`;
      const jsonString = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- HANDLERS: STRUCTURE ---
  const handleAdd = () => {
    if (isLocked) return;
    if (!newUnitName || !newUnitCode) return;
    
    let parentId: string | undefined = undefined;
    if (addLevel === 'department') {
      if (!selectedFacultyId) {
         alert("Vui lòng chọn một Khoa/Viện trước khi thêm Bộ môn.");
         return;
      }
      parentId = selectedFacultyId;
    }

    const newUnit: Unit = {
      unit_id: uuidv4(),
      unit_name: newUnitName,
      unit_code: newUnitCode,
      unit_type: addLevel,
      unit_parentId: parentId
    };
    
    onAddUnit(newUnit);
    setNewUnitName('');
    setNewUnitCode('');
  };

  const startEditing = (unit: Unit) => {
    if (isLocked) return;
    setEditingId(unit.unit_id);
    setEditName(unit.unit_name);
    setEditCode(unit.unit_code);
  };

  const saveEditing = (originalUnit: Unit) => {
    if (editName.trim() === '' || editCode.trim() === '') {
        alert("Tên và Mã không được để trống");
        return;
    }
    onUpdateUnit({
        ...originalUnit,
        unit_name: editName,
        unit_code: editCode
    });
    setEditingId(null);
  };

  const cancelEditing = () => {
      setEditingId(null);
  };

  // --- HANDLERS: HR ---
  const handleAddPersonToUnit = (facultyId: string) => {
      if (!activeHrUnitId || !onUpdateHumanResources) return;
      
      // Check if already assigned to THIS unit
      if (humanResources.some(hr => hr.unitId === activeHrUnitId && hr.facultyId === facultyId)) {
          alert("Giảng viên này đã thuộc đơn vị này rồi.");
          return;
      }

      const newRecord: HumanResourceRecord = {
          id: uuidv4(),
          unitId: activeHrUnitId,
          facultyId: facultyId,
          role: 'Giảng viên', // Default role
          assignedDate: new Date().toISOString()
      };

      onUpdateHumanResources([...humanResources, newRecord]);
      setIsAddingPerson(false);
      setPersonSearchQuery('');
  };

  const handleRemovePersonFromUnit = (recordId: string) => {
      if (!onUpdateHumanResources) return;
      if (confirm("Xóa giảng viên khỏi đơn vị này?")) {
          onUpdateHumanResources(humanResources.filter(hr => hr.id !== recordId));
      }
  };

  // Helper to render a list item with inline editing
  const renderUnitItem = (unit: Unit, isSelected: boolean, onClick: () => void) => {
    const isEditing = editingId === unit.unit_id;

    if (isEditing) {
        return (
            <div className="p-2 bg-white rounded-lg border-2 border-blue-400 shadow-sm">
                <input 
                    className="w-full text-sm font-medium border-b border-slate-300 mb-1 focus:outline-none focus:border-blue-500"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Tên đơn vị"
                    autoFocus
                />
                <input 
                    className="w-full text-xs font-mono uppercase text-slate-500 border-b border-slate-300 focus:outline-none focus:border-blue-500"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    placeholder="MÃ"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditing(unit);
                        if (e.key === 'Escape') cancelEditing();
                    }}
                />
                <div className="flex justify-end mt-2 space-x-2">
                    <button onClick={cancelEditing} className="text-xs text-slate-500 hover:text-slate-700">Hủy</button>
                    <button onClick={() => saveEditing(unit)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Lưu</button>
                </div>
            </div>
        );
    }

    return (
      <div 
        onClick={onClick}
        onDoubleClick={() => startEditing(unit)}
        className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all select-none group ${
          isSelected 
            ? 'bg-blue-50 border-blue-300 shadow-sm' 
            : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-sm'
        }`}
        title={isLocked ? 'Dữ liệu năm học đang bị khóa (Chỉ xem)' : 'Nhấp đúp để sửa'}
      >
        <div className="flex-1 min-w-0 pr-2">
          <span className={`font-medium block truncate ${isSelected ? 'text-blue-800' : 'text-slate-800'}`}>{unit.unit_name}</span>
          <span className="text-xs text-slate-500 uppercase font-mono">{unit.unit_code}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button
                onClick={(e) => { e.stopPropagation(); handleExportUnitData(unit); }}
                className="text-slate-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded"
                title="Xuất dữ liệu đơn vị này (JSON)"
            >
                <FileJson size={16} />
            </button>
            {!isLocked && (
                <button 
                onClick={(e) => { e.stopPropagation(); onRemoveUnit(unit.unit_id); }}
                className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded"
                title="Xóa đơn vị"
                >
                <Trash2 size={16} />
                </button>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="mb-6 flex-shrink-0 flex justify-between items-start">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Quản lý Cơ cấu Tổ chức</h2>
            <div className="flex items-center gap-3 mb-2 mt-1">
                <p className="text-slate-600">Thiết lập đơn vị và phân bổ nhân sự.</p>
                {isLocked && (
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-xs font-bold border border-red-200">Read Only Mode</span>
                )}
            </div>
        </div>
        
        {/* Tab Switcher */}
        <div className="bg-slate-100 p-1 rounded-lg flex">
            <button 
                onClick={() => setActiveTab('structure')}
                className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'structure' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Building size={16} />
                Cơ cấu
            </button>
            <button 
                onClick={() => setActiveTab('hr')}
                className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'hr' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Users size={16} />
                Nhân sự
            </button>
        </div>
      </div>

      {/* --- STRUCTURE TAB CONTENT --- */}
      {activeTab === 'structure' && (
          <>
            {!isLocked && (
                <p className="text-xs text-blue-600 italic bg-blue-50 inline-block px-2 py-1 rounded mb-4 w-fit">
                Mẹo: Nhấp đúp (double-click) vào tên hoặc mã đơn vị để chỉnh sửa trực tiếp.
                </p>
            )}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Level 1: Faculty/Institute */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center">
                    <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-xs font-bold">1</span>
                    Khoa / Viện / Phòng Ban
                    </h3>
                    <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{level1Units.length}</span>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-2">
                    {level1Units.length === 0 && <p className="text-slate-400 text-sm italic">Chưa có dữ liệu</p>}
                    {level1Units.map(unit => renderUnitItem(unit, selectedFacultyId === unit.unit_id, () => {
                        setSelectedFacultyId(unit.unit_id);
                    }))}
                </div>
                </div>

                {/* Level 2: Department */}
                <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden ${!selectedFacultyId ? 'opacity-50' : ''}`}>
                <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center">
                    <span className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center mr-2 text-xs font-bold">2</span>
                    Bộ môn / Tổ chuyên môn
                    </h3>
                    <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{level2Units.length}</span>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-2">
                    {!selectedFacultyId ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                            <p>← Chọn Khoa/Viện ở cột bên trái</p>
                        </div>
                    ) : (
                        <>
                            {level2Units.length === 0 && <p className="text-slate-400 text-sm italic">Chưa có bộ môn trực thuộc.</p>}
                            {level2Units.map(unit => renderUnitItem(unit, false, () => {}))}
                        </>
                    )}
                </div>
                </div>
            </div>

            {/* Add New Unit Form */}
            <div className={`bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-shrink-0 transition-opacity ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide">Thêm đơn vị mới</h3>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-48">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Cấp độ</label>
                    <select 
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={addLevel}
                    onChange={(e) => setAddLevel(e.target.value as any)}
                    disabled={isLocked}
                    >
                    <option value="department">Cấp Bộ môn</option>
                    <option value="faculty">Cấp Khoa/Phòng</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tên Đơn vị</label>
                    <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder={addLevel === 'department' ? 'VD: Bộ môn Hệ thống nhúng' : 'VD: Khoa CNTT'}
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    disabled={isLocked}
                    />
                </div>
                <div className="w-full md:w-40">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Mã (Code)</label>
                    <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
                    placeholder="CODE"
                    value={newUnitCode}
                    onChange={(e) => setNewUnitCode(e.target.value)}
                    disabled={isLocked}
                    />
                </div>
                <button 
                    onClick={handleAdd}
                    disabled={!newUnitName || !newUnitCode || isLocked}
                    className={`px-6 py-2 rounded-lg font-medium text-white text-sm transition-colors ${
                    !newUnitName || !newUnitCode || isLocked ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    Thêm Mới
                </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                    {addLevel === 'department' && selectedFacultyId ? `Đang thêm vào: ${level1Units.find(f => f.unit_id === selectedFacultyId)?.unit_name}` : 
                    addLevel === 'department' ? `Vui lòng chọn Khoa ở cột 1 trước` : 
                    `Tạo đơn vị Khoa/Viện mới`}
                </p>
            </div>
          </>
      )}

      {/* --- HUMAN RESOURCES TAB CONTENT --- */}
      {activeTab === 'hr' && (
          <div className="flex flex-col h-full min-h-0">
              {/* Unit Selection Header */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Đơn vị Cấp 1 (Khoa/Viện)</label>
                      <select 
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={hrSelectedLevel1Id}
                          onChange={(e) => {
                              setHrSelectedLevel1Id(e.target.value);
                              setHrSelectedLevel2Id(''); // Reset level 2
                          }}
                      >
                          <option value="">-- Chọn đơn vị --</option>
                          {level1Units.map(u => (
                              <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                          ))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Đơn vị Cấp 2 (Bộ môn/Tổ)</label>
                      <select 
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          value={hrSelectedLevel2Id}
                          onChange={(e) => setHrSelectedLevel2Id(e.target.value)}
                          disabled={!hrSelectedLevel1Id || hrLevel2Options.length === 0}
                      >
                          <option value="">{hrLevel2Options.length === 0 ? '-- Không có cấp bộ môn --' : '-- Chọn bộ môn (Tùy chọn) --'}</option>
                          {hrLevel2Options.map(u => (
                              <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                          ))}
                      </select>
                  </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                  {!activeHrUnitId ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                          <Users size={48} className="mb-4 opacity-20" />
                          <p>Vui lòng chọn đơn vị để quản lý danh sách giảng viên</p>
                      </div>
                  ) : (
                      <>
                          {/* Toolbar */}
                          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                              <h3 className="font-bold text-slate-800">
                                  Danh sách nhân sự: <span className="text-indigo-600">{units.find(u => u.unit_id === activeHrUnitId)?.unit_name}</span>
                              </h3>
                              <button 
                                  onClick={() => setIsAddingPerson(true)}
                                  disabled={isLocked}
                                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm disabled:opacity-50"
                              >
                                  <Plus size={16} />
                                  Thêm Giảng viên
                              </button>
                          </div>

                          {/* Table */}
                          <div className="flex-1 overflow-y-auto p-0">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs sticky top-0 z-10 shadow-sm">
                                      <tr>
                                          <th className="px-6 py-3">Họ và tên</th>
                                          <th className="px-6 py-3">Học vị</th>
                                          <th className="px-6 py-3">Vai trò / Chức vụ</th>
                                          {!isLocked && <th className="px-6 py-3 text-right">Thao tác</th>}
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {activeHrList.map((item) => (
                                          <tr key={item.id} className="hover:bg-indigo-50 transition-colors">
                                              <td className="px-6 py-4 font-medium text-slate-800">
                                                  {item.faculty?.name.vi || item.faculty?.name.en}
                                              </td>
                                              <td className="px-6 py-4 text-slate-600">
                                                  {item.faculty?.degree.vi || item.faculty?.degree.en}
                                              </td>
                                              <td className="px-6 py-4">
                                                  <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold border border-slate-200">
                                                      {item.role || 'Giảng viên'}
                                                  </span>
                                              </td>
                                              {!isLocked && (
                                                  <td className="px-6 py-4 text-right">
                                                      <button 
                                                          onClick={() => handleRemovePersonFromUnit(item.id)}
                                                          className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                                          title="Xóa khỏi đơn vị"
                                                      >
                                                          <Trash2 size={16} />
                                                      </button>
                                                  </td>
                                              )}
                                          </tr>
                                      ))}
                                      {activeHrList.length === 0 && (
                                          <tr>
                                              <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                                  Chưa có giảng viên nào được gán vào đơn vị này.
                                              </td>
                                          </tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </>
                  )}

                  {/* Add Person Modal Overlay */}
                  {isAddingPerson && (
                      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80%]">
                              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                  <h3 className="font-bold text-slate-800">Thêm Giảng viên vào Đơn vị</h3>
                                  <button onClick={() => setIsAddingPerson(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                              </div>
                              <div className="p-4">
                                  <div className="relative mb-4">
                                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <input 
                                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                          placeholder="Tìm tên giảng viên..."
                                          value={personSearchQuery}
                                          onChange={(e) => setPersonSearchQuery(e.target.value)}
                                          autoFocus
                                      />
                                  </div>
                                  <div className="overflow-y-auto max-h-[300px] space-y-1 pr-1 custom-scrollbar">
                                      {faculties
                                          .filter(f => !activeHrList.some(hr => hr.facultyId === f.id)) // Exclude already added
                                          .filter(f => (f.name.vi + f.name.en).toLowerCase().includes(personSearchQuery.toLowerCase()))
                                          .map(f => (
                                              <button 
                                                  key={f.id}
                                                  onClick={() => handleAddPersonToUnit(f.id)}
                                                  className="w-full text-left p-3 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all flex items-center justify-between group"
                                              >
                                                  <div>
                                                      <p className="font-bold text-sm text-slate-800">{f.name.vi || f.name.en}</p>
                                                      <p className="text-xs text-slate-500 flex items-center gap-1">
                                                          <GraduationCap size={12} /> {f.degree.vi || f.degree.en}
                                                      </p>
                                                  </div>
                                                  <Plus size={16} className="text-indigo-600 opacity-0 group-hover:opacity-100" />
                                              </button>
                                          ))
                                      }
                                      {faculties.length === 0 && <p className="text-center text-sm text-slate-400 py-4">Không tìm thấy dữ liệu giảng viên gốc.</p>}
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default OrganizationModule;