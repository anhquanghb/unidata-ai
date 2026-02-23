import React, { useState, useEffect } from 'react';
import { IsoDefinition, IsoStep, IsoTransition, Unit } from '../types';
import { Plus, Trash2, Save, ArrowRight, Edit2, PlayCircle, StopCircle, User, FileText, CheckCircle, XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ISODesignerModuleProps {
  isoDefinitions: IsoDefinition[];
  onUpdateIsoDefinitions: (defs: IsoDefinition[]) => void;
  units: Unit[];
}

const ISODesignerModule: React.FC<ISODesignerModuleProps> = ({ isoDefinitions, onUpdateIsoDefinitions, units }) => {
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editor State
  const [currentDef, setCurrentDef] = useState<IsoDefinition | null>(null);

  // Handlers
  const handleCreateNew = () => {
    const newDef: IsoDefinition = {
      id: uuidv4(),
      name: 'New ISO Process',
      code: `ISO-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      description: '',
      steps: [],
      transitions: [],
      active: true,
      updatedAt: new Date().toISOString()
    };
    setCurrentDef(newDef);
    setSelectedDefId(newDef.id);
    setIsEditing(true);
  };

  const handleEdit = (def: IsoDefinition) => {
    setCurrentDef({ ...def }); // Clone
    setSelectedDefId(def.id);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this ISO Definition?')) {
      const updated = isoDefinitions.filter(d => d.id !== id);
      onUpdateIsoDefinitions(updated);
      if (selectedDefId === id) {
        setSelectedDefId(null);
        setIsEditing(false);
        setCurrentDef(null);
      }
    }
  };

  const handleSaveCurrent = () => {
    if (!currentDef) return;
    
    const updatedDef = { ...currentDef, updatedAt: new Date().toISOString() };
    
    const existingIndex = isoDefinitions.findIndex(d => d.id === updatedDef.id);
    let newDefs;
    if (existingIndex >= 0) {
      newDefs = [...isoDefinitions];
      newDefs[existingIndex] = updatedDef;
    } else {
      newDefs = [...isoDefinitions, updatedDef];
    }
    
    onUpdateIsoDefinitions(newDefs);
    setIsEditing(false);
    setSelectedDefId(null); // Return to list
  };

  // --- Step & Transition Logic ---

  const addStep = () => {
    if (!currentDef) return;
    const newStep: IsoStep = {
      id: uuidv4(),
      name: `Step ${currentDef.steps.length + 1}`,
      executorRole: 'unit_manager',
      isStart: currentDef.steps.length === 0,
      isEnd: false
    };
    setCurrentDef({
      ...currentDef,
      steps: [...currentDef.steps, newStep]
    });
  };

  const updateStep = (id: string, updates: Partial<IsoStep>) => {
    if (!currentDef) return;
    setCurrentDef({
      ...currentDef,
      steps: currentDef.steps.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const removeStep = (id: string) => {
    if (!currentDef) return;
    // Remove step and related transitions
    setCurrentDef({
      ...currentDef,
      steps: currentDef.steps.filter(s => s.id !== id),
      transitions: currentDef.transitions.filter(t => t.fromStepId !== id && t.toStepId !== id)
    });
  };

  const addTransition = (fromStepId: string) => {
    if (!currentDef) return;
    const newTrans: IsoTransition = {
      id: uuidv4(),
      fromStepId,
      toStepId: '', // User must select
      actionName: 'Submit'
    };
    setCurrentDef({
      ...currentDef,
      transitions: [...currentDef.transitions, newTrans]
    });
  };

  const updateTransition = (id: string, updates: Partial<IsoTransition>) => {
    if (!currentDef) return;
    setCurrentDef({
      ...currentDef,
      transitions: currentDef.transitions.map(t => t.id === id ? { ...t, ...updates } : t)
    });
  };

  const removeTransition = (id: string) => {
    if (!currentDef) return;
    setCurrentDef({
      ...currentDef,
      transitions: currentDef.transitions.filter(t => t.id !== id)
    });
  };

  // --- Render ---

  if (isEditing && currentDef) {
    return (
      <div className="p-6 h-full flex flex-col bg-slate-50 overflow-hidden">
        {/* Header Editor */}
        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-slate-800">
              &larr; Back
            </button>
            <div>
              <input 
                value={currentDef.name} 
                onChange={e => setCurrentDef({...currentDef, name: e.target.value})}
                className="text-xl font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                placeholder="Process Name"
              />
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                  {currentDef.code}
                </span>
                <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={currentDef.active} 
                    onChange={e => setCurrentDef({...currentDef, active: e.target.checked})}
                  />
                  Active
                </label>
              </div>
            </div>
          </div>
          <button 
            onClick={handleSaveCurrent}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-all"
          >
            <Save size={18} /> Save Blueprint
          </button>
        </div>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Steps List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                  <FileText size={20} /> Process Steps
                </h3>
                <button onClick={addStep} className="text-sm flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={16} /> Add Step
                </button>
              </div>

              {currentDef.steps.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                  No steps defined. Click "Add Step" to start.
                </div>
              )}

              {currentDef.steps.map((step, index) => (
                <div key={step.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative group transition-all hover:shadow-md">
                  {/* Step Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step.isStart ? 'bg-green-100 text-green-700' : step.isEnd ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {index + 1}
                      </div>
                      <div>
                        <input 
                          value={step.name}
                          onChange={e => updateStep(step.id, { name: e.target.value })}
                          className="font-semibold text-slate-800 focus:outline-none border-b border-transparent focus:border-blue-300 w-full"
                          placeholder="Step Name"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <select 
                            value={step.executorRole}
                            onChange={e => updateStep(step.id, { executorRole: e.target.value })}
                            className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 focus:outline-none max-w-[150px]"
                          >
                            <optgroup label="Vai trò chung">
                                <option value="school_admin">School Admin</option>
                                <option value="unit_manager">Unit Manager</option>
                                <option value="lecturer">Lecturer</option>
                            </optgroup>
                            <optgroup label="Vị trí cụ thể (School)">
                                <option value="Hiệu trưởng">Hiệu trưởng</option>
                                <option value="Phó hiệu trưởng">Phó hiệu trưởng</option>
                                <option value="Trợ lý hiệu trưởng">Trợ lý hiệu trưởng</option>
                                <option value="Trợ lý phó hiệu trưởng">Trợ lý phó hiệu trưởng</option>
                            </optgroup>
                            <optgroup label="Đối tượng ngoài">
                                <option value="Sinh viên">Sinh viên</option>
                                <option value="Phụ huynh">Phụ huynh</option>
                                <option value="Doanh nghiệp">Doanh nghiệp</option>
                                <option value="Cựu sinh viên">Cựu sinh viên</option>
                                <option value="Khách mời">Khách mời</option>
                            </optgroup>
                          </select>
                          
                          {/* Flags */}
                          <label className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={step.isStart || false} 
                              onChange={e => updateStep(step.id, { isStart: e.target.checked })}
                            /> Start
                          </label>
                          <label className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={step.isEnd || false} 
                              onChange={e => updateStep(step.id, { isEnd: e.target.checked })}
                            /> End
                          </label>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeStep(step.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Transitions Section */}
                  <div className="pl-11">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Next Actions (Transitions)</span>
                      <button onClick={() => addTransition(step.id)} className="text-blue-500 hover:text-blue-700 flex items-center gap-1">
                        <Plus size={12} /> Add Action
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {currentDef.transitions.filter(t => t.fromStepId === step.id).map(trans => (
                        <div key={trans.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                          <span className="text-slate-400"><ArrowRight size={14} /></span>
                          <input 
                            value={trans.actionName}
                            onChange={e => updateTransition(trans.id, { actionName: e.target.value })}
                            className="bg-transparent border-b border-transparent focus:border-blue-300 focus:outline-none w-24 text-slate-700 font-medium"
                            placeholder="Action"
                          />
                          <span className="text-slate-400 text-xs">goes to</span>
                          <select 
                            value={trans.toStepId}
                            onChange={e => updateTransition(trans.id, { toStepId: e.target.value })}
                            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none flex-1"
                          >
                            <option value="">Select Step...</option>
                            {currentDef.steps.filter(s => s.id !== step.id).map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <button onClick={() => removeTransition(trans.id)} className="text-slate-300 hover:text-red-400">
                            <XCircle size={14} />
                          </button>
                        </div>
                      ))}
                      {currentDef.transitions.filter(t => t.fromStepId === step.id).length === 0 && (
                        <div className="text-xs text-slate-400 italic">No transitions defined. This is a dead end.</div>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="p-6 h-full flex flex-col bg-slate-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ISO Process Designer</h2>
          <p className="text-slate-500">Design and manage standard operating procedures (SOPs).</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-all"
        >
          <Plus size={20} /> New Blueprint
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20">
        {isoDefinitions.map(def => (
          <div key={def.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all group relative">
            <div className="flex justify-between items-start mb-3">
              <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-mono font-bold">
                {def.code}
              </div>
              <div className={`w-2 h-2 rounded-full ${def.active ? 'bg-green-500' : 'bg-slate-300'}`} title={def.active ? 'Active' : 'Inactive'} />
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
              {def.name}
            </h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">
              {def.description || 'No description provided.'}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
              <span className="flex items-center gap-1"><FileText size={14} /> {def.steps.length} Steps</span>
              <span className="flex items-center gap-1"><ArrowRight size={14} /> {def.transitions.length} Transitions</span>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
              <button 
                onClick={() => handleEdit(def)}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <Edit2 size={16} /> Edit
              </button>
              <button 
                onClick={() => handleDelete(def.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {isoDefinitions.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">No ISO Definitions found</p>
            <p className="text-sm">Create a new blueprint to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ISODesignerModule;
