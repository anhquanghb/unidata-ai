import React, { useState } from 'react';
import { Unit, Faculty, HumanResourceRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Edit2, ChevronRight, ChevronDown, Building, User, Save, X } from 'lucide-react';

interface OrganizationModuleProps {
  units: Unit[];
  onUpdateUnits: (units: Unit[]) => void;
  faculties: Faculty[];
  humanResources: HumanResourceRecord[];
  onUpdateHumanResources: (records: HumanResourceRecord[]) => void;
}

const OrganizationModule: React.FC<OrganizationModuleProps> = ({ 
  units, 
  onUpdateUnits, 
  faculties, 
  humanResources, 
  onUpdateHumanResources 
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  
  // Unit Editing State
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [isEditingUnit, setIsEditingUnit] = useState(false);
  const [tempUnit, setTempUnit] = useState<Partial<Unit>>({});

  // Personnel Adding State
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [personToAdd, setPersonToAdd] = useState<string>(''); // Faculty ID

  // --- Unit Tree Helpers ---
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedUnits(newExpanded);
  };

  const getChildUnits = (parentId?: string) => {
    return units.filter(u => u.unit_parentId === parentId || (!parentId && !u.unit_parentId));
  };

  const handleDeleteUnit = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa đơn vị này? Các đơn vị con cũng sẽ bị xóa.")) {
      const idsToDelete = new Set<string>();
      const collectIds = (uid: string) => {
        idsToDelete.add(uid);
        units.filter(u => u.unit_parentId === uid).forEach(c => collectIds(c.unit_id));
      };
      collectIds(id);
      onUpdateUnits(units.filter(u => !idsToDelete.has(u.unit_id)));
      if (selectedUnitId && idsToDelete.has(selectedUnitId)) setSelectedUnitId(null);
    }
  };

  const handleSaveUnit = () => {
    if (!tempUnit.unit_name || !tempUnit.unit_code) return;
    
    if (isEditingUnit && tempUnit.unit_id) {
      onUpdateUnits(units.map(u => u.unit_id === tempUnit.unit_id ? { ...u, ...tempUnit } as Unit : u));
    } else {
      const newUnit: Unit = {
        unit_id: uuidv4(),
        unit_name: tempUnit.unit_name,
        unit_code: tempUnit.unit_code,
        unit_type: tempUnit.unit_type || 'department',
        unit_parentId: tempUnit.unit_parentId
      };
      onUpdateUnits([...units, newUnit]);
    }
    setIsAddingUnit(false);
    setIsEditingUnit(false);
    setTempUnit({});
  };

  // --- Personnel Helpers ---
  const handleAddPersonnel = () => {
    if (!selectedUnitId || !personToAdd) return;
    
    // Fix: Using the logic from the user's snippet requirement
    const facultyId = personToAdd;
    const activeHrUnitId = selectedUnitId;

    const newRecord: HumanResourceRecord = {
        id: uuidv4(),
        unitId: activeHrUnitId,
        facultyId: facultyId,
        role: 'Giảng viên', // Default role
        assignedDate: new Date().toISOString(),
        startDate: new Date().toISOString(), // Default start date is now
        endDate: undefined // Default is open-ended
    };

    onUpdateHumanResources([...humanResources, newRecord]);
    setIsAddingPerson(false);
    setPersonToAdd('');
  };

  const handleRemovePersonnel = (recordId: string) => {
    if (confirm("Xóa nhân sự khỏi đơn vị này?")) {
      onUpdateHumanResources(humanResources.filter(hr => hr.id !== recordId));
    }
  };

  // --- Renderers ---
  const renderUnitNode = (unit: Unit, level: number = 0) => {
    const children = getChildUnits(unit.unit_id);
    const isExpanded = expandedUnits.has(unit.unit_id);
    const isSelected = selectedUnitId === unit.unit_id;

    return (
      <div key={unit.unit_id} className="select-none">
        <div 
          className={`flex items-center py-2 px-2 hover:bg-slate-100 cursor-pointer rounded-lg transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => setSelectedUnitId(unit.unit_id)}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); toggleExpand(unit.unit_id); }}
            className={`p-1 mr-1 rounded hover:bg-slate-200 ${children.length === 0 ? 'invisible' : ''}`}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          <Building size={16} className={`mr-2 ${unit.unit_type === 'school' ? 'text-indigo-600' : unit.unit_type === 'faculty' ? 'text-blue-600' : 'text-slate-500'}`} />
          <span className="text-sm font-medium truncate flex-1">{unit.unit_name}</span>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
             {/* Actions could go here */}
          </div>
        </div>
        
        {isExpanded && children.map(child => renderUnitNode(child, level + 1))}
      </div>
    );
  };

  const selectedUnit = units.find(u => u.unit_id === selectedUnitId);
  const selectedUnitPersonnel = humanResources.filter(hr => hr.unitId === selectedUnitId);

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar: Tree */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-800">Cơ cấu Tổ chức</h3>
          <button 
            onClick={() => { setTempUnit({}); setIsAddingUnit(true); }}
            className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {getChildUnits(undefined).map(u => renderUnitNode(u))}
          {units.length === 0 && <p className="text-slate-400 text-sm text-center mt-10">Chưa có đơn vị nào.</p>}
        </div>
      </div>

      {/* Main: Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedUnit ? (
          <>
            <div className="p-6 border-b border-slate-200 bg-white">
               <div className="flex justify-between items-start mb-4">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedUnit.unit_name}</h2>
                    <div className="flex gap-4 mt-2 text-sm text-slate-500">
                      <span>Mã: <code className="bg-slate-100 px-1 rounded">{selectedUnit.unit_code}</code></span>
                      <span className="capitalize">Loại: {selectedUnit.unit_type}</span>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => { setTempUnit(selectedUnit); setIsEditingUnit(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm font-medium hover:bg-slate-50"
                    >
                      <Edit2 size={14}/> Sửa
                    </button>
                    <button 
                      onClick={() => handleDeleteUnit(selectedUnit.unit_id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded text-sm font-medium hover:bg-red-50"
                    >
                      <Trash2 size={14}/> Xóa
                    </button>
                 </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
               <div className="flex justify-between items-center mb-4">
                 <h4 className="font-bold text-slate-700">Danh sách Nhân sự ({selectedUnitPersonnel.length})</h4>
                 <button 
                    onClick={() => setIsAddingPerson(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-bold hover:bg-indigo-700"
                 >
                    <Plus size={14}/> Thêm Nhân sự
                 </button>
               </div>
               
               <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Họ và tên</th>
                        <th className="px-4 py-3">Vai trò</th>
                        <th className="px-4 py-3">Ngày bắt đầu</th>
                        <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedUnitPersonnel.map(hr => {
                        const faculty = faculties.find(f => f.id === hr.facultyId);
                        return (
                          <tr key={hr.id} className="hover:bg-slate-50">
                             <td className="px-4 py-3 font-medium text-slate-800">
                               {faculty ? faculty.name.vi : <span className="text-red-400 italic">Nhân sự không tồn tại</span>}
                             </td>
                             <td className="px-4 py-3">{hr.role}</td>
                             <td className="px-4 py-3 text-slate-500">{new Date(hr.startDate || '').toLocaleDateString('vi-VN')}</td>
                             <td className="px-4 py-3 text-right">
                               <button 
                                 onClick={() => handleRemovePersonnel(hr.id)}
                                 className="text-slate-400 hover:text-red-500"
                               >
                                 <Trash2 size={14}/>
                               </button>
                             </td>
                          </tr>
                        );
                      })}
                      {selectedUnitPersonnel.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">Chưa có nhân sự trong đơn vị này.</td></tr>
                      )}
                    </tbody>
                 </table>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 flex-col">
            <Building size={48} className="mb-4 opacity-20"/>
            <p>Chọn một đơn vị để xem chi tiết.</p>
          </div>
        )}
      </div>

      {/* Modal: Add/Edit Unit */}
      {(isAddingUnit || isEditingUnit) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-xl p-6 w-96">
              <h3 className="font-bold text-lg mb-4">{isEditingUnit ? 'Cập nhật Đơn vị' : 'Thêm Đơn vị Mới'}</h3>
              <div className="space-y-3">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tên đơn vị</label>
                    <input className="w-full p-2 border border-slate-300 rounded text-sm" value={tempUnit.unit_name || ''} onChange={e => setTempUnit({...tempUnit, unit_name: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Mã đơn vị</label>
                    <input className="w-full p-2 border border-slate-300 rounded text-sm uppercase" value={tempUnit.unit_code || ''} onChange={e => setTempUnit({...tempUnit, unit_code: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Loại</label>
                    <select className="w-full p-2 border border-slate-300 rounded text-sm" value={tempUnit.unit_type || 'department'} onChange={e => setTempUnit({...tempUnit, unit_type: e.target.value as any})}>
                       <option value="school">Trường (School)</option>
                       <option value="faculty">Khoa/Viện (Faculty)</option>
                       <option value="department">Bộ môn/Phòng ban (Department)</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Đơn vị cha</label>
                    <select className="w-full p-2 border border-slate-300 rounded text-sm" value={tempUnit.unit_parentId || ''} onChange={e => setTempUnit({...tempUnit, unit_parentId: e.target.value || undefined})}>
                       <option value="">-- Không (Gốc) --</option>
                       {units.filter(u => u.unit_id !== tempUnit.unit_id).map(u => (
                         <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                       ))}
                    </select>
                 </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                 <button onClick={() => { setIsAddingUnit(false); setIsEditingUnit(false); }} className="px-4 py-2 text-slate-600 font-bold text-sm">Hủy</button>
                 <button onClick={handleSaveUnit} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm">Lưu</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Add Personnel */}
      {isAddingPerson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-xl p-6 w-96">
              <h3 className="font-bold text-lg mb-4">Thêm Nhân sự vào {selectedUnit?.unit_name}</h3>
              <div className="mb-4">
                 <label className="block text-xs font-bold text-slate-500 mb-1">Chọn Nhân sự</label>
                 <select 
                   className="w-full p-2 border border-slate-300 rounded text-sm"
                   value={personToAdd}
                   onChange={(e) => setPersonToAdd(e.target.value)}
                 >
                    <option value="">-- Chọn nhân sự --</option>
                    {faculties.map(f => (
                      <option key={f.id} value={f.id}>{f.name.vi} ({f.email})</option>
                    ))}
                 </select>
              </div>
              <div className="flex justify-end gap-2">
                 <button onClick={() => setIsAddingPerson(false)} className="px-4 py-2 text-slate-600 font-bold text-sm">Hủy</button>
                 <button onClick={handleAddPersonnel} disabled={!personToAdd} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold text-sm disabled:bg-slate-300">Thêm</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationModule;