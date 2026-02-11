import React, { useState, useMemo, useRef } from 'react';
import { DataConfigGroup, DynamicRecord, Unit, Faculty, AcademicYear, ChartConfig, ChartType, GoogleDriveConfig } from '../types';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { LayoutDashboard, Table, Plus, Trash2, Edit2, Settings, Save, X, PieChart as PieIcon, BarChart3, LineChart as LineIcon, Radar as RadarIcon, Filter, UploadCloud, FileText, Loader2, ExternalLink } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface DynamicDataManagerProps {
  group: DataConfigGroup;
  data: DynamicRecord[];
  isLocked: boolean;
  currentAcademicYear: string;
  onUpdateData: (data: DynamicRecord[]) => void;
  onUpdateGroupConfig: (group: DataConfigGroup) => void;
  units: Unit[];
  faculties: Faculty[];
  academicYears: AcademicYear[];
  driveConfig?: GoogleDriveConfig;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const DynamicDataManager: React.FC<DynamicDataManagerProps> = ({
  group,
  data,
  isLocked,
  currentAcademicYear,
  onUpdateData,
  onUpdateGroupConfig,
  units,
  faculties,
  academicYears,
  driveConfig
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'detail'>('dashboard');
  
  // -- Dashboard State --
  const [isAddingChart, setIsAddingChart] = useState(false);
  const [newChartConfig, setNewChartConfig] = useState<Partial<ChartConfig>>({ type: 'bar' });

  // -- Detail State --
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [tempRecord, setTempRecord] = useState<Partial<DynamicRecord>>({});
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // -- Upload State --
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<Record<string, File | null>>({});

  // Filter data by current academic year
  const filteredData = useMemo(() => {
      return data.filter(d => d.academicYear === currentAcademicYear);
  }, [data, currentAcademicYear]);

  // --- DATA PROCESSING HELPERS ---
  const getLookupValue = (value: string, target?: string) => {
      if (!value) return '';
      if (target === 'units') return units.find(u => u.id === value)?.name || value;
      if (target === 'faculties') return faculties.find(f => f.id === value)?.name.vi || value;
      if (target === 'academicYears') return academicYears.find(y => y.id === value)?.code || value;
      return value;
  };

  const processChartData = (config: ChartConfig) => {
      if (config.type === 'pie') {
          // Count occurences of categoryField
          const counts: Record<string, number> = {};
          filteredData.forEach(item => {
              const rawKey = item[config.categoryField || ''] || 'Undefined';
              // Try to resolve lookup label if possible
              const fieldDef = group.fields.find(f => f.key === config.categoryField);
              let label = rawKey;
              if (fieldDef?.type === 'select_single') {
                  label = fieldDef.options?.find(o => o.value === rawKey)?.label || rawKey;
              } else if (fieldDef?.type === 'reference') {
                  label = getLookupValue(rawKey, fieldDef.referenceTarget);
              }
              counts[label] = (counts[label] || 0) + 1;
          });
          return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
      } else if (config.type === 'radar') {
          // Average of multiple metrics
          if (!config.radarFields || config.radarFields.length === 0) return [];
          return config.radarFields.map(fieldKey => {
              const fieldDef = group.fields.find(f => f.key === fieldKey);
              const total = filteredData.reduce((acc, item) => acc + (Number(item[fieldKey]) || 0), 0);
              const avg = filteredData.length ? (total / filteredData.length) : 0;
              return { subject: fieldDef?.label || fieldKey, value: avg, fullMark: 100 }; // fullMark dummy
          });
      } else {
          // Line or Bar: Group by X, Sum Y
          const groups: Record<string, number> = {};
          filteredData.forEach(item => {
              const rawX = item[config.xAxisField || ''] || 'Undefined';
              // Resolve X label
              const fieldDefX = group.fields.find(f => f.key === config.xAxisField);
              let labelX = rawX;
              if (fieldDefX?.type === 'reference') labelX = getLookupValue(rawX, fieldDefX.referenceTarget);
              if (fieldDefX?.type === 'select_single') labelX = fieldDefX.options?.find(o => o.value === rawX)?.label || rawX;

              const valY = Number(item[config.yAxisField || '']) || 0;
              groups[labelX] = (groups[labelX] || 0) + valY;
          });
          return Object.keys(groups).map(key => ({ name: key, value: groups[key] }));
      }
  };

  // --- HANDLERS ---
  const handleSaveChart = () => {
      if (!newChartConfig.title || !newChartConfig.type) return;
      const newChart: ChartConfig = {
          id: uuidv4(),
          title: newChartConfig.title,
          type: newChartConfig.type as ChartType,
          xAxisField: newChartConfig.xAxisField,
          yAxisField: newChartConfig.yAxisField,
          categoryField: newChartConfig.categoryField,
          radarFields: newChartConfig.radarFields
      };
      const updatedGroup = { ...group, charts: [...(group.charts || []), newChart] };
      onUpdateGroupConfig(updatedGroup);
      setIsAddingChart(false);
      setNewChartConfig({ type: 'bar' });
  };

  const handleDeleteChart = (id: string) => {
      if (confirm("Xóa biểu đồ này?")) {
          const updatedGroup = { ...group, charts: group.charts?.filter(c => c.id !== id) };
          onUpdateGroupConfig(updatedGroup);
      }
  };

  const uploadFileToDrive = async (file: File): Promise<string> => {
      if (!driveConfig?.isConnected || !driveConfig.dataFolderId) {
          throw new Error("Chưa kết nối Google Drive hoặc thư mục Data chưa được tạo.");
      }

      const metadata = {
          name: file.name,
          parents: [driveConfig.dataFolderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      // Get token from GAPI global
      const tokenObj = window.gapi?.client?.getToken();
      if (!tokenObj) throw new Error("Phiên Google Drive đã hết hạn.");

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
          method: 'POST',
          headers: new Headers({ 'Authorization': 'Bearer ' + tokenObj.access_token }),
          body: form,
      });

      if (!response.ok) {
          throw new Error("Lỗi khi tải lên Google Drive.");
      }

      const json = await response.json();
      return json.webViewLink;
  };

  const handleSaveRecord = async () => {
      // Handle File Uploads first
      const updatedRecord = { ...tempRecord };
      const fileFields = group.fields.filter(f => f.type === 'file');

      for (const field of fileFields) {
          const file = fileToUpload[field.key];
          if (file) {
              setUploadingField(field.key);
              try {
                  const link = await uploadFileToDrive(file);
                  updatedRecord[field.key] = link;
              } catch (e: any) {
                  alert(`Lỗi khi tải file ${field.label}: ${e.message}`);
                  setUploadingField(null);
                  return; // Stop save process
              }
          }
      }
      setUploadingField(null);
      setFileToUpload({}); // Clear file queue

      if (editingRecordId) {
          const updatedData = data.map(d => d.id === editingRecordId ? { ...d, ...updatedRecord } : d);
          onUpdateData(updatedData);
          setEditingRecordId(null);
      } else {
          const newRec = { ...updatedRecord, id: uuidv4(), academicYear: currentAcademicYear };
          onUpdateData([...data, newRec as DynamicRecord]);
      }
      setIsAddingRecord(false);
      setTempRecord({});
  };

  const handleDeleteRecord = (id: string) => {
      if (confirm("Xóa bản ghi này?")) {
          onUpdateData(data.filter(d => d.id !== id));
      }
  };

  const handleFileSelection = (key: string, file: File | null) => {
      setFileToUpload(prev => ({ ...prev, [key]: file }));
  };

  // --- RENDERERS ---
  const renderDashboard = () => (
      <div className="p-6 overflow-y-auto h-full bg-slate-50">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Tổng quan Dữ liệu: {group.name}</h3>
              {!isLocked && (
                  <button 
                      onClick={() => setIsAddingChart(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 text-sm font-bold"
                  >
                      <Plus size={16} /> Thêm Biểu đồ
                  </button>
              )}
          </div>

          {isAddingChart && (
              <div className="mb-8 p-6 bg-white rounded-xl shadow-md border border-indigo-100 animate-in fade-in slide-in-from-top-4">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18}/> Cấu hình Biểu đồ Mới</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Tên biểu đồ</label>
                          <input className="w-full p-2 border border-slate-300 rounded text-sm" value={newChartConfig.title || ''} onChange={e => setNewChartConfig({...newChartConfig, title: e.target.value})} placeholder="VD: Biến động theo năm" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Loại biểu đồ</label>
                          <select className="w-full p-2 border border-slate-300 rounded text-sm" value={newChartConfig.type} onChange={e => setNewChartConfig({...newChartConfig, type: e.target.value as ChartType})}>
                              <option value="line">Đường (Line) - Xu hướng</option>
                              <option value="bar">Cột (Bar) - So sánh</option>
                              <option value="pie">Tròn (Pie) - Tỷ trọng</option>
                              <option value="radar">Radar - Đa tiêu chí</option>
                          </select>
                      </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4">
                      {newChartConfig.type === 'pie' ? (
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Trường Phân loại (Category Field)</label>
                              <select className="w-full p-2 border border-slate-300 rounded text-sm" value={newChartConfig.categoryField || ''} onChange={e => setNewChartConfig({...newChartConfig, categoryField: e.target.value})}>
                                  <option value="">-- Chọn trường --</option>
                                  {group.fields.filter(f => ['select_single', 'text', 'reference'].includes(f.type)).map(f => (
                                      <option key={f.key} value={f.key}>{f.label}</option>
                                  ))}
                              </select>
                          </div>
                      ) : newChartConfig.type === 'radar' ? (
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Các chỉ số (Metrics - Chọn nhiều)</label>
                              <select multiple className="w-full p-2 border border-slate-300 rounded text-sm h-24" value={newChartConfig.radarFields || []} onChange={e => setNewChartConfig({...newChartConfig, radarFields: Array.from(e.target.selectedOptions, (o: HTMLOptionElement) => o.value)})}>
                                  {group.fields.filter(f => ['number_int', 'number_float'].includes(f.type)).map(f => (
                                      <option key={f.key} value={f.key}>{f.label}</option>
                                  ))}
                              </select>
                              <p className="text-[10px] text-slate-400 mt-1">Giữ Ctrl để chọn nhiều trường số.</p>
                          </div>
                      ) : (
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Trục hoành (X-Axis: Category/Time)</label>
                                  <select className="w-full p-2 border border-slate-300 rounded text-sm" value={newChartConfig.xAxisField || ''} onChange={e => setNewChartConfig({...newChartConfig, xAxisField: e.target.value})}>
                                      <option value="">-- Chọn trường --</option>
                                      {group.fields.map(f => (
                                          <option key={f.key} value={f.key}>{f.label}</option>
                                      ))}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Trục tung (Y-Axis: Value/Number)</label>
                                  <select className="w-full p-2 border border-slate-300 rounded text-sm" value={newChartConfig.yAxisField || ''} onChange={e => setNewChartConfig({...newChartConfig, yAxisField: e.target.value})}>
                                      <option value="">-- Chọn trường số --</option>
                                      {group.fields.filter(f => ['number_int', 'number_float'].includes(f.type)).map(f => (
                                          <option key={f.key} value={f.key}>{f.label}</option>
                                      ))}
                                  </select>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="flex justify-end gap-2">
                      <button onClick={() => setIsAddingChart(false)} className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50">Hủy</button>
                      <button onClick={handleSaveChart} className="px-4 py-2 text-white bg-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-700">Lưu Biểu đồ</button>
                  </div>
              </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(group.charts || []).map((chart, idx) => {
                  const chartData = processChartData(chart);
                  return (
                      <div key={chart.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group">
                          <div className="flex justify-between items-start mb-4">
                              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                  {chart.type === 'line' && <LineIcon size={16} className="text-blue-500"/>}
                                  {chart.type === 'bar' && <BarChart3 size={16} className="text-emerald-500"/>}
                                  {chart.type === 'pie' && <PieIcon size={16} className="text-orange-500"/>}
                                  {chart.type === 'radar' && <RadarIcon size={16} className="text-purple-500"/>}
                                  {chart.title}
                              </h4>
                              {!isLocked && (
                                  <button onClick={() => handleDeleteChart(chart.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                              )}
                          </div>
                          
                          <div className="h-64 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  {chart.type === 'line' ? (
                                      <LineChart data={chartData}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                          <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
                                          <YAxis fontSize={12} stroke="#94a3b8" />
                                          <Tooltip />
                                          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                                      </LineChart>
                                  ) : chart.type === 'pie' ? (
                                      <PieChart>
                                          <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                              {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                          </Pie>
                                          <Tooltip />
                                          <Legend />
                                      </PieChart>
                                  ) : chart.type === 'radar' ? (
                                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                          <PolarGrid />
                                          <PolarAngleAxis dataKey="subject" fontSize={10} />
                                          <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                                          <Radar name={chart.title} dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                          <Tooltip />
                                      </RadarChart>
                                  ) : (
                                      <BarChart data={chartData}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                          <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
                                          <YAxis fontSize={12} stroke="#94a3b8" />
                                          <Tooltip cursor={{fill: '#f8fafc'}} />
                                          <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                                      </BarChart>
                                  )}
                              </ResponsiveContainer>
                          </div>
                      </div>
                  );
              })}
              {(group.charts || []).length === 0 && !isAddingChart && (
                  <div className="col-span-full flex flex-col items-center justify-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                      <BarChart3 size={48} className="mb-4 opacity-20" />
                      <p>Chưa có biểu đồ nào. Hãy thêm biểu đồ để theo dõi tổng quan.</p>
                  </div>
              )}
          </div>
      </div>
  );

  const renderDetail = () => (
      <div className="flex flex-col h-full bg-white">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800">Dữ liệu chi tiết</h3>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-bold">{filteredData.length} bản ghi</span>
              </div>
              {!isLocked && (
                  <button 
                      onClick={() => { setEditingRecordId(null); setTempRecord({}); setIsAddingRecord(true); setFileToUpload({}); }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 text-sm font-bold"
                  >
                      <Plus size={16} /> Thêm Mới
                  </button>
              )}
          </div>

          <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-600 font-bold border-b border-slate-200 sticky top-0 shadow-sm z-10">
                      <tr>
                          <th className="px-4 py-3 w-10 text-center">#</th>
                          {group.fields.map(f => (
                              <th key={f.id} className="px-4 py-3 whitespace-nowrap">{f.label}</th>
                          ))}
                          {!isLocked && <th className="px-4 py-3 text-right sticky right-0 bg-white shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]">Thao tác</th>}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredData.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-blue-50 transition-colors group">
                              <td className="px-4 py-3 text-center text-slate-400 text-xs">{idx + 1}</td>
                              {group.fields.map(f => (
                                  <td key={f.id} className="px-4 py-3 truncate max-w-[200px]">
                                      {f.type === 'reference' 
                                          ? <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 text-xs border border-slate-200">{getLookupValue(row[f.key], f.referenceTarget)}</span>
                                          : f.type === 'file'
                                            ? (row[f.key] 
                                                ? <a href={row[f.key]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><ExternalLink size={12}/> Xem file</a>
                                                : <span className="text-slate-300 italic">Trống</span>
                                              )
                                          : row[f.key]
                                      }
                                  </td>
                              ))}
                              {!isLocked && (
                                  <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-blue-50 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]">
                                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => { setEditingRecordId(row.id); setTempRecord(row); setIsAddingRecord(true); setFileToUpload({}); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 size={14}/></button>
                                          <button onClick={() => handleDeleteRecord(row.id)} className="p-1 text-red-600 hover:bg-red-100 rounded"><Trash2 size={14}/></button>
                                      </div>
                                  </td>
                              )}
                          </tr>
                      ))}
                      {filteredData.length === 0 && (
                          <tr><td colSpan={group.fields.length + 2} className="px-4 py-12 text-center text-slate-400 italic">Chưa có dữ liệu cho năm học này.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>

          {/* Add/Edit Modal */}
          {isAddingRecord && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800">{editingRecordId ? 'Sửa bản ghi' : 'Thêm bản ghi mới'}</h3>
                          <button onClick={() => setIsAddingRecord(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                      </div>
                      <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.fields.map(f => (
                              <div key={f.id} className={f.type === 'textarea' || f.type === 'file' ? 'col-span-2' : ''}>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                                  
                                  {f.type === 'textarea' ? (
                                      <textarea className="w-full p-2 border border-slate-300 rounded text-sm h-24" value={tempRecord[f.key] || ''} onChange={e => setTempRecord({...tempRecord, [f.key]: e.target.value})} />
                                  ) : f.type === 'select_single' ? (
                                      <select className="w-full p-2 border border-slate-300 rounded text-sm" value={tempRecord[f.key] || ''} onChange={e => setTempRecord({...tempRecord, [f.key]: e.target.value})}>
                                          <option value="">-- Chọn --</option>
                                          {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                      </select>
                                  ) : f.type === 'reference' ? (
                                      <select className="w-full p-2 border border-slate-300 rounded text-sm" value={tempRecord[f.key] || ''} onChange={e => setTempRecord({...tempRecord, [f.key]: e.target.value})}>
                                          <option value="">-- Chọn tham chiếu --</option>
                                          {f.referenceTarget === 'units' && units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                          {f.referenceTarget === 'faculties' && faculties.map(fac => <option key={fac.id} value={fac.id}>{fac.name.vi}</option>)}
                                          {f.referenceTarget === 'academicYears' && academicYears.map(y => <option key={y.id} value={y.code}>{y.code}</option>)}
                                      </select>
                                  ) : f.type === 'file' ? (
                                      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                                          {uploadingField === f.key ? (
                                              <div className="flex items-center text-indigo-600 text-sm">
                                                  <Loader2 size={16} className="animate-spin mr-2"/> Đang tải lên Drive...
                                              </div>
                                          ) : (
                                              <div className="flex flex-col gap-2">
                                                  {tempRecord[f.key] && (
                                                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded border border-green-100">
                                                          <FileText size={16}/> 
                                                          <a href={tempRecord[f.key]} target="_blank" rel="noopener noreferrer" className="hover:underline truncate flex-1">File hiện tại (Click để xem)</a>
                                                          <button onClick={() => setTempRecord({...tempRecord, [f.key]: ''})} className="text-red-500 hover:text-red-700 text-xs uppercase font-bold">Xóa</button>
                                                      </div>
                                                  )}
                                                  <input 
                                                      type="file" 
                                                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                      onChange={(e) => handleFileSelection(f.key, e.target.files?.[0] || null)}
                                                  />
                                                  {!driveConfig?.isConnected && (
                                                      <p className="text-[10px] text-red-500">
                                                          * Chưa kết nối Google Drive. Vui lòng vào Cài đặt để kết nối.
                                                      </p>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  ) : (
                                      <input 
                                          type={f.type === 'number_int' || f.type === 'number_float' ? 'number' : f.type === 'date' ? 'date' : 'text'} 
                                          className="w-full p-2 border border-slate-300 rounded text-sm" 
                                          value={tempRecord[f.key] || ''} 
                                          onChange={e => setTempRecord({...tempRecord, [f.key]: e.target.value})}
                                      />
                                  )}
                              </div>
                          ))}
                      </div>
                      <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
                          <button onClick={() => setIsAddingRecord(false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50">Hủy</button>
                          <button 
                              onClick={handleSaveRecord} 
                              disabled={!!uploadingField}
                              className={`px-4 py-2 text-white rounded-lg text-sm font-bold flex items-center gap-2 ${uploadingField ? 'bg-indigo-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                              {uploadingField ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Lưu
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );

  return (
    <div className="flex flex-col h-full">
        {/* Top Tab Bar */}
        <div className="bg-white border-b border-slate-200 px-6 pt-4 flex items-center justify-between shadow-sm z-10">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide mb-4 mr-8">{group.name}</h2>
            <div className="flex space-x-6">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <LayoutDashboard size={18} />
                    Bảng tổng quan
                </button>
                <button 
                    onClick={() => setActiveTab('detail')}
                    className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'detail' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Table size={18} />
                    Dữ liệu chi tiết
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'detail' && renderDetail()}
        </div>
    </div>
  );
};

export default DynamicDataManager;