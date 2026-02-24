import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Node,
  Edge,
  Connection,
  MarkerType,
  ReactFlowProvider,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { IsoDefinition, IsoProcess, IsoFlowchartNodeData, IsoFlowchartEdgeData, Unit } from '../types';
import { 
  Save, Plus, Trash2, Edit2, FileText, Settings, 
  Layout, List, CheckSquare, BarChart2, ArrowLeft,
  MousePointer, Type, Square, Circle, Diamond,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// --- Custom Node Components ---

const DiamondNode = ({ data, isConnectable }: any) => {
  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <div className="absolute inset-0 bg-white border-2 border-slate-400 transform rotate-45 rounded-sm shadow-sm hover:border-blue-500 transition-colors" />
      <div className="relative z-10 text-xs font-medium text-center p-2 pointer-events-none transform">
        {data.label}
      </div>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Left} isConnectable={isConnectable} className="w-2 h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-2 h-2 !bg-slate-400" />
    </div>
  );
};

const OvalNode = ({ data, isConnectable }: any) => {
  return (
    <div className="px-6 py-3 rounded-[50px] border-2 border-slate-800 bg-white shadow-sm min-w-[120px] text-center">
      <div className="text-sm font-bold text-slate-800">{data.label}</div>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 !bg-slate-800" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 !bg-slate-800" />
    </div>
  );
};

const ProcessNode = ({ data, isConnectable }: any) => {
  return (
    <div className="px-4 py-3 rounded-md border-2 border-blue-600 bg-white shadow-sm min-w-[150px] text-center">
      <div className="text-sm font-medium text-slate-800">{data.label}</div>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 !bg-blue-600" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 !bg-blue-600" />
    </div>
  );
};

const nodeTypes = {
  diamond: DiamondNode,
  oval: OvalNode,
  process: ProcessNode,
};

// --- Main Component ---

interface ISODesignerModuleProps {
  isoDefinitions: IsoDefinition[];
  onUpdateIsoDefinitions: (defs: IsoDefinition[]) => void;
  units: Unit[];
}

