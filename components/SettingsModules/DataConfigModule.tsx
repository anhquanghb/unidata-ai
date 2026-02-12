import React, { useState } from 'react';
import { DataConfigGroup, DataFieldDefinition, DataFieldType, DataFieldOption } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Edit2, Save, X, Settings, List, Type, CheckSquare, Calendar, Link, Bot, Copy, Check, ArrowRight, FileJson, FileText, Layers, Search, Filter } from 'lucide-react';

interface DataConfigModuleProps {
  groups: DataConfigGroup[];
  onUpdateGroups: (groups: DataConfigGroup[]) => void;
}

const FIELD_TYPES: { type: DataFieldType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Văn bản (String)', icon: <Type size={14} /> },
  { type: 'textarea', label: 'Đoạn văn (Textarea)', icon: <List size={14} /> },
  { type: 'number_int', label: 'Số nguyên (Integer)', icon: <span className="text-[10px] font-bold">123</span> },
  { type: 'number_float', label: 'Số thực (Float)', icon: <span className="text-[10px] font-bold">1.5</span> },
  { type: 'date', label: 'Ngày tháng (Date)', icon: <Calendar size={14} /> },
  { type: 'boolean', label: 'Đúng/Sai (Boolean)', icon: <CheckSquare size={14} /> },
  { type: 'select_single', label: 'Chọn một (Enum)', icon: <List size={14} /> },
  { type: 'select_multiple', label: 'Chọn nhiều (Enum)', icon: <List size={14} /> },
  { type: 'reference', label: 'Tham chiếu Đơn (Lookup)', icon: <Link size={14} /> },
  { type: 'reference_multiple', label: 'Tham chiếu Nhiều (Multi-Lookup)', icon: <Layers size={14} /> },
  { type: 'file', label: 'Tập tin (File Upload)', icon: <FileText size={14} /> },
];

const PROMPT_TEMPLATE = `Bạn là chuyên gia kiến trúc dữ liệu cho hệ thống UniData. Hãy tạo cấu hình JSON cho một Nhóm Dữ liệu (DataConfigGroup).

Yêu cầu cấu trúc JSON (TypeScript Interface):
interface DataConfigGroup {
  name: string;        // Tên nhóm (Ví dụ: Quản lý Đề tài)
  description?: string;
  fields: DataFieldDefinition[];
}

interface DataFieldDefinition {
  key: string;       // CamelCase, duy nhất (VD: topicName)
  label: string;     // Tên hiển thị (VD: Tên đề tài)
  type: 'text' | 'textarea' | 'number_int' | 'number_float' | 'date' | 'boolean' | 'select_single' | 'select_multiple' | 'reference' | 'reference_multiple' | 'file';
  required: boolean;
  isFilterable?: boolean; // Cho phép lọc
  isSearchable?: boolean; // Cho phép tìm kiếm
  // Chỉ dùng khi type là select_single/select_multiple
  options?: { label: string; value: string; }[]; 
  // Chỉ dùng khi type là reference/reference_multiple
  referenceTarget?: 'units' | 'academicYears' | 'faculties'; 
}

Hãy giải thích về dữ liệu mà bạn chuẩn bị tạo và hỏi tôi về việc tạo mã JSON. Nếu tôi đồng ý tạo mã JSON thì bạn chỉ trả về mã JSON hợp lệ (Object), không thêm text giải thích.

Sau khi bạn hiểu yêu cầu trên, tôi sẽ nói về chủ đề dữ liệu mà tôi cần tạo.
`;

const DataConfigModule: React.FC<DataConfigModuleProps> = ({ groups, onUpdateGroups }) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(groups.length > 0 ? groups[0].id : null);
  const [isEditingGroup, setIsEditingGroup] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  
  // Field Editor State
  const [isEditingField, setIsEditingField] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [tempField, setTempField] = useState<DataFieldDefinition>({
      id: '',
      key: '',
      label: '',
      type: 'text',
      required: false,
      isFilterable: false,
      isSearchable: false,
      options: [],
      referenceTarget: 'units'
  });

  // AI Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [previewGroup, setPreviewGroup] = useState<DataConfigGroup | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // --- Group Handlers ---
  const handleAddGroup = () => {
      const newGroup: DataConfigGroup = {
          id: uuidv4(),
          name: "Nhóm dữ liệu mới",
          fields: []
      };
      onUpdateGroups([...groups, newGroup]);
      setSelectedGroupId(newGroup.id);
  };

  const handleDeleteGroup = (id: string) => {
      if (confirm("Xóa nhóm dữ liệu này?")) {
          onUpdateGroups(groups.filter(g => g.id !== id));
          if (selectedGroupId === id) setSelectedGroupId(null);
      }
  };

  const startEditGroup = (group: DataConfigGroup) => {
      setIsEditingGroup(group.id);
      setEditGroupName(group.name);
  };

  const saveEditGroup = () => {
      if (!isEditingGroup) return;
      onUpdateGroups(groups.map(g => g.id === isEditingGroup ? { ...g, name: editGroupName } : g));
      setIsEditingGroup(null);
  };

  // --- Field Handlers ---
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const handleAddField = () => {
      setTempField({
          id: uuidv4(),
          key: '',
          label: '',
          type: 'text',
          required: false,
          isFilterable: false,
          isSearchable: false,
          options: [],
          referenceTarget: 'units'
      });
      setEditingFieldId(null);
      setIsEditingField(true);
  };

  const handleEditField = (field: DataFieldDefinition) => {
      setTempField({ ...field });
      setEditingFieldId(field.id);
      setIsEditingField(true);
  };

  const handleDeleteField = (fieldId: string) => {
      if (!selectedGroupId) return;
      if (confirm("Xóa trường dữ liệu này?")) {
          const updatedGroups = groups.map(g => {
              if (g.id === selectedGroupId) {
                  return { ...g, fields: g.fields.filter(f => f.id !== fieldId) };
              }
              return g;
          });
          onUpdateGroups(updatedGroups);
      }
  };

  const handleSaveField = () => {
      if (!selectedGroupId || !tempField.key || !tempField.label) {
          alert("Vui lòng nhập Tên trường (Key) và Nhãn hiển thị (Label)");
          return;
      }

      // Check key uniqueness in group
      const existingKey = selectedGroup?.fields.find(f => f.key === tempField.key && f.id !== (editingFieldId || ''));
      if (existingKey) {
          alert("Mã trường (Key) đã tồn tại trong nhóm này!");
          return;
      }

      const updatedGroups = groups.map(g => {
          if (g.id === selectedGroupId) {
              const newFields = editingFieldId 
                  ? g.fields.map(f => f.id === editingFieldId ? tempField : f)
                  : [...g.fields, tempField];
              return { ...g, fields: newFields };
          }
          return g;
      });

      onUpdateGroups(updatedGroups);
      setIsEditingField(false);
  };

  // --- Option Handlers (for Select types) ---
  const handleAddOption = () => {
      const newOption: DataFieldOption = { id: uuidv4(), label: '', value: '' };
      setTempField(prev => ({ ...prev, options: [...(prev.options || []), newOption] }));
  };

  const handleUpdateOption = (id: string, field: 'label' | 'value', value: string) => {
      setTempField(prev => ({
          ...prev,
          options: prev.options?.map(o => o.id === id ? { ...o, [field]: value } : o)
      }));
  };

  const handleDeleteOption = (id: string) => {
      setTempField(prev => ({
          ...prev,
          options: prev.options?.filter(o => o.id !== id)
      }));
  };

  // --- AI Import Handlers ---
  const handleCopyAiPrompt = () => {
      navigator.clipboard.writeText(PROMPT_TEMPLATE);
      alert("Đã sao chép Prompt mẫu vào clipboard! \nBạn có thể dán vào ChatGPT/Gemini để tạo cấu hình.");
  };

  const handleParseImport = () => {
      try {
          if (!importJson.trim()) {
              setImportError("Vui lòng dán mã JSON vào ô trống.");
              return;
          }
          
          let parsed;
          try {
              parsed = JSON.parse(importJson);
          } catch (e) {
              throw new Error("Cú pháp JSON không hợp lệ.");
          }

          if (!parsed.name || !Array.isArray(parsed.fields)) {
              throw new Error("JSON thiếu trường 'name' hoặc 'fields' (phải là mảng).");
          }

          // Hydrate data with IDs
          const hydratedGroup: DataConfigGroup = {
              id: uuidv4(),
              name: parsed.name,
              description: parsed.description || "",
              fields: parsed.fields.map((f: any) => ({
                  ...f,
                  id: uuidv4(),
                  required: !!f.required,
                  isFilterable: !!f.isFilterable,
                  isSearchable: !!f.isSearchable,
                  type: f.type || 'text',
                  options: f.options ? f.options.map((o: any) => ({...o, id: uuidv4()})) : [],
                  referenceTarget: f.referenceTarget || (f.type === 'reference' || f.type === 'reference_multiple' ? 'units' : undefined)
              }))
          };

          setPreviewGroup(hydratedGroup);
          setImportError(null);
      } catch (e: any) {
          setImportError(e.message);
          setPreviewGroup(null);
      }
  };

  const handleUpdatePreviewField = (fieldId: string, key: keyof DataFieldDefinition, value: any) => {
      if (!previewGroup) return;
      const updatedFields = previewGroup.fields.map(f => 
          f.id === fieldId ? { ...f, [key]: value } : f
      );
      setPreviewGroup({ ...previewGroup, fields: updatedFields });
  };

  const handleConfirmImport = () => {
      if (!previewGroup) return;
      onUpdateGroups([...groups, previewGroup]);
      setSelectedGroupId(previewGroup.id);
      setIsImportModalOpen(false);
      setImportJson('');
      setPreviewGroup(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-[600px] border border-slate-200 rounded-lg overflow-hidden bg-white relative">
        {/* Sidebar: Groups */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <h4 className="font-bold text-slate-700 text-sm">Nhóm Dữ liệu</h4>
                <div className="flex gap-1">
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                        title="Tạo bằng AI (Import JSON)"
                    >
                        <Bot size={16} />
                    </button>
                    <button onClick={handleAddGroup} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Thêm thủ công">
                        <Plus size={16} />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {groups.map(group => (
                    <div 
                        key={group.id}
                        className={`p-3 border-b border-slate-100 cursor-pointer flex justify-between items-center group/item ${selectedGroupId === group.id ? 'bg-white border-l-4 border-l-blue-500 shadow-sm' : 'hover:bg-slate-100'}`}
                        onClick={() => { setSelectedGroupId(group.id); setIsEditingField(false); }}
                    >
                        {isEditingGroup === group.id ? (
                            <input 
                                className="w-full text-sm border border-slate-300 rounded px-1"
                                value={editGroupName}
                                onChange={(e) => setEditGroupName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveEditGroup()}
                                autoFocus
                                onBlur={saveEditGroup}
                            />
                        ) : (
                            <span className="text-sm font-medium text-slate-700 truncate">{group.name}</span>
                        )}
                        
                        <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                             <button onClick={(e) => { e.stopPropagation(); startEditGroup(group); }} className="text-slate-400 hover:text-blue-600 p-1"><Edit2 size={12} /></button>
                             <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={12} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Main: Field List or Editor */}
        <div className="flex-1 flex flex-col bg-white">
            {selectedGroup ? (
                isEditingField ? (
                    // --- Field Editor Form ---
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h4 className="font-bold text-slate-800">{editingFieldId ? 'Chỉnh sửa Trường' : 'Thêm Trường Mới'}</h4>
                            <button onClick={() => setIsEditingField(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nhãn hiển thị (Label)</label>
                                <input className="w-full p-2 border border-slate-300 rounded text-sm" value={tempField.label} onChange={(e) => setTempField({...tempField, label: e.target.value})} placeholder="VD: Tên đề tài" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Mã trường (Key) <span className="text-xs font-normal text-slate-400">(duy nhất, không dấu)</span></label>
                                <input className="w-full p-2 border border-slate-300 rounded text-sm font-mono" value={tempField.key} onChange={(e) => setTempField({...tempField, key: e.target.value})} placeholder="VD: topicName" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Loại dữ liệu (Data Type)</label>
                                <select className="w-full p-2 border border-slate-300 rounded text-sm" value={tempField.type} onChange={(e) => setTempField({...tempField, type: e.target.value as DataFieldType})}>
                                    {FIELD_TYPES.map(t => (
                                        <option key={t.type} value={t.type}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-6">
                                <div className="space-y-3">
                                    <label className="flex items-center cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 text-blue-600" checked={tempField.required} onChange={(e) => setTempField({...tempField, required: e.target.checked})} />
                                        <span className="ml-2 text-sm text-slate-700 font-medium">Bắt buộc nhập (Required)</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 text-indigo-600" checked={tempField.isFilterable} onChange={(e) => setTempField({...tempField, isFilterable: e.target.checked})} />
                                        <span className="ml-2 text-sm text-slate-700 font-medium flex items-center gap-1"><Filter size={14} className="text-slate-400"/> Cho phép lọc (Filter)</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 text-indigo-600" checked={tempField.isSearchable} onChange={(e) => setTempField({...tempField, isSearchable: e.target.checked})} />
                                        <span className="ml-2 text-sm text-slate-700 font-medium flex items-center gap-1"><Search size={14} className="text-slate-400"/> Cho phép tìm kiếm (Search)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Conditionals based on Type */}
                        {(tempField.type === 'select_single' || tempField.type === 'select_multiple') && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Danh sách Tùy chọn</label>
                                    <button onClick={handleAddOption} className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:underline"><Plus size={12}/> Thêm tùy chọn</button>
                                </div>
                                <div className="space-y-2">
                                    {(tempField.options || []).map((opt, idx) => (
                                        <div key={opt.id} className="flex gap-2 items-center">
                                            <span className="text-xs text-slate-400 w-4">{idx + 1}.</span>
                                            <input className="flex-1 p-1.5 border border-slate-300 rounded text-xs" placeholder="Nhãn (Display)" value={opt.label} onChange={(e) => handleUpdateOption(opt.id, 'label', e.target.value)} />
                                            <input className="w-32 p-1.5 border border-slate-300 rounded text-xs font-mono" placeholder="Giá trị (Value)" value={opt.value} onChange={(e) => handleUpdateOption(opt.id, 'value', e.target.value)} />
                                            <button onClick={() => handleDeleteOption(opt.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                    {(tempField.options?.length === 0) && <p className="text-xs text-slate-400 italic text-center py-2">Chưa có tùy chọn nào.</p>}
                                </div>
                            </div>
                        )}

                        {(tempField.type === 'reference' || tempField.type === 'reference_multiple') && (
                             <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                                <label className="block text-xs font-bold text-blue-800 mb-2">Đối tượng Tham chiếu (Target Entity)</label>
                                <select className="w-full p-2 border border-blue-200 rounded text-sm bg-white" value={tempField.referenceTarget} onChange={(e) => setTempField({...tempField, referenceTarget: e.target.value as any})}>
                                    <option value="units">Đơn vị (Units)</option>
                                    <option value="faculties">Nhân sự (Faculties)</option>
                                    <option value="academicYears">Năm học (Academic Years)</option>
                                </select>
                                <p className="text-xs text-blue-600 mt-2">Dữ liệu sẽ được lấy động từ danh sách hệ thống tương ứng.</p>
                                {tempField.type === 'reference_multiple' && <p className="text-xs text-indigo-600 font-bold mt-1">+ Cho phép chọn nhiều mục (Multiple Selection)</p>}
                             </div>
                        )}
                        
                        {tempField.type === 'file' && (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6">
                                <p className="text-xs text-indigo-800 font-bold flex items-center gap-2">
                                    <FileText size={16}/>
                                    Loại dữ liệu: Tập tin (File Upload)
                                </p>
                                <p className="text-xs text-indigo-600 mt-2">
                                    Người dùng sẽ có thể tải lên các tệp (PDF, Word, Ảnh...) và hệ thống sẽ tự động lưu vào thư mục <strong>Data</strong> trên Google Drive đã cấu hình.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                             <button onClick={() => setIsEditingField(false)} className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded text-sm font-bold">Hủy</button>
                             <button onClick={handleSaveField} className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold flex items-center gap-2"><Save size={16}/> Lưu Trường</button>
                        </div>
                    </div>
                ) : (
                    // --- Field List View ---
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-800">{selectedGroup.name}</h3>
                                <p className="text-xs text-slate-500">{selectedGroup.fields.length} trường dữ liệu</p>
                            </div>
                            <button onClick={handleAddField} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold flex items-center gap-1 hover:bg-blue-700 shadow-sm"><Plus size={14}/> Thêm Trường</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Nhãn (Label)</th>
                                        <th className="px-4 py-3">Mã (Key)</th>
                                        <th className="px-4 py-3">Loại (Type)</th>
                                        <th className="px-4 py-3 text-center">Bắt buộc</th>
                                        <th className="px-4 py-3 text-right">Thuộc tính</th>
                                        <th className="px-4 py-3 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedGroup.fields.map(field => (
                                        <tr key={field.id} className="hover:bg-slate-50 group">
                                            <td className="px-4 py-3 font-medium text-slate-800">{field.label}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{field.key}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-600 border border-slate-200">
                                                    {FIELD_TYPES.find(t => t.type === field.type)?.icon}
                                                    {FIELD_TYPES.find(t => t.type === field.type)?.label.split('(')[0]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {field.required ? <span className="text-red-500 font-bold text-xs">Yes</span> : <span className="text-slate-300 text-xs">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {field.isFilterable && (
                                                        <span title="Cho phép lọc">
                                                            <Filter size={14} className="text-indigo-500" />
                                                        </span>
                                                    )}
                                                    {field.isSearchable && (
                                                        <span title="Cho phép tìm kiếm">
                                                            <Search size={14} className="text-blue-500" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => handleEditField(field)} className="text-blue-600 hover:text-blue-800 p-1 mr-1"><Edit2 size={14}/></button>
                                                <button onClick={() => handleDeleteField(field.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {selectedGroup.fields.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                                <Settings size={32} className="mx-auto mb-2 opacity-20"/>
                                                <p>Chưa có trường dữ liệu nào. Hãy nhấn "Thêm Trường" để bắt đầu.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                    <p>Chọn một nhóm dữ liệu bên trái để xem chi tiết.</p>
                </div>
            )}
        </div>

        {/* --- AI Import Modal --- */}
        {isImportModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-purple-50 rounded-t-xl">
                        <h3 className="font-bold text-purple-900 flex items-center gap-2">
                            <Bot size={20} className="text-purple-600"/> 
                            AI Hỗ trợ Tạo Cấu hình
                        </h3>
                        <button onClick={() => setIsImportModalOpen(false)} className="text-purple-300 hover:text-purple-600">
                            <X size={20}/>
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1">
                        {!previewGroup ? (
                            <div className="space-y-6">
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">1</span> 
                                        Lấy Prompt mẫu
                                    </h4>
                                    <p className="text-xs text-slate-500 mb-3">Copy prompt này và gửi cho AI (ChatGPT, Gemini) để tạo mã JSON cấu hình chuẩn.</p>
                                    <button 
                                        onClick={handleCopyAiPrompt}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-50 shadow-sm transition-all w-full justify-center"
                                    >
                                        <Copy size={16}/> Sao chép Prompt vào Clipboard
                                    </button>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">2</span> 
                                        Dán mã JSON từ AI
                                    </h4>
                                    <textarea 
                                        className="w-full h-40 p-3 bg-slate-900 text-green-400 font-mono text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                        placeholder={`{\n  "name": "Quản lý Sinh viên",\n  "fields": [\n    { "key": "studentName", "label": "Họ tên", "type": "text", "required": true }\n  ]\n}`}
                                        value={importJson}
                                        onChange={(e) => setImportJson(e.target.value)}
                                    />
                                    {importError && (
                                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                            {importError}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-2">
                                        <Check size={24}/>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800">Kiểm tra thành công!</h4>
                                    <p className="text-sm text-slate-500">Tìm thấy <strong>{previewGroup.fields.length}</strong> trường dữ liệu.</p>
                                </div>
                                
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                        <span className="font-bold text-slate-500">Tên nhóm:</span>
                                        <span className="col-span-2 font-medium text-slate-800">{previewGroup.name}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <span className="font-bold text-slate-500">Mô tả:</span>
                                        <span className="col-span-2 text-slate-600 italic">{previewGroup.description || '(Không có)'}</span>
                                    </div>
                                </div>

                                <div>
                                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Danh sách trường (Preview & Edit)</h5>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-100 font-semibold text-slate-600">
                                                <tr>
                                                    <th className="px-3 py-2">Label</th>
                                                    <th className="px-3 py-2">Key</th>
                                                    <th className="px-3 py-2">Type</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {previewGroup.fields.map(f => (
                                                    <tr key={f.id} className="hover:bg-slate-50 group">
                                                        <td className="px-3 py-2">
                                                            <input 
                                                                className="w-full bg-transparent border-b border-transparent focus:border-purple-500 outline-none text-slate-700" 
                                                                value={f.label} 
                                                                onChange={(e) => handleUpdatePreviewField(f.id, 'label', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <input 
                                                                className="w-full bg-transparent border-b border-transparent focus:border-purple-500 outline-none font-mono text-slate-500 text-xs" 
                                                                value={f.key} 
                                                                onChange={(e) => handleUpdatePreviewField(f.id, 'key', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <select 
                                                                className="w-full bg-transparent border-b border-transparent focus:border-purple-500 outline-none text-xs"
                                                                value={f.type} 
                                                                onChange={(e) => handleUpdatePreviewField(f.id, 'type', e.target.value)}
                                                            >
                                                                {FIELD_TYPES.map(t => (
                                                                    <option key={t.type} value={t.type}>{t.label}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic text-right">* Bạn có thể sửa trực tiếp tên, mã và loại dữ liệu trong bảng trên trước khi lưu.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 rounded-b-xl">
                        {!previewGroup ? (
                            <>
                                <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold">Hủy</button>
                                <button onClick={handleParseImport} className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-sm font-bold flex items-center gap-2">
                                    Kiểm tra & Xem trước <ArrowRight size={16}/>
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => { setPreviewGroup(null); setImportJson(''); }} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold">Nhập lại</button>
                                <button onClick={handleConfirmImport} className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-bold flex items-center gap-2">
                                    <Save size={16}/> Lưu Nhóm Dữ liệu
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default DataConfigModule;