import React, { useState, useMemo, useRef } from 'react';
import { DataConfigGroup, DynamicRecord, Unit, Faculty, AcademicYear, ChartConfig, ChartType, GoogleDriveConfig, HumanResourceRecord } from '../types';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { LayoutDashboard, Table, Plus, Trash2, Edit2, Settings, Save, X, PieChart as PieIcon, BarChart3, LineChart as LineIcon, Radar as RadarIcon, Filter, UploadCloud, FileText, Loader2, ExternalLink, Building, User, Search, Bot, Copy, ArrowRight, Check } from 'lucide-react';
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
  humanResources: HumanResourceRecord[];
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
  humanResources,
  academicYears,
  driveConfig
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'detail'>('dashboard');
  
  // -- Filter State --
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>('');
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({}); 
  const [searchText, setSearchText] = useState<string>(''); 

  // -- Dashboard State --
  const [isAddingChart, setIsAddingChart] = useState(false);
  const [newChartConfig, setNewChartConfig] = useState<Partial<ChartConfig>>({ type: 'bar' });

  // -- Detail State --
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [tempRecord, setTempRecord] = useState<Partial<DynamicRecord>>({});
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // -- AI Import State --
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [parsedPreviewData, setParsedPreviewData] = useState<any[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // -- Upload State --
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<Record<string, File | null>>({});

  // --- HIERARCHY & FILTER LOGIC ---
  
  // 1. Identify key fields
  const unitFieldKey = useMemo(() => {
      const field = group.fields.find(f => (f.type === 'reference' || f.type === 'reference_multiple') && f.referenceTarget === 'units');
      return field ? field.key : null;
  }, [group]);

  const facultyFieldKey = useMemo(() => {
      const field = group.fields.find(f => (f.type === 'reference' || f.type === 'reference_multiple') && f.referenceTarget === 'faculties');
      return field ? field.key : null;
  }, [group]);

  // 2. Helper to get all descendant IDs (including self)
  const getUnitAndDescendants = (rootUnitId: string, allUnits: Unit[]): string[] => {
      const children = allUnits.filter(u => u.unit_parentId === rootUnitId);
      let ids = [rootUnitId];
      children.forEach(child => {
          ids = [...ids, ...getUnitAndDescendants(child.unit_id, allUnits)];
      });
      return ids;
  };

  // 3. Filter Data (Optimized)
  const filteredData = useMemo(() => {
      // Base filter: Academic Year
      let result = data.filter(d => d.academicYear === currentAcademicYear);

      // Hierarchical Unit Filter
      if (selectedUnitFilter && unitFieldKey) {
          const validUnitIds = getUnitAndDescendants(selectedUnitFilter, units);
          result = result.filter(record => {
              const recordVal = record[unitFieldKey];
              if (Array.isArray(recordVal)) {
                  // Multi-reference: Check if ANY of the record's units match the valid IDs
                  return recordVal.some(id => validUnitIds.includes(id));
              } else {
                  return validUnitIds.includes(recordVal);
              }
          });
      }

      // Faculty Filter
      if (selectedFacultyFilter && facultyFieldKey) {
          result = result.filter(record => {
              const recordVal = record[facultyFieldKey];
              if (Array.isArray(recordVal)) {
                  return recordVal.includes(selectedFacultyFilter);
              }
              return recordVal === selectedFacultyFilter;
          });
      }

      // Dynamic Filters (from isFilterable fields)
      Object.keys(dynamicFilters).forEach(filterKey => {
          const filterValue = dynamicFilters[filterKey];
          if (filterValue) {
              result = result.filter(record => {
                  const val = record[filterKey];
                  if (Array.isArray(val)) {
                      return val.includes(filterValue);
                  }
                  return String(val) === filterValue;
              });
          }
      });

      // Search Logic (from isSearchable fields)
      if (searchText) {
          const searchLower = searchText.toLowerCase();
          const searchableFields = group.fields.filter(f => f.isSearchable).map(f => f.key);
          
          if (searchableFields.length > 0) {
              result = result.filter(record => {
                  return searchableFields.some(key => {
                      const val = record[key];
                      if (!val) return false;
                      let stringVal = String(val);
                      return stringVal.toLowerCase().includes(searchLower);
                  });
              });
          }
      }

      return result;
  }, [data, currentAcademicYear, selectedUnitFilter, selectedFacultyFilter, unitFieldKey, facultyFieldKey, units, dynamicFilters, searchText]);

  // 4. Dynamic Options for Faculty Dropdown
  const availableFaculties = useMemo(() => {
      if (!selectedUnitFilter) {
          return [...faculties].sort((a, b) => a.name.vi.localeCompare(b.name.vi));
      }
      const validUnitIds = getUnitAndDescendants(selectedUnitFilter, units);
      const facultyIdsInUnits = new Set(
          humanResources
            .filter(hr => validUnitIds.includes(hr.unitId))
            .map(hr => hr.facultyId)
      );
      return faculties
          .filter(f => facultyIdsInUnits.has(f.id))
          .sort((a, b) => a.name.vi.localeCompare(b.name.vi));
  }, [faculties, humanResources, selectedUnitFilter, units]);


  // --- DATA PROCESSING HELPERS ---
  const getLookupValue = (value: string | string[], target?: string) => {
      if (!value) return '';
      if (Array.isArray(value)) {
          return value.map(v => getLookupValue(v, target)).join(', ');
      }
      if (target === 'units') return units.find(u => u.unit_id === value)?.unit_name || value;
      if (target === 'faculties') return faculties.find(f => f.id === value)?.name.vi || value;
      if (target === 'academicYears') return academicYears.find(y => y.id === value)?.code || value;
      return value;
  };

  const processChartData = (config: ChartConfig) => {
      if (config.type === 'pie') {
          const counts: Record<string, number> = {};
          filteredData.forEach(item => {
              const rawKey = item[config.categoryField || ''];
              const valArr = Array.isArray(rawKey) ? rawKey : [rawKey || 'Undefined'];
              
              valArr.forEach(val => {
                  const fieldDef = group.fields.find(f => f.key === config.categoryField);
                  let label = val;
                  if (fieldDef?.type === 'select_single' || fieldDef?.type === 'select_multiple') {
                      label = fieldDef.options?.find(o => o.value === val)?.label || val;
                  } else if (fieldDef?.type === 'reference' || fieldDef?.type === 'reference_multiple') {
                      label = getLookupValue(val, fieldDef.referenceTarget);
                  }
                  counts[label] = (counts[label] || 0) + 1;
              });
          });
          return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
      } else if (config.type === 'radar') {
          if (!config.radarFields || config.radarFields.length === 0) return [];
          return config.radarFields.map(fieldKey => {
              const fieldDef = group.fields.find(f => f.key === fieldKey);
              const total = filteredData.reduce((acc, item) => acc + (Number(item[fieldKey]) || 0), 0);
              const avg = filteredData.length ? (total / filteredData.length) : 0;
              return { subject: fieldDef?.label || fieldKey, value: avg, fullMark: 100 };
          });
      } else {
          const groups: Record<string, number> = {};
          filteredData.forEach(item => {
              const rawX = item[config.xAxisField || ''] || 'Undefined';
              const xArr = Array.isArray(rawX) ? rawX : [rawX];

              xArr.forEach(xVal => {
                  // Resolve X label
                  const fieldDefX = group.fields.find(f => f.key === config.xAxisField);
                  let labelX = xVal;
                  if (fieldDefX?.type?.startsWith('reference')) labelX = getLookupValue(xVal, fieldDefX.referenceTarget);
                  if (fieldDefX?.type?.startsWith('select')) labelX = fieldDefX.options?.find(o => o.value === xVal)?.label || xVal;

                  const valY = Number(item[config.yAxisField || '']) || 0;
                  groups[labelX] = (groups[labelX] || 0) + valY;
              });
          });
          return Object.keys(groups).map(key => ({ name: key, value: groups[key] }));
      }
  };

  // --- AI IMPORT HANDLERS ---
  const generateAiPrompt = () => {
      const fieldsDesc = group.fields.map(f => {
          let desc = `- Field "${f.label}" (Key: "${f.key}", Type: ${f.type})`;
          if (f.options && f.options.length > 0) {
              desc += `. Allowed Values (Options): ${f.options.map(o => `"${o.value}"`).join(', ')}`;
          }
          if (f.type === 'date') desc += ` (Format: YYYY-MM-DD)`;
          return desc;
      }).join('\n');

      return `Role: You are a Data Generation Assistant.
Task: Generate a JSON Array of simulated data for the entity "${group.name}".

Data Structure Schema:
${fieldsDesc}

Requirements:
1. Output MUST be a valid JSON Array of Objects.
2. Do not include markdown formatting (like \`\`\`json). Just the raw JSON.
3. Generate 5-10 realistic sample records in Vietnamese context.
4. Ensure all "Type" constraints are met (e.g., numbers are numbers, dates are ISO strings).
`;
  };

  const handleCopyPrompt = () => {
      const prompt = generateAiPrompt();
      navigator.clipboard.writeText(prompt);
      alert("Đã sao chép Prompt vào clipboard! \nHãy dán vào ChatGPT hoặc Gemini để tạo dữ liệu JSON.");
  };

  const handleParseImport = () => {
      if (!jsonInput.trim()) {
          setImportError("Vui lòng nhập JSON.");
          return;
      }
      try {
          // Try to sanitise markdown if present
          let raw = jsonInput.trim();
          if (raw.startsWith('```json')) raw = raw.replace(/^```json/, '').replace(/```$/, '');
          if (raw.startsWith('```')) raw = raw.replace(/^```/, '').replace(/```$/, '');
          
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) throw new Error("Dữ liệu phải là một mảng JSON (Array).");
          
          // Hydrate with IDs and Academic Year
          const hydrated = parsed.map((item: any) => ({
              ...item,
              id: uuidv4(),
              academicYear: currentAcademicYear
          }));
          
          setParsedPreviewData(hydrated);
          setImportError(null);
      } catch (e: any) {
          setImportError("Lỗi parse JSON: " + e.message);
          setParsedPreviewData(null);
      }
  };

  const handleConfirmImport = () => {
      if (parsedPreviewData && parsedPreviewData.length > 0) {
          onUpdateData([...data, ...parsedPreviewData]);
          setParsedPreviewData(null);
          setJsonInput('');
          setIsAiModalOpen(false);
          alert(`Đã nhập thành công ${parsedPreviewData.length} bản ghi!`);
      }
  };

  // --- GENERAL HANDLERS ---
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
                  return;
              }
          }
      }
      setUploadingField(null);
      setFileToUpload({});

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

  const handleMultiSelectChange = (key: string, value: string) => {
      const currentValues: string[] = Array.isArray(tempRecord[key]) ? tempRecord[key] : [];
      if (currentValues.includes(value)) {
          setTempRecord({ ...tempRecord, [key]: currentValues.filter(v => v !== value) });
      } else {
          setTempRecord({ ...tempRecord, [key]: [...currentValues, value] });
      }
  };

  // --- PREPARE UNIT OPTIONS FOR FILTER ---
  const unitOptions = useMemo(() => {
      const roots = units.filter(u => !u.unit_parentId || u.unit_type === 'faculty');
      const options: { id: string, name: string, level: number }[] = [];
      
      roots.forEach(root => {
          options.push({ id: root.unit_id, name: root.unit_name, level: 0 });
          const children = units.filter(u => u.unit_parentId === root.unit_id);
          children.forEach(child => {
              options.push({ id: child.unit_id, name: child.unit_name, level: 1 });
          });
      });
      return options;
  }, [units]);

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
                                  {group.fields.filter(f => ['select_single', 'select_multiple', 'text', 'reference', 'reference_multiple'].includes(f.type)).map(f => (
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
                  <div className="flex gap-2">
                      <button 
                          onClick={() => { setJsonInput(''); setParsedPreviewData(null); setImportError(null); setIsAiModalOpen(true); }}
                          className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg shadow-sm hover:bg-purple-700 text-xs font-bold"
                          title="Sử dụng AI tạo dữ liệu"
                      >
                          <Bot size={16} /> AI Import
                      </button>
                      <button 
                          onClick={() => { setEditingRecordId(null); setTempRecord({}); setIsAddingRecord(true); setFileToUpload({}); }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 text-xs font-bold"
                      >
                          <Plus size={16} /> Thêm Mới
                      </button>
                  </div>
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
                                      {(f.type === 'reference' || f.type === 'reference_multiple')
                                          ? <span className="text-slate-600 text-xs">{getLookupValue(row[f.key], f.referenceTarget)}</span>
                                          : f.type === 'file'
                                            ? (row[f.key] 
                                                ? <a href={row[f.key]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><ExternalLink size={12}/> Xem file</a>
                                                : <span className="text-slate-300 italic">Trống</span>
                                              )
                                          : Array.isArray(row[f.key]) 
                                            ? row[f.key].join(', ')
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
                          <tr><td colSpan={group.fields.length + 2} className="px-4 py-12 text-center text-slate-400 italic">
                              {selectedUnitFilter || selectedFacultyFilter || searchText || Object.keys(dynamicFilters).length > 0 ? "Không tìm thấy dữ liệu phù hợp." : "Chưa có dữ liệu cho năm học này."}
                          </td></tr>
                      )}
                  </tbody>
              </table>
          </div>

          {/* AI Import Modal */}
          {isAiModalOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-purple-50 rounded-t-xl">
                          <h3 className="font-bold text-purple-900 flex items-center gap-2">
                              <Bot size={20} className="text-purple-600"/> 
                              AI Hỗ trợ tạo dữ liệu cho "{group.name}"
                          </h3>
                          <button onClick={() => setIsAiModalOpen(false)} className="text-purple-300 hover:text-purple-600">
                              <X size={20}/>
                          </button>
                      </div>
                      
                      <div className="p-6 overflow-y-auto flex-1 space-y-6">
                          {/* Step 1: Copy Prompt */}
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">1</span> 
                                      Sao chép Prompt mẫu
                                  </h4>
                                  <button 
                                      onClick={handleCopyPrompt}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-50 shadow-sm transition-all"
                                  >
                                      <Copy size={14}/> Sao chép
                                  </button>
                              </div>
                              <p className="text-xs text-slate-500">
                                  Copy prompt này và gửi cho AI (ChatGPT, Gemini) để tạo dữ liệu JSON theo đúng cấu trúc của nhóm dữ liệu này.
                              </p>
                          </div>

                          {/* Step 2: Paste JSON */}
                          <div>
                              <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">2</span> 
                                  Dán kết quả JSON vào đây
                              </h4>
                              <textarea 
                                  className="w-full h-40 p-3 bg-slate-900 text-green-400 font-mono text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                  placeholder='[ { "field1": "value1", ... }, ... ]'
                                  value={jsonInput}
                                  onChange={(e) => setJsonInput(e.target.value)}
                              />
                              {importError && (
                                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                      {importError}
                                  </div>
                              )}
                          </div>

                          {/* Step 3: Preview */}
                          {parsedPreviewData && (
                              <div className="border-t border-slate-200 pt-4">
                                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">3</span> 
                                      Xem trước ({parsedPreviewData.length} bản ghi)
                                  </h4>
                                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                                      <table className="w-full text-xs text-left">
                                          <thead className="bg-slate-100 sticky top-0">
                                              <tr>
                                                  <th className="px-2 py-1">#</th>
                                                  {group.fields.slice(0, 3).map(f => <th key={f.id} className="px-2 py-1">{f.label}</th>)}
                                                  {group.fields.length > 3 && <th className="px-2 py-1">...</th>}
                                              </tr>
                                          </thead>
                                          <tbody>
                                              {parsedPreviewData.map((row, idx) => (
                                                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                                      <td className="px-2 py-1 text-slate-400">{idx + 1}</td>
                                                      {group.fields.slice(0, 3).map(f => (
                                                          <td key={f.id} className="px-2 py-1 truncate max-w-[100px]">{String(row[f.key])}</td>
                                                      ))}
                                                      {group.fields.length > 3 && <td className="px-2 py-1 text-slate-400 italic">...</td>}
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 rounded-b-xl">
                          {!parsedPreviewData ? (
                              <button 
                                  onClick={handleParseImport} 
                                  disabled={!jsonInput}
                                  className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                              >
                                  Phân tích & Xem trước <ArrowRight size={16}/>
                              </button>
                          ) : (
                              <>
                                  <button onClick={() => setParsedPreviewData(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold">Hủy bỏ</button>
                                  <button onClick={handleConfirmImport} className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-bold flex items-center gap-2">
                                      <Check size={16}/> Xác nhận Nhập
                                  </button>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          )}

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
                              <div key={f.id} className={f.type === 'textarea' || f.type === 'file' || f.type === 'select_multiple' || f.type === 'reference_multiple' ? 'col-span-2' : ''}>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                                  
                                  {f.type === 'textarea' ? (
                                      <textarea className="w-full p-2 border border-slate-300 rounded text-sm h-24" value={tempRecord[f.key] || ''} onChange={e => setTempRecord({...tempRecord, [f.key]: e.target.value})} />
                                  ) : f.type === 'select_single' ? (
                                      <select className="w-full p-2 border border-slate-300 rounded text-sm" value={tempRecord[f.key] || ''} onChange={e => setTempRecord({...tempRecord, [f.key]: e.target.value})}>
                                          <option value="">-- Chọn --</option>
                                          {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                      </select>
                                  ) : f.type === 'select_multiple' ? (
                                      // Native Multi-Select workaround for demo
                                      <select multiple className="w-full p-2 border border-slate-300 rounded text-sm h-24" 
                                          value={Array.isArray(tempRecord[f.key]) ? tempRecord[f.key] : []} 
                                          onChange={e => setTempRecord({...tempRecord, [f.key]: Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value)})}
                                      >
                                          {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                      </select>
                                  ) : f.type === 'reference' ? (
                                      <select className="w-full p-2 border border-slate-300 rounded text-sm" value={tempRecord[f.key] || ''} onChange={e => setTempRecord({...tempRecord, [f.key]: e.target.value})}>
                                          <option value="">-- Chọn tham chiếu --</option>
                                          {f.referenceTarget === 'units' && units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
                                          {f.referenceTarget === 'faculties' && faculties.sort((a,b) => a.name.vi.localeCompare(b.name.vi)).map(fac => <option key={fac.id} value={fac.id}>{fac.name.vi}</option>)}
                                          {f.referenceTarget === 'academicYears' && academicYears.map(y => <option key={y.id} value={y.code}>{y.code}</option>)}
                                      </select>
                                  ) : f.type === 'reference_multiple' ? (
                                      // Custom Multi-Select with checkboxes or just a multi-select box
                                      <div className="border border-slate-300 rounded p-2 max-h-40 overflow-y-auto">
                                          {(f.referenceTarget === 'units' ? units : f.referenceTarget === 'faculties' ? faculties.sort((a,b) => a.name.vi.localeCompare(b.name.vi)) : academicYears).map((item: any) => {
                                              const val = item.unit_id || item.id || item.code;
                                              const label = item.unit_name || item.name?.vi || item.code;
                                              const isChecked = (Array.isArray(tempRecord[f.key]) ? tempRecord[f.key] : []).includes(val);
                                              
                                              return (
                                                  <label key={val} className="flex items-center gap-2 p-1 hover:bg-slate-50 cursor-pointer">
                                                      <input 
                                                          type="checkbox" 
                                                          className="w-4 h-4 text-blue-600 rounded"
                                                          checked={isChecked}
                                                          onChange={() => handleMultiSelectChange(f.key, val)}
                                                      />
                                                      <span className="text-sm">{label}</span>
                                                  </label>
                                              )
                                          })}
                                      </div>
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
        <div className="bg-white border-b border-slate-200 px-6 pt-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm z-10 gap-4">
            <div className="flex items-center">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide mr-8">{group.name}</h2>
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

            {/* FILTERS TOOLBAR */}
            <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-0 pb-1">
                <Filter size={16} className="text-slate-400" />
                
                {/* 1. Search Bar (if any field is searchable) */}
                {group.fields.some(f => f.isSearchable) && (
                    <div className="relative">
                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input 
                            className="pl-7 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs w-40 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Tìm kiếm..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                )}

                {/* 2. Unit Filter (Standard) */}
                {unitFieldKey && (
                    <select 
                        className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 outline-none max-w-[150px]"
                        value={selectedUnitFilter}
                        onChange={(e) => {
                            setSelectedUnitFilter(e.target.value);
                            setSelectedFacultyFilter(''); // Reset faculty filter when unit changes
                        }}
                    >
                        <option value="">-- Đơn vị --</option>
                        {unitOptions.map(opt => (
                            <option key={opt.id} value={opt.id} className={opt.level === 0 ? "font-bold" : ""}>
                                {opt.level > 0 ? '\u00A0\u00A0'.repeat(opt.level * 2) + '↳ ' : ''}{opt.name}
                            </option>
                        ))}
                    </select>
                )}

                {/* 3. Faculty Filter (Standard) */}
                {facultyFieldKey && (
                    <select 
                        className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 outline-none max-w-[150px]"
                        value={selectedFacultyFilter}
                        onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                    >
                        <option value="">-- Nhân sự --</option>
                        {availableFaculties.map(fac => (
                            <option key={fac.id} value={fac.id}>{fac.name.vi}</option>
                        ))}
                    </select>
                )}

                {/* 4. Dynamic Filters */}
                {group.fields.filter(f => f.isFilterable && f.key !== unitFieldKey && f.key !== facultyFieldKey).map(f => (
                    <select 
                        key={f.key}
                        className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 outline-none max-w-[120px]"
                        value={dynamicFilters[f.key] || ''}
                        onChange={(e) => setDynamicFilters({...dynamicFilters, [f.key]: e.target.value})}
                    >
                        <option value="">{f.label}</option>
                        {f.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                ))}
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