const ISODesignerModule: React.FC<ISODesignerModuleProps> = ({ isoDefinitions, onUpdateIsoDefinitions, units }) => {
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'purpose' | 'definitions' | 'flowchart' | 'kpi' | 'records'>('flowchart');
  
  // Editor State
  const [processData, setProcessData] = useState<IsoProcess | null>(null);
  
  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // --- Handlers ---

  const handleCreateNew = () => {
    const newProcess: IsoProcess = {
      id: uuidv4(),
      name: 'Quy trình Mới',
      controlInfo: {
        documentCode: 'QT-XX-00',
        revision: '1.0',
        effectiveDate: new Date().toISOString().split('T')[0],
        drafter: '',
        reviewer: '',
        approver: ''
      },
      purposeScope: { purpose: '', scope: '' },
      definitions: [],
      flowchart: { nodes: [], edges: [] },
      stepDetails: {},
      kpis: [],
      records: [],
      updatedAt: new Date().toISOString()
    };
    
    setProcessData(newProcess);
    setNodes([]);
    setEdges([]);
    setIsEditing(true);
    setSelectedDefId(null); // New, so no existing ID yet
  };

  const handleEdit = (def: IsoDefinition) => {
    // Load existing or migrate
    const proc: IsoProcess = def.processData || {
      id: def.id,
      name: def.name,
      controlInfo: {
        documentCode: def.code,
        revision: '1.0',
        effectiveDate: new Date().toISOString().split('T')[0],
        drafter: '',
        reviewer: '',
        approver: ''
      },
      purposeScope: { purpose: def.description || '', scope: '' },
      definitions: [],
      flowchart: { nodes: [], edges: [] },
      stepDetails: {},
      kpis: [],
      records: [],
      updatedAt: def.updatedAt
    };

    setProcessData(proc);
    
    // Restore Flow
    const initialNodes = proc.flowchart.nodes.map(n => ({
      id: n.id,
      type: n.type === 'start' || n.type === 'end' ? 'oval' : n.type === 'decision' ? 'diamond' : 'process',
      position: n.position,
      data: { label: n.label }
    }));
    
    const initialEdges = proc.flowchart.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed }
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);
    
    setSelectedDefId(def.id);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!processData) return;

    // Serialize Flow
    const flowNodes: IsoFlowchartNodeData[] = nodes.map(n => ({
      id: n.id,
      type: n.type === 'oval' ? (n.data.label === 'Start' ? 'start' : 'end') : n.type === 'diamond' ? 'decision' : 'process',
      label: n.data.label,
      position: n.position
    }));

    const flowEdges: IsoFlowchartEdgeData[] = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label as string
    }));

    const updatedProcess: IsoProcess = {
      ...processData,
      flowchart: { nodes: flowNodes, edges: flowEdges },
      updatedAt: new Date().toISOString()
    };

    // Update or Create Parent Definition
    const updatedDef: IsoDefinition = {
      id: updatedProcess.id,
      name: updatedProcess.name,
      code: updatedProcess.controlInfo.documentCode,
      description: updatedProcess.purposeScope.purpose,
      steps: [], // Legacy sync if needed, or ignore
      transitions: [],
      active: true,
      updatedAt: updatedProcess.updatedAt,
      processData: updatedProcess
    };

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
    setSelectedDefId(null);
  };

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, eds)), [setEdges]);

  // --- Drag & Drop Logic ---
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/label');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      // Project coordinates (simplified, ideally use reactFlowInstance.project)
      // For now, just use offset relative to container
      const position = {
        x: event.nativeEvent.offsetX,
        y: event.nativeEvent.offsetY,
      };
      
      const newNode: Node = {
        id: uuidv4(),
        type,
        position,
        data: { label: label },
      };

      setNodes((nds) => nds.concat(newNode));
      
      // Initialize Step Detail
      if (processData) {
          setProcessData(prev => prev ? ({
              ...prev,
              stepDetails: {
                  ...prev.stepDetails,
                  [newNode.id]: { nodeId: newNode.id, who: '', what: label, when: '', how: '' }
              }
          }) : null);
      }
    },
    [setNodes, processData]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      // Ensure detail exists
      if (processData && !processData.stepDetails[node.id]) {
          setProcessData({
              ...processData,
              stepDetails: {
                  ...processData.stepDetails,
                  [node.id]: { nodeId: node.id, who: '', what: node.data.label, when: '', how: '' }
              }
          });
      }
  };

  // --- Render Sections ---

  if (isEditing && processData) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-slate-800">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{processData.name}</h2>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{processData.controlInfo.documentCode}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm font-medium">
              <Save size={18} /> Lưu Quy trình
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 px-6 flex gap-6 text-sm font-medium overflow-x-auto">
          {[
            { id: 'control', label: '1. Thông tin kiểm soát', icon: Settings },
            { id: 'purpose', label: '2. Mục đích & Phạm vi', icon: FileText },
            { id: 'definitions', label: '3. Thuật ngữ', icon: List },
            { id: 'flowchart', label: '4. Lưu đồ & Chi tiết', icon: Layout },
            { id: 'kpi', label: '6. KPIs', icon: BarChart2 },
            { id: 'records', label: '7. Hồ sơ & Biểu mẫu', icon: CheckSquare },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          
          {/* 1. Control Info */}
          {activeTab === 'control' && (
            <div className="p-8 max-w-4xl mx-auto overflow-y-auto h-full">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Thông tin kiểm soát</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên Quy trình</label>
                    <input 
                      value={processData.name}
                      onChange={e => setProcessData({...processData, name: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mã số tài liệu</label>
                    <input 
                      value={processData.controlInfo.documentCode}
                      onChange={e => setProcessData({...processData, controlInfo: {...processData.controlInfo, documentCode: e.target.value}})}
                      className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số phiên bản (Revision)</label>
                    <input 
                      value={processData.controlInfo.revision}
                      onChange={e => setProcessData({...processData, controlInfo: {...processData.controlInfo, revision: e.target.value}})}
                      className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày ban hành</label>
                    <input 
                      type="date"
                      value={processData.controlInfo.effectiveDate}
                      onChange={e => setProcessData({...processData, controlInfo: {...processData.controlInfo, effectiveDate: e.target.value}})}
                      className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Người soạn thảo</label>
                    <input 
                      value={processData.controlInfo.drafter}
                      onChange={e => setProcessData({...processData, controlInfo: {...processData.controlInfo, drafter: e.target.value}})}
                      className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Người kiểm tra</label>
                    <input 
                      value={processData.controlInfo.reviewer}
                      onChange={e => setProcessData({...processData, controlInfo: {...processData.controlInfo, reviewer: e.target.value}})}
                      className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Người phê duyệt</label>
                    <input 
                      value={processData.controlInfo.approver}
                      onChange={e => setProcessData({...processData, controlInfo: {...processData.controlInfo, approver: e.target.value}})}
                      className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Purpose & Scope */}
          {activeTab === 'purpose' && (
            <div className="p-8 max-w-4xl mx-auto overflow-y-auto h-full">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Mục đích (Purpose)</h3>
                  <p className="text-sm text-slate-500 mb-2">Giải thích lý do quy trình này tồn tại.</p>
                  <textarea 
                    value={processData.purposeScope.purpose}
                    onChange={e => setProcessData({...processData, purposeScope: {...processData.purposeScope, purpose: e.target.value}})}
                    className="w-full h-32 p-3 border border-slate-300 rounded focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Ví dụ: Để đảm bảo việc tuyển dụng đúng người, đúng việc..."
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Phạm vi (Scope)</h3>
                  <p className="text-sm text-slate-500 mb-2">Xác định giới hạn áp dụng của quy trình.</p>
                  <textarea 
                    value={processData.purposeScope.scope}
                    onChange={e => setProcessData({...processData, purposeScope: {...processData.purposeScope, scope: e.target.value}})}
                    className="w-full h-32 p-3 border border-slate-300 rounded focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Ví dụ: Áp dụng cho toàn bộ các khoa, phòng ban trong trường..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Definitions */}
          {activeTab === 'definitions' && (
            <div className="p-8 max-w-4xl mx-auto overflow-y-auto h-full">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Thuật ngữ và Định nghĩa</h3>
                  <button 
                    onClick={() => setProcessData({
                      ...processData, 
                      definitions: [...processData.definitions, { id: uuidv4(), term: '', definition: '' }]
                    })}
                    className="text-sm flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded"
                  >
                    <Plus size={16} /> Thêm Thuật ngữ
                  </button>
                </div>
                <div className="space-y-4">
                  {processData.definitions.map((def, idx) => (
                    <div key={def.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="w-1/3">
                        <input 
                          placeholder="Thuật ngữ / Từ viết tắt"
                          value={def.term}
                          onChange={e => {
                            const newDefs = [...processData.definitions];
                            newDefs[idx].term = e.target.value;
                            setProcessData({...processData, definitions: newDefs});
                          }}
                          className="w-full p-2 border border-slate-300 rounded text-sm font-bold"
                        />
                      </div>
                      <div className="flex-1">
                        <textarea 
                          placeholder="Giải thích / Định nghĩa"
                          value={def.definition}
                          onChange={e => {
                            const newDefs = [...processData.definitions];
                            newDefs[idx].definition = e.target.value;
                            setProcessData({...processData, definitions: newDefs});
                          }}
                          className="w-full p-2 border border-slate-300 rounded text-sm resize-none"
                          rows={2}
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newDefs = processData.definitions.filter(d => d.id !== def.id);
                          setProcessData({...processData, definitions: newDefs});
                        }}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {processData.definitions.length === 0 && (
                    <p className="text-center text-slate-400 italic py-8">Chưa có thuật ngữ nào.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. Flowchart & Details */}
          {activeTab === 'flowchart' && (
            <div className="flex h-full">
              {/* Sidebar Tools */}
              <div className="w-48 bg-white border-r border-slate-200 p-4 flex flex-col gap-4 z-10 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-2">Công cụ</h3>
                <div 
                  className="p-3 bg-slate-50 border border-slate-200 rounded cursor-move hover:border-blue-400 flex items-center gap-2"
                  onDragStart={(event) => onDragStart(event, 'oval', 'Start')}
                  draggable
                >
                  <Circle size={16} className="text-slate-600" />
                  <span className="text-sm">Bắt đầu / Kết thúc</span>
                </div>
                <div 
                  className="p-3 bg-slate-50 border border-slate-200 rounded cursor-move hover:border-blue-400 flex items-center gap-2"
                  onDragStart={(event) => onDragStart(event, 'process', 'Bước thực hiện')}
                  draggable
                >
                  <Square size={16} className="text-blue-600" />
                  <span className="text-sm">Bước thực hiện</span>
                </div>
                <div 
                  className="p-3 bg-slate-50 border border-slate-200 rounded cursor-move hover:border-blue-400 flex items-center gap-2"
                  onDragStart={(event) => onDragStart(event, 'diamond', 'Quyết định')}
                  draggable
                >
                  <Diamond size={16} className="text-amber-600" />
                  <span className="text-sm">Quyết định</span>
                </div>
                
                <div className="mt-auto text-xs text-slate-400">
                  Kéo thả hình vào vùng vẽ. Click vào hình để sửa chi tiết.
                </div>
              </div>

              {/* Canvas & Detail Panel */}
              <div className="flex-1 flex flex-col relative">
                <div className="flex-1 bg-slate-50" onDrop={onDrop} onDragOver={onDragOver}>
                  <ReactFlowProvider>
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      onNodeClick={onNodeClick}
                      nodeTypes={nodeTypes}
                      fitView
                    >
                      <Background color="#e2e8f0" gap={16} />
                      <Controls />
                      <Panel position="top-right" className="bg-white p-2 rounded shadow text-xs text-slate-500">
                        {nodes.length} Steps | {edges.length} Connections
                      </Panel>
                    </ReactFlow>
                  </ReactFlowProvider>
                </div>

                {/* Detailed Instructions Panel (Bottom) */}
                <div className="h-1/3 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex flex-col">
                  <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <List size={16} /> Mô tả chi tiết (5W1H)
                    </h3>
                    {selectedNodeId ? (
                       <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                         Đang chọn: {nodes.find(n => n.id === selectedNodeId)?.data.label}
                       </span>
                    ) : (
                       <span className="text-xs text-slate-400 italic">Chọn một bước để chỉnh sửa chi tiết</span>
                    )}
                  </div>
                  
                  {selectedNodeId && processData.stepDetails[selectedNodeId] ? (
                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-6">
                      <div className="col-span-2">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên bước (Task)</label>
                         <input 
                           value={nodes.find(n => n.id === selectedNodeId)?.data.label}
                           onChange={e => {
                             setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, label: e.target.value } } : n));
                             // Update detail 'what' as well
                             setProcessData(prev => prev ? ({
                               ...prev,
                               stepDetails: {
                                 ...prev.stepDetails,
                                 [selectedNodeId]: { ...prev.stepDetails[selectedNodeId], what: e.target.value }
                               }
                             }) : null);
                           }}
                           className="w-full p-2 border border-slate-300 rounded font-medium focus:border-blue-500 focus:outline-none"
                         />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Who (Ai thực hiện?)</label>
                        <input 
                          value={processData.stepDetails[selectedNodeId].who}
                          onChange={e => setProcessData(prev => prev ? ({
                            ...prev,
                            stepDetails: {
                              ...prev.stepDetails,
                              [selectedNodeId]: { ...prev.stepDetails[selectedNodeId], who: e.target.value }
                            }
                          }) : null)}
                          className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="Ví dụ: Trưởng phòng nhân sự"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">When (Khi nào/Bao lâu?)</label>
                        <input 
                          value={processData.stepDetails[selectedNodeId].when}
                          onChange={e => setProcessData(prev => prev ? ({
                            ...prev,
                            stepDetails: {
                              ...prev.stepDetails,
                              [selectedNodeId]: { ...prev.stepDetails[selectedNodeId], when: e.target.value }
                            }
                          }) : null)}
                          className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="Ví dụ: Trong vòng 24h"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">How (Thực hiện như thế nào/Công cụ gì?)</label>
                        <textarea 
                          value={processData.stepDetails[selectedNodeId].how}
                          onChange={e => setProcessData(prev => prev ? ({
                            ...prev,
                            stepDetails: {
                              ...prev.stepDetails,
                              [selectedNodeId]: { ...prev.stepDetails[selectedNodeId], how: e.target.value }
                            }
                          }) : null)}
                          className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none resize-none"
                          rows={2}
                          placeholder="Mô tả cách thức thực hiện, phần mềm sử dụng..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                      <p>Click vào một hình khối trong lưu đồ để nhập thông tin chi tiết 5W1H.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 6. KPIs */}
          {activeTab === 'kpi' && (
            <div className="p-8 max-w-4xl mx-auto overflow-y-auto h-full">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Chỉ số đo lường hiệu quả (KPIs)</h3>
                  <button 
                    onClick={() => setProcessData({
                      ...processData, 
                      kpis: [...processData.kpis, { id: uuidv4(), indicator: '', target: '' }]
                    })}
                    className="text-sm flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded"
                  >
                    <Plus size={16} /> Thêm KPI
                  </button>
                </div>
                <div className="space-y-4">
                  {processData.kpis.map((kpi, idx) => (
                    <div key={kpi.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chỉ số (Indicator)</label>
                        <input 
                          value={kpi.indicator}
                          onChange={e => {
                            const newKpis = [...processData.kpis];
                            newKpis[idx].indicator = e.target.value;
                            setProcessData({...processData, kpis: newKpis});
                          }}
                          className="w-full p-2 border border-slate-300 rounded text-sm"
                          placeholder="Ví dụ: Tỷ lệ lỗi"
                        />
                      </div>
                      <div className="w-1/3">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mục tiêu (Target)</label>
                        <input 
                          value={kpi.target}
                          onChange={e => {
                            const newKpis = [...processData.kpis];
                            newKpis[idx].target = e.target.value;
                            setProcessData({...processData, kpis: newKpis});
                          }}
                          className="w-full p-2 border border-slate-300 rounded text-sm font-medium"
                          placeholder="< 0.5%"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newKpis = processData.kpis.filter(k => k.id !== kpi.id);
                          setProcessData({...processData, kpis: newKpis});
                        }}
                        className="mt-6 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {processData.kpis.length === 0 && (
                    <p className="text-center text-slate-400 italic py-8">Chưa có KPI nào.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 7. Records & Forms */}
          {activeTab === 'records' && (
            <div className="p-8 max-w-4xl mx-auto overflow-y-auto h-full">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Hồ sơ và Biểu mẫu</h3>
                  <button 
                    onClick={() => setProcessData({
                      ...processData, 
                      records: [...processData.records, { id: uuidv4(), name: '', code: '' }]
                    })}
                    className="text-sm flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded"
                  >
                    <Plus size={16} /> Thêm Biểu mẫu
                  </button>
                </div>
                <div className="space-y-4">
                  {processData.records.map((rec, idx) => (
                    <div key={rec.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên Biểu mẫu / Hồ sơ</label>
                        <input 
                          value={rec.name}
                          onChange={e => {
                            const newRecs = [...processData.records];
                            newRecs[idx].name = e.target.value;
                            setProcessData({...processData, records: newRecs});
                          }}
                          className="w-full p-2 border border-slate-300 rounded text-sm"
                        />
                      </div>
                      <div className="w-1/4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã số</label>
                        <input 
                          value={rec.code}
                          onChange={e => {
                            const newRecs = [...processData.records];
                            newRecs[idx].code = e.target.value;
                            setProcessData({...processData, records: newRecs});
                          }}
                          className="w-full p-2 border border-slate-300 rounded text-sm font-mono"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newRecs = processData.records.filter(r => r.id !== rec.id);
                          setProcessData({...processData, records: newRecs});
                        }}
                        className="mt-6 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {processData.records.length === 0 && (
                    <p className="text-center text-slate-400 italic py-8">Chưa có biểu mẫu nào.</p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="p-6 h-full flex flex-col bg-slate-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Thiết kế Quy trình ISO</h2>
          <p className="text-slate-500">Xây dựng và quản lý các quy trình vận hành chuẩn (SOPs).</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-all"
        >
          <Plus size={20} /> Tạo Quy trình Mới
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
              {def.description || 'Chưa có mô tả.'}
            </p>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
              <button 
                onClick={() => handleEdit(def)}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <Edit2 size={16} /> Chỉnh sửa
              </button>
              <button 
                onClick={() => {
                    if (confirm("Bạn có chắc chắn muốn xóa quy trình này?")) {
                        onUpdateIsoDefinitions(isoDefinitions.filter(d => d.id !== def.id));
                    }
                }}
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
            <p className="text-lg font-medium">Chưa có quy trình nào</p>
            <p className="text-sm">Bấm "Tạo Quy trình Mới" để bắt đầu.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ISODesignerModule;
