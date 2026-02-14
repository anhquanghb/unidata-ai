import React, { useState, useMemo } from 'react';
import { Unit, Faculty, HumanResourceRecord, PermissionProfile } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Edit2, ChevronRight, ChevronDown, Building, User, Save, X, Search, Calendar, ArrowRight, Check, Download, Lock, Shield } from 'lucide-react';

interface OrganizationModuleProps {
  units: Unit[];
  onUpdateUnits: (units: Unit[]) => void;
  faculties: Faculty[];
  humanResources: HumanResourceRecord[];
  onUpdateHumanResources: (records: HumanResourceRecord[]) => void;
  onExportUnitData?: (unitId: string) => void;
  permission?: PermissionProfile; 
}

const OrganizationModule: React.FC<OrganizationModuleProps> = ({ 
  units, 
  onUpdateUnits, 
  faculties, 
  humanResources, 
  onUpdateHumanResources,
  onExportUnitData,
  permission
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  
  // Unit Editing State
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [isEditingUnit, setIsEditingUnit] = useState(false);
  const [tempUnit, setTempUnit] = useState<Partial<Unit>>({});

  // Personnel Adding State
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [personSearchTerm, setPersonSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [isTransfer, setIsTransfer] = useState(false); 

  // Personnel Inline Editing State (Start Date)
  const [editingHrId, setEditingHrId] = useState<string | null>(null);
  const [editJoinDate, setEditJoinDate] = useState('');

  // --- Permission Check Helpers ---
  const role = permission?.role || 'school_admin';
  const managedUnitId = permission?.managedUnitId;

  // Helper to check if a unit is a descendant of another
  const isDescendant = (targetId: string, rootId: string): boolean => {
      const children = units.filter(u => u.unit_parentId === rootId);
      if (children.some(c => c.unit_id === targetId)) return true;
      return children.some(c => isDescendant(targetId, c.unit_id));
  };

  // Check if user can edit structure of a specific unit
  const canEditTargetUnit = (unitId: string) => {
      if (role === 'school_admin') return true;
      if (role === 'unit_manager' && managedUnitId) {
          // Cannot edit the managed root unit itself (e.g., delete/rename self)
          if (unitId === managedUnitId) return false;
          // Can edit if it is a descendant of managed unit
          return isDescendant(unitId, managedUnitId);
      }
      return false;
  };

  // Check if user can add a child to a specific unit
  const canAddChildToUnit = (unitId: string) => {
      if (role === 'school_admin') return true;
      if (role === 'unit_manager' && managedUnitId) {
          // Can add child to managed root or its descendants
          return unitId === managedUnitId || isDescendant(unitId, managedUnitId);
      }
      return false;
  };

  // Can Add Root/Sibling Unit? Only School Admin
  const canAddRootUnit = role === 'school_admin';

  // --- Helpers ---
  const getFacultyCurrentUnit = (facultyId: string) => {
      // Find active record (no endDate or endDate in future)
      const activeRecord = humanResources.find(hr => 
          hr.facultyId === facultyId && 
          (!hr.endDate || new Date(hr.endDate) > new Date())
      );
      if (!activeRecord) return null;
      return units.find(u => u.unit_id === activeRecord.unitId);
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedUnits(newExpanded);
  };

  const getChildUnits = (parentId?: string) => {
    return units.filter(u => u.unit_parentId === parentId || (!parentId && !u.unit_parentId));
  };

  // --- Unit Actions ---
  const handleDeleteUnit = (id: string) => {
    if (!canEditTargetUnit(id)) return;
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
    // Verify permission again
    if (!tempUnit.unit_parentId && !canAddRootUnit) {
        alert("Bạn không có quyền thêm đơn vị cấp cao nhất.");
        return;
    }
    if (tempUnit.unit_parentId && !canAddChildToUnit(tempUnit.unit_parentId)) {
        alert("Bạn không có quyền thêm đơn vị vào trực thuộc đơn vị này.");
        return;
    }

    if (!tempUnit.unit_name || !tempUnit.unit_code) return;
    
    if (isEditingUnit && tempUnit.unit_id) {
      if (!canEditTargetUnit(tempUnit.unit_id)) return;
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

  // --- Personnel Actions ---
  const handleAddPersonnel = () => {
    if (!selectedUnitId || !selectedPersonId) return;
    
    let updatedHR = [...humanResources];

    // Handle Transfer Logic: Close old record if exists and isTransfer is true
    if (isTransfer) {
        const currentActive = humanResources.find(hr => 
            hr.facultyId === selectedPersonId && 
            (!hr.endDate || new Date(hr.endDate) > new Date())
        );
        
        if (currentActive) {
            // Set end date of old record to day before join date
            const endDate = new Date(joinDate);
            endDate.setDate(endDate.getDate() - 1);
            
            updatedHR = updatedHR.map(hr => 
                hr.id === currentActive.id 
                ? { ...hr, endDate: endDate.toISOString().split('T')[0] } 
                : hr
            );
        }
    }

    const newRecord: HumanResourceRecord = {
        id: uuidv4(),
        unitId: selectedUnitId,
        facultyId: selectedPersonId,
        role: 'Giảng viên', // Default role
        assignedDate: new Date().toISOString(),
        startDate: joinDate, 
        endDate: undefined 
    };

    onUpdateHumanResources([...updatedHR, newRecord]);
    
    // Reset UI
    setIsAddingPerson(false);
    setSelectedPersonId(null);
    setPersonSearchTerm('');
    setIsTransfer(false);
  };

  const handleRemovePersonnel = (recordId: string) => {
    if (confirm("Xóa nhân sự khỏi đơn vị này?")) {
      onUpdateHumanResources(humanResources.filter(hr => hr.id !== recordId));
    }
  };

  const handleStartEditDate = (hr: HumanResourceRecord) => {
      setEditingHrId(hr.id);
      setEditJoinDate(hr.startDate ? hr.startDate.split('T')[0] : '');
  };

  const handleSaveEditDate = () => {
      if (editingHrId) {
          onUpdateHumanResources(humanResources.map(hr => 
              hr.id === editingHrId ? { ...hr, startDate: editJoinDate } : hr
          ));
          setEditingHrId(null);
      }
  };

  // --- Renderers ---
  const renderUnitNode = (unit: Unit, level: number = 0) => {
    const children = getChildUnits(unit.unit_id);
    const isExpanded = expandedUnits.has(unit.unit_id);
    const isSelected = selectedUnitId === unit.unit_id;

    // Auto expand if unit is managed unit
    // if (managedUnitId === unit.unit_id && !expandedUnits.has(unit.unit_id)) toggleExpand(unit.unit_id);

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
          {managedUnitId === unit.unit_id && <span title="Managed Unit"><Shield size={12} className="text-amber-500 ml-1" /></span>}
        </div>
        
        {isExpanded && children.map(child => renderUnitNode(child, level + 1))}
      </div>
    );
  };

  const selectedUnit = units.find(u => u.unit_id === selectedUnitId);
  
  // Filter personnel for the selected unit
  const selectedUnitPersonnel = humanResources.filter(hr => 
      hr.unitId === selectedUnitId && 
      (!hr.endDate || new Date(hr.endDate) > new Date()) // Only show active
  );

  // Filter for adding personnel modal
  const filteredCandidates = useMemo(() => {
      if (!personSearchTerm.trim()) return [];
      return faculties.filter(f => 
          f.name.vi.toLowerCase().includes(personSearchTerm.toLowerCase()) || 
          f.email?.toLowerCase().includes(personSearchTerm.toLowerCase())
      ).slice(0, 5); // Limit results
  }, [personSearchTerm, faculties]);

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar: Tree */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-800">Cơ cấu Tổ chức</h3>
          {canAddRootUnit && (
              <button 
                onClick={() => { setTempUnit({}); setIsAddingUnit(true); }}
                className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                title="Thêm Đơn vị Gốc (Root)"
              >
                <Plus size={16} />
              </button>
          )}
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
                    {onExportUnitData && (
                        <button 
                            onClick={() => onExportUnitData(selectedUnit.unit_id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-sm font-medium hover:bg-indigo-100 transition-colors"
                            title="Xuất dữ liệu đơn vị này (Bao gồm cấu trúc, nhân sự và thông tin liên quan)"
                        >
                            <Download size={14}/> Xuất JSON
                        </button>
                    )}
                    {/* Add Sub-unit button logic */}
                    {canAddChildToUnit(selectedUnit.unit_id) && (
                        <button 
                            onClick={() => { 
                                setTempUnit({ unit_parentId: selectedUnit.unit_id }); 
                                setIsAddingUnit(true); 
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-green-200 text-green-700 rounded text-sm font-medium hover:bg-green-50"
                            title="Thêm đơn vị con trực thuộc"
                        >
                            <Plus size={14}/> Thêm Cấp dưới
                        </button>
                    )}

                    {canEditTargetUnit(selectedUnit.unit_id) ? (
                        <>
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
                        </>
                    ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100" title="Bạn không có quyền sửa đơn vị này">
                            <Lock size={12}/> Locked
                        </span>
                    )}
                 </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
               <div className="flex justify-between items-center mb-4">
                 <h4 className="font-bold text-slate-700">Danh sách Nhân sự ({selectedUnitPersonnel.length})</h4>
                 <button 
                    onClick={() => {
                        setIsAddingPerson(true);
                        setJoinDate(new Date().toISOString().split('T')[0]);
                        setPersonSearchTerm('');
                        setSelectedPersonId(null);
                    }}
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
                             <td className="px-4 py-3 text-slate-500">
                                {editingHrId === hr.id ? (
                                    <div className="flex items-center gap-1">
                                        <input 
                                            type="date" 
                                            className="p-1 border border-slate-300 rounded text-xs" 
                                            value={editJoinDate} 
                                            onChange={e => setEditJoinDate(e.target.value)}
                                        />
                                        <button onClick={handleSaveEditDate} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={14}/></button>
                                        <button onClick={() => setEditingHrId(null)} className="text-red-400 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group">
                                        <span>{new Date(hr.startDate || '').toLocaleDateString('vi-VN')}</span>
                                        <button onClick={() => handleStartEditDate(hr)} className="text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit2 size={12}/>
                                        </button>
                                    </div>
                                )}
                             </td>
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
                    <select 
                        className="w-full p-2 border border-slate-300 rounded text-sm" 
                        value={tempUnit.unit_parentId || ''} 
                        onChange={e => setTempUnit({...tempUnit, unit_parentId: e.target.value || undefined})}
                        disabled={!!tempUnit.unit_parentId && isAddingUnit} // If adding specifically to a parent, lock it
                    >
                       <option value="">-- Không (Gốc) --</option>
                       {units.filter(u => {
                           // Filter logic:
                           // 1. Cannot be self (loop)
                           if (u.unit_id === tempUnit.unit_id) return false;
                           // 2. Unit Manager Constraint: Parent must be manageable
                           if (!canAddChildToUnit(u.unit_id)) return false; 
                           
                           return true;
                       }).map(u => (
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

      {/* Modal: Add Personnel (Searchable & Transfer Logic) */}
      {isAddingPerson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           {/* ... Personnel Modal content (same as before) ... */}
           <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
              <h3 className="font-bold text-lg mb-4">Thêm Nhân sự vào {selectedUnit?.unit_name}</h3>
              
              <div className="space-y-4">
                 {/* 1. Search */}
                 <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">Tìm kiếm nhân sự</label>
                     <div className="relative">
                         <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                         <input 
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Nhập tên hoặc email..."
                            value={personSearchTerm}
                            onChange={(e) => { setPersonSearchTerm(e.target.value); setSelectedPersonId(null); }}
                         />
                     </div>
                     
                     {/* Search Results */}
                     {personSearchTerm && !selectedPersonId && (
                         <div className="mt-1 border border-slate-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm">
                             {filteredCandidates.map(f => {
                                 const currentUnit = getFacultyCurrentUnit(f.id);
                                 return (
                                     <div 
                                        key={f.id} 
                                        className="p-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-sm"
                                        onClick={() => setSelectedPersonId(f.id)}
                                     >
                                         <div>
                                             <div className="font-medium text-slate-800">{f.name.vi}</div>
                                             <div className="text-xs text-slate-500">{f.email}</div>
                                         </div>
                                         {currentUnit && (
                                             <div className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 border border-slate-200">
                                                 {currentUnit.unit_name}
                                             </div>
                                         )}
                                     </div>
                                 );
                             })}
                             {filteredCandidates.length === 0 && (
                                 <div className="p-3 text-center text-xs text-slate-400">Không tìm thấy nhân sự.</div>
                             )}
                         </div>
                     )}
                 </div>

                 {/* 2. Selected Person Details & Config */}
                 {selectedPersonId && (
                     <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                         <div className="flex items-center gap-3 mb-4">
                             <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                 {faculties.find(f => f.id === selectedPersonId)?.name.vi.charAt(0)}
                             </div>
                             <div>
                                 <div className="font-bold text-slate-800">{faculties.find(f => f.id === selectedPersonId)?.name.vi}</div>
                                 <div className="text-xs text-slate-500">{faculties.find(f => f.id === selectedPersonId)?.email}</div>
                             </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 mb-1">Ngày bắt đầu</label>
                                 <div className="relative">
                                     <Calendar size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                     <input 
                                        type="date" 
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                        value={joinDate}
                                        onChange={(e) => setJoinDate(e.target.value)}
                                     />
                                 </div>
                             </div>
                             
                             {/* Transfer Option */}
                             {getFacultyCurrentUnit(selectedPersonId) && getFacultyCurrentUnit(selectedPersonId)?.unit_id !== selectedUnitId && (
                                 <div className="col-span-2 pt-2 border-t border-slate-200 mt-2">
                                     <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                         <div className="mt-0.5"><ArrowRight size={16} className="text-amber-600"/></div>
                                         <div className="flex-1">
                                             <p className="text-xs text-amber-800 mb-1">
                                                 Nhân sự này đang thuộc: <strong>{getFacultyCurrentUnit(selectedPersonId)?.unit_name}</strong>
                                             </p>
                                             <label className="flex items-center cursor-pointer">
                                                 <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                                                    checked={isTransfer}
                                                    onChange={(e) => setIsTransfer(e.target.checked)}
                                                 />
                                                 <span className="ml-2 text-sm font-medium text-slate-700">Chuyển công tác (Rời đơn vị cũ)</span>
                                             </label>
                                         </div>
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>
                 )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                 <button onClick={() => setIsAddingPerson(false)} className="px-4 py-2 text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">Hủy</button>
                 <button onClick={handleAddPersonnel} disabled={!selectedPersonId} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm disabled:bg-slate-300 disabled:cursor-not-allowed">Xác nhận Thêm</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationModule;