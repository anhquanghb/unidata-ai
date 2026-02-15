import React, { useState, useEffect, useMemo } from 'react';
import { Unit, Faculty, DynamicRecord, DataConfigGroup, HumanResourceRecord } from '../types';
import { ArrowRight, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight, RefreshCw, GitMerge, FilePlus, FileDiff, UserPlus, Users, Database, Briefcase, AlertOctagon } from 'lucide-react';

interface DataSyncModuleProps {
  localData: any;
  externalData: any;
  onCommit: (mergedData: any) => void;
  onCancel: () => void;
}

// Diff Status Types
type DiffStatus = 'new' | 'modified' | 'identical' | 'conflict' | 'suspect';
type ActionType = 'keep_local' | 'take_external' | 'merge' | 'skip';

interface UnitDiffItem {
  id: string;
  local?: Unit;
  external?: Unit;
  status: DiffStatus;
  action: ActionType;
  message?: string;
}

interface DynamicDiffItem {
  id: string;
  local?: DynamicRecord;
  external?: DynamicRecord;
  status: DiffStatus;
  action: ActionType;
  message?: string;
  displayValue: string; // Summarized text for display
}

interface FacultyDiffItem {
  id: string; // Internal ID (Local or External)
  matchId?: string; // The ID of the matched record in the other set
  local?: Faculty;
  external?: Faculty;
  status: DiffStatus;
  action: ActionType;
  message?: string;
}

interface HrDiffItem {
  id: string;
  local?: HumanResourceRecord;
  external?: HumanResourceRecord;
  status: DiffStatus;
  action: ActionType;
  message?: string;
  personName: string;
  unitName: string;
}

const DataSyncModule: React.FC<DataSyncModuleProps> = ({ localData, externalData, onCommit, onCancel }) => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'units' | 'dynamic' | 'faculty' | 'hr'>('units');
  const [unitDiffs, setUnitDiffs] = useState<UnitDiffItem[]>([]);
  const [dynamicDiffs, setDynamicDiffs] = useState<Record<string, DynamicDiffItem[]>>({});
  const [facultyDiffs, setFacultyDiffs] = useState<FacultyDiffItem[]>([]);
  const [hrDiffs, setHrDiffs] = useState<HrDiffItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  
  // Confirmation Modal State
  const [isConfirming, setIsConfirming] = useState(false);

  // --- HELPERS ---
  const normalizeStr = (str: string = '') => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // --- DIFF ENGINE ---
  useEffect(() => {
    setIsProcessing(true);
    setTimeout(() => {
      // 1. UNIT DIFF LOGIC
      const uDiffs: UnitDiffItem[] = [];
      const localUnitsRaw = (Array.isArray(localData.units) ? localData.units : []) as Unit[];
      const localUnitsMap = new Map<string, Unit>(localUnitsRaw.map((u) => [u.unit_id, u]));
      const externalUnits: Unit[] = externalData.units || [];

      // Helper for names
      const getUnitName = (id: string) => {
          const u = localUnitsMap.get(id) || externalUnits.find(eu => eu.unit_id === id);
          return u?.unit_name || id;
      };

      externalUnits.forEach(extU => {
        const localU = localUnitsMap.get(extU.unit_id);
        if (!localU) {
          // New Branch
          uDiffs.push({
            id: extU.unit_id,
            external: extU,
            status: 'new',
            action: 'take_external',
            message: 'Đơn vị mới'
          });
        } else {
          // Modification Check
          if (localU.unit_name !== extU.unit_name) {
            uDiffs.push({
              id: extU.unit_id,
              local: localU,
              external: extU,
              status: 'modified',
              action: 'keep_local', // Default safety
              message: 'Tên đơn vị khác biệt'
            });
          }
        }
      });
      setUnitDiffs(uDiffs);

      // 2. DYNAMIC DATA DIFF LOGIC
      const dDiffs: Record<string, DynamicDiffItem[]> = {};
      const localGroups: DataConfigGroup[] = localData.dataConfigGroups || [];
      const externalStore = externalData.dynamicDataStore || {};
      const localStore = localData.dynamicDataStore || {};

      localGroups.forEach(group => {
        const extRecords: DynamicRecord[] = externalStore[group.id] || [];
        const locRecords: DynamicRecord[] = localStore[group.id] || [];
        const groupDiffs: DynamicDiffItem[] = [];
        const validFields = group.fields.map(f => f.key);
        const locMap = new Map(locRecords.map(r => [r.id, r]));

        extRecords.forEach(extRec => {
          const cleanExtRec: any = { id: extRec.id, academicYear: extRec.academicYear, updatedAt: extRec.updatedAt };
          validFields.forEach(key => { if (extRec[key] !== undefined) cleanExtRec[key] = extRec[key]; });
          const locRec = locMap.get(extRec.id);
          const displayField = group.fields.find(f => f.type === 'text')?.key || group.fields[0]?.key;
          const displayValue = String(cleanExtRec[displayField] || 'Record');

          if (!locRec) {
            groupDiffs.push({ id: extRec.id, external: cleanExtRec, status: 'new', action: 'take_external', displayValue, message: 'Dữ liệu mới' });
          } else {
            let isDifferent = false;
            validFields.forEach(key => { if (JSON.stringify(locRec[key]) !== JSON.stringify(cleanExtRec[key])) isDifferent = true; });

            if (isDifferent) {
              const timeLoc = locRec.updatedAt ? new Date(locRec.updatedAt).getTime() : 0;
              const timeExt = extRec.updatedAt ? new Date(extRec.updatedAt).getTime() : 0;
              
              if (timeExt > timeLoc) {
                 groupDiffs.push({ id: extRec.id, local: locRec, external: cleanExtRec, status: 'modified', action: 'take_external', displayValue, message: 'Có bản cập nhật mới hơn' });
              } else if (timeLoc > timeExt) {
                 // Skip stale
              } else {
                 groupDiffs.push({ id: extRec.id, local: locRec, external: cleanExtRec, status: 'conflict', action: 'keep_local', displayValue, message: 'Xung đột dữ liệu' });
              }
            }
          }
        });
        if (groupDiffs.length > 0) dDiffs[group.id] = groupDiffs;
      });
      setDynamicDiffs(dDiffs);

      // 3. FACULTY DIFF LOGIC
      const fDiffs: FacultyDiffItem[] = [];
      const localFacs: Faculty[] = localData.faculties || [];
      const extFacs: Faculty[] = externalData.faculties || [];
      const localIdMap = new Map(localFacs.map(f => [f.id, f]));
      const localEmailMap = new Map(localFacs.filter(f => f.email).map(f => [normalizeStr(f.email!), f]));
      
      // Helper to get faculty name
      const getFacultyName = (id: string) => {
          const f = localIdMap.get(id) || extFacs.find(ef => ef.id === id);
          return f?.name.vi || id;
      };

      extFacs.forEach(extF => {
        if (localIdMap.has(extF.id)) {
           const locF = localIdMap.get(extF.id)!;
           if (JSON.stringify(extF) !== JSON.stringify(locF)) {
               fDiffs.push({ id: extF.id, matchId: locF.id, local: locF, external: extF, status: 'modified', action: 'keep_local', message: 'Thông tin thay đổi' });
           }
           return;
        }
        if (extF.email && localEmailMap.has(normalizeStr(extF.email))) {
            const locF = localEmailMap.get(normalizeStr(extF.email))!;
            fDiffs.push({ id: extF.id, matchId: locF.id, local: locF, external: extF, status: 'conflict', action: 'merge', message: 'Trùng Email (ID khác nhau)' });
            return;
        }
        const nameMatch = localFacs.find(l => normalizeStr(l.name.vi) === normalizeStr(extF.name.vi));
        if (nameMatch) {
            fDiffs.push({ id: extF.id, matchId: nameMatch.id, local: nameMatch, external: extF, status: 'suspect', action: 'keep_local', message: 'Trùng tên (Cần xác nhận)' });
            return;
        }
        fDiffs.push({ id: extF.id, external: extF, status: 'new', action: 'take_external', message: 'Nhân sự mới' });
      });
      setFacultyDiffs(fDiffs);

      // 4. HUMAN RESOURCES (ASSIGNMENT) DIFF LOGIC
      const hDiffs: HrDiffItem[] = [];
      const localHR: HumanResourceRecord[] = localData.humanResources || [];
      const extHR: HumanResourceRecord[] = externalData.humanResources || [];

      // Create a map for quick lookup of existing assignments in local: "facultyId_unitId"
      const localAssignmentMap = new Map(localHR.map(hr => [`${hr.facultyId}_${hr.unitId}`, hr]));

      extHR.forEach(extRec => {
          const key = `${extRec.facultyId}_${extRec.unitId}`;
          const locRec = localAssignmentMap.get(key);
          const personName = getFacultyName(extRec.facultyId);
          const unitName = getUnitName(extRec.unitId);

          if (!locRec) {
              // Assignment doesn't exist in local (New Assignment)
              hDiffs.push({
                  id: extRec.id,
                  external: extRec,
                  status: 'new',
                  action: 'take_external',
                  message: 'Phân công mới',
                  personName,
                  unitName
              });
          } else {
              // Assignment exists, check for changes (Role, Dates)
              const isDiff = locRec.role !== extRec.role || 
                             locRec.startDate !== extRec.startDate || 
                             locRec.endDate !== extRec.endDate;
              
              if (isDiff) {
                  hDiffs.push({
                      id: extRec.id,
                      local: locRec,
                      external: extRec,
                      status: 'modified',
                      action: 'keep_local', // Safe default
                      message: 'Thay đổi thông tin phân công',
                      personName,
                      unitName
                  });
              }
          }
      });
      setHrDiffs(hDiffs);

      setIsProcessing(false);
    }, 500); 
  }, [localData, externalData]);

  // --- ACTIONS ---
  const handleUnitAction = (id: string, action: ActionType) => setUnitDiffs(prev => prev.map(u => u.id === id ? { ...u, action } : u));
  const handleDynamicAction = (groupId: string, id: string, action: ActionType) => setDynamicDiffs(prev => ({ ...prev, [groupId]: prev[groupId].map(d => d.id === id ? { ...d, action } : d) }));
  const handleFacultyAction = (id: string, action: ActionType) => setFacultyDiffs(prev => prev.map(f => f.id === id ? { ...f, action } : f));
  const handleHrAction = (id: string, action: ActionType) => setHrDiffs(prev => prev.map(h => h.id === id ? { ...h, action } : h));

  // --- COMMIT LOGIC ---
  const executeCommit = () => {
      // Clone Local Data
      const finalData = JSON.parse(JSON.stringify(localData));

      // 1. Commit Units
      unitDiffs.forEach(diff => {
          if (diff.action === 'take_external' && diff.external) {
              finalData.units.push(diff.external);
          } else if (diff.action === 'merge' && diff.external) {
              const idx = finalData.units.findIndex((u: Unit) => u.unit_id === diff.id);
              if (idx !== -1) finalData.units[idx] = diff.external; 
          }
      });

      // 2. Commit Dynamic Data
      Object.keys(dynamicDiffs).forEach(groupId => {
          const groupDiffs = dynamicDiffs[groupId];
          if (!finalData.dynamicDataStore[groupId]) finalData.dynamicDataStore[groupId] = [];
          
          groupDiffs.forEach(diff => {
              if (diff.action === 'take_external' && diff.external) {
                  const idx = finalData.dynamicDataStore[groupId].findIndex((r: any) => r.id === diff.id);
                  if (idx !== -1) finalData.dynamicDataStore[groupId][idx] = { ...diff.external, updatedAt: new Date().toISOString() };
                  else finalData.dynamicDataStore[groupId].push({ ...diff.external, updatedAt: new Date().toISOString() });
              }
          });
      });

      // 3. Commit Faculty
      facultyDiffs.forEach(diff => {
          if (diff.action === 'take_external' && diff.external) {
              finalData.faculties.push(diff.external);
          } else if ((diff.action === 'merge' || diff.action === 'take_external') && diff.matchId && diff.external) {
              const idx = finalData.faculties.findIndex((f: Faculty) => f.id === diff.matchId);
              if (idx !== -1) finalData.faculties[idx] = { ...diff.external, id: diff.matchId };
          }
      });

      // 4. Commit HR Assignments
      hrDiffs.forEach(diff => {
          if (diff.action === 'take_external' && diff.external) {
              // Add new assignment
              finalData.humanResources.push(diff.external);
          } else if (diff.action === 'merge' && diff.local && diff.external) {
              // Merge is tricky for link tables, usually implied update
              // Update existing assignment
              const idx = finalData.humanResources.findIndex((hr: HumanResourceRecord) => hr.id === diff.local!.id);
              if (idx !== -1) {
                  finalData.humanResources[idx] = { ...diff.external, id: diff.local!.id }; // Keep local ID but update fields
              }
          } else if (diff.status === 'modified' && diff.action === 'take_external' && diff.local && diff.external) {
               // Update existing assignment (Take External Content)
               const idx = finalData.humanResources.findIndex((hr: HumanResourceRecord) => hr.id === diff.local!.id);
               if (idx !== -1) {
                   finalData.humanResources[idx] = { ...diff.external, id: diff.local!.id };
               }
          }
      });

      setIsConfirming(false);
      onCommit(finalData);
  };

  const handlePreCommit = () => {
      // Show Confirmation Modal
      setIsConfirming(true);
  };

  // --- RENDERING ---
  const renderStatusBadge = (status: DiffStatus) => {
      switch (status) {
          case 'new': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">MỚI</span>;
          case 'modified': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">THAY ĐỔI</span>;
          case 'conflict': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">XUNG ĐỘT</span>;
          case 'suspect': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">NGHI VẤN</span>;
          default: return null;
      }
  };

  if (isProcessing) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <RefreshCw className="w-10 h-10 animate-spin mb-3 text-blue-600"/>
              <p>Đang phân tích và so sánh dữ liệu...</p>
          </div>
      );
  }

  const hasChanges = unitDiffs.length > 0 || Object.keys(dynamicDiffs).length > 0 || facultyDiffs.length > 0 || hrDiffs.length > 0;

  if (!hasChanges) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4"/>
              <h3 className="text-lg font-bold text-slate-800">Dữ liệu đồng bộ</h3>
              <p>Không tìm thấy sự khác biệt nào giữa dữ liệu hiện tại và nguồn ngoài.</p>
              <button onClick={onCancel} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm font-bold">Đóng</button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
        {/* Header Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('units')}
                className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'units' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Database size={16}/> Cơ cấu Tổ chức ({unitDiffs.length})
            </button>
            <button 
                onClick={() => setActiveTab('dynamic')}
                className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'dynamic' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <FileDiff size={16}/> Dữ liệu Động ({Object.values(dynamicDiffs).flat().length})
            </button>
            <button 
                onClick={() => setActiveTab('faculty')}
                className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'faculty' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Users size={16}/> Nhân sự ({facultyDiffs.length})
            </button>
            <button 
                onClick={() => setActiveTab('hr')}
                className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'hr' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Briefcase size={16}/> Phân công ({hrDiffs.length})
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
            {/* UNITS TAB */}
            {activeTab === 'units' && (
                <div className="space-y-3">
                    {unitDiffs.map(diff => (
                        <div key={diff.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {renderStatusBadge(diff.status)}
                                    <span className="font-bold text-slate-700">{diff.external?.unit_name || diff.local?.unit_name}</span>
                                </div>
                                <p className="text-xs text-slate-500">{diff.message} (ID: {diff.id})</p>
                            </div>
                            <div className="flex gap-2">
                                {diff.status === 'new' ? (
                                    <>
                                        <button onClick={() => handleUnitAction(diff.id, 'skip')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'skip' ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-50'}`}>Bỏ qua</button>
                                        <button onClick={() => handleUnitAction(diff.id, 'take_external')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'take_external' ? 'bg-green-600 text-white' : 'bg-white border text-green-600'}`}>Thêm mới</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleUnitAction(diff.id, 'keep_local')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'keep_local' ? 'bg-blue-600 text-white' : 'bg-white border text-blue-600'}`}>Giữ cũ</button>
                                        <button onClick={() => handleUnitAction(diff.id, 'merge')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'merge' ? 'bg-orange-600 text-white' : 'bg-white border text-orange-600'}`}>Thay tên</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {unitDiffs.length === 0 && <p className="text-center text-slate-400 mt-10">Không có thay đổi về cơ cấu tổ chức.</p>}
                </div>
            )}

            {/* DYNAMIC DATA TAB */}
            {activeTab === 'dynamic' && (
                <div className="space-y-6">
                    {Object.keys(dynamicDiffs).map(groupId => (
                        <div key={groupId}>
                            <h4 className="font-bold text-slate-700 mb-2 uppercase text-xs tracking-wider border-b pb-1">Nhóm: {localData.dataConfigGroups?.find((g:any) => g.id === groupId)?.name || groupId}</h4>
                            <div className="space-y-2">
                                {dynamicDiffs[groupId].map(diff => (
                                    <div key={diff.id} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {renderStatusBadge(diff.status)}
                                                    <span className="text-sm font-medium text-slate-800">{diff.displayValue}</span>
                                                </div>
                                                <p className="text-xs text-slate-500">{diff.message}</p>
                                            </div>
                                            <div className="flex bg-slate-100 p-1 rounded">
                                                <button onClick={() => handleDynamicAction(groupId, diff.id, 'keep_local')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${diff.action === 'keep_local' ? 'bg-white shadow text-slate-700' : 'text-slate-400'}`}>Giữ Cũ</button>
                                                <button onClick={() => handleDynamicAction(groupId, diff.id, 'take_external')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${diff.action === 'take_external' ? 'bg-white shadow text-green-600' : 'text-slate-400'}`}>Lấy Mới</button>
                                            </div>
                                        </div>
                                        {/* Show simple diff visualization if modified/conflict */}
                                        {(diff.status === 'modified' || diff.status === 'conflict') && (
                                            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded">
                                                <div className="text-slate-500 border-r pr-2">
                                                    <strong>Local:</strong> {JSON.stringify(diff.local).substring(0, 50)}...
                                                </div>
                                                <div className="text-green-600">
                                                    <strong>External:</strong> {JSON.stringify(diff.external).substring(0, 50)}...
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {Object.keys(dynamicDiffs).length === 0 && <p className="text-center text-slate-400 mt-10">Không có thay đổi về dữ liệu động.</p>}
                </div>
            )}

            {/* FACULTY TAB */}
            {activeTab === 'faculty' && (
                <div className="space-y-3">
                    {facultyDiffs.map(diff => (
                        <div key={diff.id} className={`bg-white p-4 rounded-lg shadow-sm border ${diff.status === 'suspect' ? 'border-amber-300 bg-amber-50' : 'border-slate-200'} flex justify-between items-center`}>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {renderStatusBadge(diff.status)}
                                    <span className="font-bold text-slate-700">{diff.external?.name.vi}</span>
                                </div>
                                <div className="text-xs text-slate-500">
                                    {diff.message} <br/>
                                    <span className="font-mono">{diff.external?.email || 'No Email'}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {diff.status === 'new' ? (
                                    <>
                                        <button onClick={() => handleFacultyAction(diff.id, 'skip')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'skip' ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-50'}`}>Bỏ qua</button>
                                        <button onClick={() => handleFacultyAction(diff.id, 'take_external')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${diff.action === 'take_external' ? 'bg-green-600 text-white' : 'bg-white border text-green-600'}`}><UserPlus size={12}/> Thêm</button>
                                    </>
                                ) : diff.status === 'suspect' || diff.status === 'conflict' ? (
                                    <>
                                        <button onClick={() => handleFacultyAction(diff.id, 'take_external')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'take_external' ? 'bg-white border text-green-600' : 'text-slate-400'}`}>Tạo Mới (Khác)</button>
                                        <button onClick={() => handleFacultyAction(diff.id, 'merge')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${diff.action === 'merge' ? 'bg-amber-500 text-white' : 'bg-white border text-amber-600'}`}><GitMerge size={12}/> Gộp (Đè)</button>
                                        <button onClick={() => handleFacultyAction(diff.id, 'keep_local')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'keep_local' ? 'bg-blue-600 text-white' : 'bg-white border text-blue-600'}`}>Giữ Cũ</button>
                                    </>
                                ) : (
                                    // Modified
                                    <>
                                        <button onClick={() => handleFacultyAction(diff.id, 'keep_local')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'keep_local' ? 'bg-blue-600 text-white' : 'bg-white border text-blue-600'}`}>Giữ Cũ</button>
                                        <button onClick={() => handleFacultyAction(diff.id, 'take_external')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'take_external' ? 'bg-green-600 text-white' : 'bg-white border text-green-600'}`}>Cập nhật</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {facultyDiffs.length === 0 && <p className="text-center text-slate-400 mt-10">Không có thay đổi về nhân sự.</p>}
                </div>
            )}

            {/* HUMAN RESOURCES (ASSIGNMENT) TAB */}
            {activeTab === 'hr' && (
                <div className="space-y-3">
                    {hrDiffs.map(diff => (
                        <div key={diff.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {renderStatusBadge(diff.status)}
                                    <span className="font-bold text-slate-700">{diff.personName}</span>
                                    <ArrowRight size={14} className="text-slate-400"/>
                                    <span className="font-bold text-indigo-700">{diff.unitName}</span>
                                </div>
                                <div className="text-xs text-slate-500">
                                    {diff.message} <br/>
                                    {diff.external?.role} (Start: {diff.external?.startDate || 'N/A'})
                                </div>
                                {diff.status === 'modified' && diff.local && diff.external && (
                                    <div className="mt-1 text-[10px] bg-slate-50 p-1 rounded grid grid-cols-2 gap-2">
                                        <div className="text-slate-500">Local: {diff.local.role} ({diff.local.startDate})</div>
                                        <div className="text-green-600">Ext: {diff.external.role} ({diff.external.startDate})</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {diff.status === 'new' ? (
                                    <>
                                        <button onClick={() => handleHrAction(diff.id, 'skip')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'skip' ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-50'}`}>Bỏ qua</button>
                                        <button onClick={() => handleHrAction(diff.id, 'take_external')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'take_external' ? 'bg-green-600 text-white' : 'bg-white border text-green-600'}`}>Thêm phân công</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleHrAction(diff.id, 'keep_local')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'keep_local' ? 'bg-blue-600 text-white' : 'bg-white border text-blue-600'}`}>Giữ cũ</button>
                                        <button onClick={() => handleHrAction(diff.id, 'take_external')} className={`px-3 py-1.5 rounded text-xs font-bold ${diff.action === 'take_external' ? 'bg-green-600 text-white' : 'bg-white border text-green-600'}`}>Cập nhật</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {hrDiffs.length === 0 && <p className="text-center text-slate-400 mt-10">Không có thay đổi về phân công nhân sự.</p>}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end gap-3">
            <button onClick={onCancel} className="px-4 py-2 bg-white border border-slate-300 rounded text-slate-700 font-bold text-sm hover:bg-slate-50">Hủy bỏ</button>
            <button onClick={handlePreCommit} className="px-6 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 shadow flex items-center gap-2">
                <RefreshCw size={16}/> Xác nhận Đồng bộ
            </button>
        </div>

        {/* Confirmation Modal */}
        {isConfirming && (
            <div className="absolute inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-in zoom-in-95">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                            <AlertOctagon size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Cảnh báo Đồng bộ</h3>
                        <p className="text-slate-600 mt-2 text-sm">
                            Hệ thống sẽ thực hiện các thay đổi dựa trên lựa chọn của bạn. 
                            <br/><br/>
                            <strong>Vui lòng kiểm tra kỹ lại các lựa chọn trong TẤT CẢ các thẻ</strong> (Cơ cấu, Dữ liệu động, Nhân sự, Phân công) trước khi tiếp tục.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsConfirming(false)}
                            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
                        >
                            Xem lại
                        </button>
                        <button 
                            onClick={executeCommit}
                            className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg font-bold text-sm hover:bg-amber-700 shadow-md transition-colors"
                        >
                            Đồng ý
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default DataSyncModule;