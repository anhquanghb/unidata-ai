import React, { useState } from 'react';
import { Unit } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface OrganizationModuleProps {
  units: Unit[];
  onAddUnit: (unit: Unit) => void;
  onUpdateUnit: (unit: Unit) => void;
  onRemoveUnit: (id: string) => void;
  isLocked: boolean;
}

const OrganizationModule: React.FC<OrganizationModuleProps> = ({ units, onAddUnit, onUpdateUnit, onRemoveUnit, isLocked }) => {
  // Selection State
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);

  // New Unit State
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitCode, setNewUnitCode] = useState('');
  const [addLevel, setAddLevel] = useState<'faculty' | 'department'>('department');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  // Filter Data
  const faculties = units.filter(u => u.type === 'faculty');
  const departments = units.filter(u => u.type === 'department' && (!selectedFacultyId || u.parentId === selectedFacultyId));

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
      id: uuidv4(),
      name: newUnitName,
      code: newUnitCode,
      type: addLevel,
      parentId: parentId
    };
    
    onAddUnit(newUnit);
    setNewUnitName('');
    setNewUnitCode('');
  };

  const startEditing = (unit: Unit) => {
    if (isLocked) return;
    setEditingId(unit.id);
    setEditName(unit.name);
    setEditCode(unit.code);
  };

  const saveEditing = (originalUnit: Unit) => {
    if (editName.trim() === '' || editCode.trim() === '') {
        alert("Tên và Mã không được để trống");
        return;
    }
    onUpdateUnit({
        ...originalUnit,
        name: editName,
        code: editCode
    });
    setEditingId(null);
  };

  const cancelEditing = () => {
      setEditingId(null);
  };

  // Helper to render a list item with inline editing
  const renderUnitItem = (unit: Unit, isSelected: boolean, onClick: () => void) => {
    const isEditing = editingId === unit.id;

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
        <div>
          <span className={`font-medium block ${isSelected ? 'text-blue-800' : 'text-slate-800'}`}>{unit.name}</span>
          <span className="text-xs text-slate-500 uppercase font-mono">{unit.code}</span>
        </div>
        {!isLocked && (
            <button 
            onClick={(e) => { e.stopPropagation(); onRemoveUnit(unit.id); }}
            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
            title="Xóa đơn vị"
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-2xl font-bold text-slate-800">Quản lý Cơ cấu Tổ chức (Cấp Trường)</h2>
        <div className="flex items-center gap-3 mb-2">
             <p className="text-slate-600">Quản lý danh mục các Khoa/Viện và Bộ môn trực thuộc.</p>
             {isLocked && (
                 <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-xs font-bold border border-red-200">Read Only Mode</span>
             )}
        </div>
        {!isLocked && (
            <p className="text-xs text-blue-600 italic bg-blue-50 inline-block px-2 py-1 rounded">
            Mẹo: Nhấp đúp (double-click) vào tên hoặc mã đơn vị để chỉnh sửa trực tiếp.
            </p>
        )}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Level 1: Faculty/Institute */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center">
              <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-xs font-bold">1</span>
              Khoa / Viện / Phòng Ban
            </h3>
            <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{faculties.length}</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-2">
            {faculties.length === 0 && <p className="text-slate-400 text-sm italic">Chưa có dữ liệu</p>}
            {faculties.map(unit => renderUnitItem(unit, selectedFacultyId === unit.id, () => {
                setSelectedFacultyId(unit.id);
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
            <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{departments.length}</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-2">
            {!selectedFacultyId ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                    <p>← Chọn Khoa/Viện ở cột bên trái</p>
                </div>
            ) : (
                <>
                    {departments.length === 0 && <p className="text-slate-400 text-sm italic">Chưa có bộ môn trực thuộc.</p>}
                    {departments.map(unit => renderUnitItem(unit, false, () => {}))}
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
            {addLevel === 'department' && selectedFacultyId ? `Đang thêm vào: ${faculties.find(f => f.id === selectedFacultyId)?.name}` : 
             addLevel === 'department' ? `Vui lòng chọn Khoa ở cột 1 trước` : 
             `Tạo đơn vị Khoa/Viện mới`}
        </p>
      </div>
    </div>
  );
};

export default OrganizationModule;
