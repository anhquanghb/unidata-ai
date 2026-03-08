import React from 'react';
import ReactFlow, {
  Controls,
  Background,
  Handle,
  Position,
  Node,
  Edge,
  MarkerType,
  ReactFlowProvider,
  Panel,
  ControlButton
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Plus, Trash2, List, Square, Circle, Diamond, ArrowLeft, X, Copy, Link
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  IsoProcess, Unit, HumanResourceRecord, Faculty 
} from '../../types';

// --- Custom Node Components ---

const DiamondNode = ({ data, isConnectable }: any) => {
  const isEnd = data.role === 'end';

  return (
    <div className="relative flex items-center justify-center w-32 h-32 group">
      <div className="absolute inset-0 bg-white border-2 border-slate-400 transform rotate-45 rounded-sm shadow-sm hover:border-blue-500 transition-colors" />
      <div className="relative z-10 text-xs font-medium text-center p-2 pointer-events-none transform">
        {data.label}
      </div>
      <Handle 
        type="target" 
        position={Position.Top} 
        id="t-top" 
        isConnectable={isConnectable} 
        isConnectableStart={false}
        className="w-5 h-5 !bg-slate-500 !left-[40%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
      >
        <span className="text-[10px] text-white leading-none">▲</span>
      </Handle>
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="t-bottom" 
        isConnectable={isConnectable} 
        isConnectableStart={false}
        className="w-5 h-5 !bg-slate-500 !left-[40%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
      >
        <span className="text-[10px] text-white leading-none">▼</span>
      </Handle>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="t-left" 
        isConnectable={isConnectable} 
        isConnectableStart={false}
        className="w-5 h-5 !bg-slate-500 !top-[40%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
      >
        <span className="text-[10px] text-white leading-none">◄</span>
      </Handle>
      <Handle 
        type="target" 
        position={Position.Right} 
        id="t-right" 
        isConnectable={isConnectable} 
        isConnectableStart={false}
        className="w-5 h-5 !bg-slate-500 !top-[40%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
      >
        <span className="text-[10px] text-white leading-none">►</span>
      </Handle>
      
      {!isEnd && (
        <>
          <Handle 
            type="source" 
            position={Position.Top} 
            id="s-top" 
            isConnectable={isConnectable} 
            isConnectableEnd={false}
            className="w-5 h-5 !bg-slate-400 !left-[60%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">□</span>
          </Handle>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="s-bottom" 
            isConnectable={isConnectable} 
            isConnectableEnd={false}
            className="w-5 h-5 !bg-slate-400 !left-[60%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">□</span>
          </Handle>
          <Handle 
            type="source" 
            position={Position.Left} 
            id="s-left" 
            isConnectable={isConnectable} 
            isConnectableEnd={false}
            className="w-5 h-5 !bg-slate-400 !top-[60%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">□</span>
          </Handle>
          <Handle 
            type="source" 
            position={Position.Right} 
            id="s-right" 
            isConnectable={isConnectable} 
            isConnectableEnd={false}
            className="w-5 h-5 !bg-slate-400 !top-[60%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">□</span>
          </Handle>
        </>
      )}
    </div>
  );
};

const OvalNode = ({ type, data, isConnectable }: any) => {
  const isStart = type === 'start' || data.role === 'start';
  const isEnd = type === 'end' || data.role === 'end';

  return (
    <div className={`px-6 py-3 rounded-[50px] border-2 bg-white shadow-sm min-w-[120px] text-center relative group ${isStart ? 'border-green-600' : isEnd ? 'border-red-600' : 'border-slate-800'}`}>
      <div className={`text-sm font-bold ${isStart ? 'text-green-800' : isEnd ? 'text-red-800' : 'text-slate-800'}`}>{data.label}</div>
      
      {!isStart && (
        <>
          <Handle 
            type="target" 
            position={Position.Top} 
            id="t-top" 
            isConnectable={isConnectable} 
            isConnectableStart={false}
            className="w-5 h-5 !bg-slate-700 !left-[40%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">▲</span>
          </Handle>
          <Handle 
            type="target" 
            position={Position.Bottom} 
            id="t-bottom" 
            isConnectable={isConnectable} 
            isConnectableStart={false}
            className="w-5 h-5 !bg-slate-700 !left-[40%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">▼</span>
          </Handle>
          <Handle 
            type="target" 
            position={Position.Left} 
            id="t-left" 
            isConnectable={isConnectable} 
            isConnectableStart={false}
            className="w-5 h-5 !bg-slate-700 !top-[40%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">◄</span>
          </Handle>
          <Handle 
            type="target" 
            position={Position.Right} 
            id="t-right" 
            isConnectable={isConnectable} 
            isConnectableStart={false}
            className="w-5 h-5 !bg-slate-700 !top-[40%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">►</span>
          </Handle>
        </>
      )}
      
      {!isEnd && (
        <>
          <Handle 
            type="source" 
            position={Position.Top} 
            id="s-top" 
            isConnectable={isConnectable} 
            isConnectableEnd={false}
            className="w-5 h-5 !bg-slate-800 !left-[60%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">□</span>
          </Handle>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="s-bottom" 
            isConnectable={isConnectable} 
            isConnectableEnd={false}
            className="w-5 h-5 !bg-slate-800 !left-[60%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">□</span>
          </Handle>
          <Handle 
            type="source" 
            position={Position.Left} 
            id="s-left" 
            isConnectable={isConnectable} 
            isConnectableEnd={false}
            className="w-5 h-5 !bg-slate-800 !top-[60%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">□</span>
          </Handle>
          <Handle 
            type="source" 
            position={Position.Right} 
            id="s-right" 
            isConnectable={isConnectable} 
            isConnectableEnd={false}
            className="w-5 h-5 !bg-slate-800 !top-[60%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">□</span>
          </Handle>
        </>
      )}
    </div>
  );
};

const ProcessNode = ({ data, isConnectable }: any) => {
  const isEnd = data.role === 'end';

  return (
    <div className="px-4 py-3 rounded-md border-2 border-blue-600 bg-white shadow-sm min-w-[150px] text-center relative group">
      <div className="text-sm font-medium text-slate-800">{data.label}</div>
      <Handle 
        type="target" 
        position={Position.Top} 
        id="t-top" 
        isConnectable={isConnectable} 
        isConnectableStart={false}
        className="w-5 h-5 !bg-blue-600 !left-[40%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
      >
        <span className="text-[10px] text-white leading-none">▲</span>
      </Handle>
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="t-bottom" 
        isConnectable={isConnectable} 
        isConnectableStart={false}
        className="w-5 h-5 !bg-blue-600 !left-[40%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
      >
        <span className="text-[10px] text-white leading-none">▼</span>
      </Handle>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="t-left" 
        isConnectable={isConnectable} 
        isConnectableStart={false}
        className="w-5 h-5 !bg-blue-600 !top-[40%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
      >
        <span className="text-[10px] text-white leading-none">◄</span>
      </Handle>
      <Handle 
        type="target" 
        position={Position.Right} 
        id="t-right" 
        isConnectable={isConnectable} 
        isConnectableStart={false}
        className="w-5 h-5 !bg-blue-600 !top-[40%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
      >
        <span className="text-[10px] text-white leading-none">►</span>
      </Handle>
      
      {!isEnd && (
        <>
          <Handle 
            type="source" 
            position={Position.Top} 
            id="s-top" 
            isConnectable={isConnectable} 
            isConnectableEnd={false}
            className="w-5 h-5 !bg-blue-600 !left-[60%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">□</span>
          </Handle>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="s-bottom" 
            isConnectable={isConnectable} 
            isConnectableEnd={false}
            className="w-5 h-5 !bg-blue-600 !left-[60%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">□</span>
          </Handle>
          <Handle 
            type="source" 
            position={Position.Left} 
            id="s-left" 
            isConnectable={isConnectable} 
            isConnectableEnd={false}
            className="w-5 h-5 !bg-blue-600 !top-[60%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">□</span>
          </Handle>
          <Handle 
            type="source" 
            position={Position.Right} 
            id="s-right" 
            isConnectable={isConnectable} 
            isConnectableEnd={false}
            className="w-5 h-5 !bg-blue-600 !top-[60%] opacity-0 group-hover:opacity-20 hover:!opacity-80 transition-opacity flex items-center justify-center border-none"
          >
            <span className="text-[10px] text-white leading-none">□</span>
          </Handle>
        </>
      )}
    </div>
  );
};

const nodeTypes = {
  diamond: DiamondNode,
  oval: OvalNode,
  process: ProcessNode,
  start: OvalNode,
  end: OvalNode,
};

interface ISOFlowModuleProps {
  processData: IsoProcess;
  setProcessData: React.Dispatch<React.SetStateAction<IsoProcess | null>>;
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  onReconnect: any;
  onConnectStart: any;
  onConnectEnd: any;
  onNodeClick: any;
  onEdgeClick: any;
  onNodesDelete: any;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;
  sidebarWidth: number;
  setIsResizing: (type: 'sidebar' | 'bottom' | null) => void;
  bottomPanelHeight: number;
  handleCopyFlowchart: () => void;
  contextMenu: any;
  handleAddNodeFromMenu: (type: string, label: string) => void;
  onDrop: any;
  onDragOver: any;
  units: Unit[];
  humanResources: HumanResourceRecord[];
  faculties: Faculty[];
  setConditionModal: (val: any) => void;
  showAddMenu: boolean;
  setShowAddMenu: (val: boolean) => void;
}

export const ISOFlowModule: React.FC<ISOFlowModuleProps> = ({
  processData,
  setProcessData,
  nodes,
  setNodes,
  edges,
  setEdges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onReconnect,
  onConnectStart,
  onConnectEnd,
  onNodeClick,
  onEdgeClick,
  onNodesDelete,
  selectedNodeId,
  setSelectedNodeId,
  selectedEdgeId,
  setSelectedEdgeId,
  sidebarWidth,
  setIsResizing,
  bottomPanelHeight,
  handleCopyFlowchart,
  contextMenu,
  handleAddNodeFromMenu,
  onDrop,
  onDragOver,
  units,
  humanResources,
  faculties,
  setConditionModal,
  showAddMenu,
  setShowAddMenu
}) => {
  return (
    <div className="flex h-full select-none">
      {/* Sidebar Steps List */}
      <div 
        style={{ width: sidebarWidth }}
        className="bg-white border-r border-slate-200 p-4 flex flex-col gap-4 z-10 shadow-sm shrink-0 overflow-hidden"
      >
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <List size={16}/> Các bước quy trình
            </h3>
            <div className="relative group add-step-menu-container">
                <button 
                    className={`p-1 hover:bg-slate-100 rounded ${showAddMenu ? 'bg-slate-100 text-blue-700' : 'text-blue-600'}`}
                    onClick={() => setShowAddMenu(!showAddMenu)}
                >
                    <Plus size={16} />
                </button>
                {showAddMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-lg rounded-lg p-1 w-48 z-50">
                    {!nodes.some(n => n.data.role === 'start' || (n.type === 'oval' && n.data.label === 'Start')) && (
                        <button 
                            onClick={() => {
                                const newNode: Node = {
                                    id: uuidv4(),
                                    type: 'start',
                                    position: { x: 50, y: 50 },
                                    data: { label: 'Start', role: 'start' },
                                };
                                setNodes(nds => nds.concat(newNode));
                                if (processData) {
                                    setProcessData(prev => prev ? ({
                                        ...prev,
                                        stepDetails: { ...prev.stepDetails, [newNode.id]: { nodeId: newNode.id, who: '', what: 'Start', when: '', how: '' } }
                                    }) : null);
                                }
                            }}
                            className="flex items-center gap-2 px-2 py-2 hover:bg-slate-50 text-slate-700 rounded text-sm w-full text-left"
                        >
                            <Circle size={14} className="text-slate-600"/> Điểm đầu (Start)
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            const yPos = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.y)) + 100 : 50;
                            const newNode: Node = {
                                id: uuidv4(),
                                type: 'process',
                                position: { x: 50, y: yPos },
                                data: { label: 'Bước thực hiện' },
                            };
                            setNodes(nds => nds.concat(newNode));
                            if (processData) {
                                setProcessData(prev => prev ? ({
                                    ...prev,
                                    stepDetails: { ...prev.stepDetails, [newNode.id]: { nodeId: newNode.id, who: '', what: 'Bước thực hiện', when: '', how: '' } }
                                }) : null);
                            }
                        }}
                        className="flex items-center gap-2 px-2 py-2 hover:bg-blue-50 text-slate-700 rounded text-sm w-full text-left"
                    >
                        <Square size={14} className="text-blue-600"/> Bước thực hiện
                    </button>
                    <button 
                        onClick={() => {
                            const yPos = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.y)) + 100 : 50;
                            const newNode: Node = {
                                id: uuidv4(),
                                type: 'diamond',
                                position: { x: 50, y: yPos },
                                data: { label: 'Điểm quyết định' },
                            };
                            setNodes(nds => nds.concat(newNode));
                            if (processData) {
                                setProcessData(prev => prev ? ({
                                    ...prev,
                                    stepDetails: { ...prev.stepDetails, [newNode.id]: { nodeId: newNode.id, who: '', what: 'Điểm quyết định', when: '', how: '' } }
                                }) : null);
                            }
                        }}
                        className="flex items-center gap-2 px-2 py-2 hover:bg-amber-50 text-slate-700 rounded text-sm w-full text-left"
                    >
                        <Diamond size={14} className="text-amber-600"/> Điểm quyết định
                    </button>
                    <button 
                        onClick={() => {
                            const yPos = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.y)) + 100 : 50;
                            const newNode: Node = {
                                id: uuidv4(),
                                type: 'end',
                                position: { x: 50, y: yPos },
                                data: { label: 'End', role: 'end' },
                            };
                            setNodes(nds => nds.concat(newNode));
                            if (processData) {
                                setProcessData(prev => prev ? ({
                                    ...prev,
                                    stepDetails: { ...prev.stepDetails, [newNode.id]: { nodeId: newNode.id, who: '', what: 'End', when: '', how: '' } }
                                }) : null);
                            }
                        }}
                        className="flex items-center gap-2 px-2 py-2 hover:bg-slate-50 text-slate-700 rounded text-sm w-full text-left"
                    >
                        <Circle size={14} className="text-slate-600"/> Điểm kết thúc
                    </button>
                </div>
                )}
            </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {nodes.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center mt-4">Chưa có bước nào. Hãy thêm bước bằng nút (+).</p>
            )}
            {nodes.map((node) => {
                const outgoingEdges = edges.filter(e => e.source === node.id);
                const incomingEdges = edges.filter(e => e.target === node.id);
                const isStartNode = node.type === 'start' || node.data.role === 'start';
                const isEndNode = node.type === 'end' || node.data.role === 'end';
                
                let error = null;
                if (isStartNode) {
                    if (outgoingEdges.length === 0) error = "Điểm đầu chưa có bước tiếp theo";
                } else if (isEndNode) {
                    if (incomingEdges.length === 0) error = "Điểm kết thúc chưa có bước phía trước";
                } else if (node.type === 'process') {
                    if (incomingEdges.length === 0 && outgoingEdges.length === 0) error = "Bước thực hiện bị cô lập";
                    else if (incomingEdges.length === 0) error = "Thiếu bước phía trước";
                    else if (outgoingEdges.length === 0) error = "Thiếu bước phía sau";
                } else if (node.type === 'diamond') {
                    if (outgoingEdges.length < 2) error = "Điểm quyết định cần ít nhất 2 nhánh rẽ";
                }

                return (
                <div 
                    key={node.id}
                    className={`p-3 border rounded transition-colors flex flex-col gap-2 relative group/item 
                        ${selectedNodeId === node.id || (selectedEdgeId && outgoingEdges.some(e => e.id === selectedEdgeId)) ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}
                        ${error ? 'border-red-400 bg-red-50' : ''}
                    `}
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                        setSelectedEdgeId(null);
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div className={`text-slate-500 ${error ? 'text-red-500' : ''}`}>
                            {node.type === 'oval' || node.type === 'start' || node.type === 'end' ? <Circle size={14} /> : node.type === 'diamond' ? <Diamond size={14} /> : <Square size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`text-xs font-bold truncate ${error ? 'text-red-700' : 'text-slate-700'}`}>{node.data.label}</div>
                        </div>
                        {selectedNodeId === node.id && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const nodeToDelete = nodes.find(n => n.id === node.id);
                                    if (nodeToDelete) {
                                        onNodesDelete([nodeToDelete]);
                                        setNodes(nds => nds.filter(n => n.id !== node.id));
                                    }
                                }}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Xóa bước này"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                    
                    {error && (
                        <div className="text-[10px] text-red-600 flex items-center gap-1 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                            {error}
                        </div>
                    )}
                    
                    {!isEndNode && (
                        <div className="mt-1 pt-2 border-t border-slate-200/50">
                            <div className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1">
                                <ArrowLeft size={10} className="rotate-180"/> BƯỚC TIẾP THEO
                            </div>
                            
                            {node.type === 'diamond' ? (
                                <div className="space-y-1">
                                    {outgoingEdges.map(edge => (
                                        <div 
                                            key={edge.id} 
                                            className={`flex items-center gap-1 text-xs border rounded px-1.5 py-1 cursor-pointer transition-all ${selectedEdgeId === edge.id ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-400' : 'bg-white border-slate-200 hover:border-purple-300'}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEdgeId(edge.id);
                                                setSelectedNodeId(null);
                                            }}
                                        >
                                            <span className="font-mono text-[10px] text-purple-600 bg-purple-50 px-1 rounded">{edge.label || '?'}</span>
                                            <ArrowLeft size={10} className="rotate-180 text-slate-400"/>
                                            <span className="truncate flex-1">{nodes.find(n => n.id === edge.target)?.data.label || edge.target}</span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEdges(eds => eds.filter(ed => ed.id !== edge.id));
                                                }}
                                                className="text-slate-400 hover:text-red-500 p-0.5"
                                            >
                                                <X size={12}/>
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        className="w-full text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded p-1 hover:bg-blue-100 flex items-center justify-center gap-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConditionModal({ isOpen: true, nodeId: node.id, condition: '', targetId: '' });
                                        }}
                                    >
                                        <Plus size={12}/> Thêm nhánh rẽ
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-1">
                                    <select 
                                        className={`w-full text-xs p-1 border rounded transition-all ${selectedEdgeId === outgoingEdges[0]?.id ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-400' : 'border-slate-300'}`}
                                        value={outgoingEdges[0]?.target || ''}
                                        onClick={e => {
                                            e.stopPropagation();
                                            if (outgoingEdges[0]) {
                                                setSelectedEdgeId(outgoingEdges[0].id);
                                                setSelectedNodeId(null);
                                            }
                                        }}
                                        onChange={(e) => {
                                            const targetId = e.target.value;
                                            if (!targetId) {
                                                if (outgoingEdges.length > 0) {
                                                    setEdges(eds => eds.filter(ed => ed.id !== outgoingEdges[0].id));
                                                }
                                            } else {
                                                if (outgoingEdges.length > 0) {
                                                    setEdges(eds => eds.map(ed => ed.id === outgoingEdges[0].id ? { ...ed, target: targetId } : ed));
                                                } else {
                                                    const newEdge: Edge = {
                                                        id: `e${node.id}-${targetId}-${uuidv4()}`,
                                                        source: node.id,
                                                        target: targetId,
                                                        type: 'smoothstep',
                                                        markerEnd: { type: MarkerType.ArrowClosed },
                                                    };
                                                    setEdges(eds => [...eds, newEdge]);
                                                }
                                            }
                                        }}
                                    >
                                        <option value="">-- Chọn bước tiếp theo --</option>
                                        {nodes.filter(n => n.id !== node.id).map(n => (
                                            <option key={n.id} value={n.id}>{n.data.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )})}
        </div>
        
        <div className="mt-auto text-xs text-slate-400 border-t pt-2">
          <p>Kéo từ điểm kết nối của một khối ra vùng trống để thêm bước mới.</p>
        </div>
      </div>

      {/* Sidebar Resizer Handle */}
      <div
        className="w-1 bg-slate-100 hover:bg-blue-400 active:bg-blue-600 cursor-col-resize transition-colors z-20 flex items-center justify-center group"
        onMouseDown={() => setIsResizing('sidebar')}
      >
         <div className="h-8 w-0.5 bg-slate-300 group-hover:bg-white rounded"></div>
      </div>

      {/* Canvas & Detail Panel */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 bg-slate-50" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onReconnect={onReconnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onNodesDelete={onNodesDelete}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={{
                style: { strokeWidth: 2.5, stroke: '#475569' },
                markerEnd: { 
                  type: MarkerType.ArrowClosed,
                  color: '#475569',
                  width: 20,
                  height: 20
                }
              }}
              fitView
              snapToGrid={true}
              snapGrid={[15, 15]}
            >
              <style>{`
                .react-flow__edges {
                  z-index: 10 !important;
                }
                .react-flow__nodes {
                  z-index: 5 !important;
                }
                .react-flow__edge-path {
                  stroke-width: 2.5;
                }
              `}</style>
              <Background color="#e2e8f0" gap={16} />
              <Controls>
                <ControlButton onClick={handleCopyFlowchart} title="Sao chép hình ảnh lưu đồ">
                  <Copy size={14} />
                </ControlButton>
              </Controls>
              <Panel position="top-right" className="bg-white p-2 rounded shadow text-xs text-slate-500">
                {nodes.length} Steps | {edges.length} Connections
              </Panel>
              {contextMenu && (() => {
                const sourceNode = nodes.find(n => n.id === contextMenu.sourceNodeId);
                const isEndNode = sourceNode?.data.role === 'end';
                
                if (isEndNode) return null;

                return (
                  <div 
                      style={{ top: contextMenu.y, left: contextMenu.x }} 
                      className="absolute bg-white border border-slate-200 shadow-lg rounded-lg p-2 flex flex-col gap-1 z-50 w-48"
                      onClick={(e) => e.stopPropagation()}
                  >
                      <div className="text-xs font-bold text-slate-500 px-2 py-1 uppercase">Thêm bước tiếp theo</div>
                      <button 
                          onClick={() => handleAddNodeFromMenu('process', 'Bước thực hiện')}
                          className="flex items-center gap-2 px-2 py-2 hover:bg-blue-50 text-slate-700 rounded text-sm text-left"
                      >
                          <Square size={14} className="text-blue-600"/> Bước thực hiện
                      </button>
                      <button 
                          onClick={() => handleAddNodeFromMenu('diamond', 'Điểm quyết định')}
                          className="flex items-center gap-2 px-2 py-2 hover:bg-amber-50 text-slate-700 rounded text-sm text-left"
                      >
                          <Diamond size={14} className="text-amber-600"/> Điểm quyết định
                      </button>
                      <button 
                          onClick={() => handleAddNodeFromMenu('end', 'Kết thúc')}
                          className="flex items-center gap-2 px-2 py-2 hover:bg-slate-100 text-slate-700 rounded text-sm text-left"
                      >
                          <Circle size={14} className="text-slate-600"/> Kết thúc
                      </button>
                  </div>
                );
              })()}
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {/* Bottom Panel Resizer Handle */}
        <div
            className="h-1 bg-slate-100 hover:bg-blue-400 active:bg-blue-600 cursor-row-resize transition-colors z-20 flex items-center justify-center group"
            onMouseDown={() => setIsResizing('bottom')}
        >
            <div className="w-8 h-0.5 bg-slate-300 group-hover:bg-white rounded"></div>
        </div>

        {/* Detailed Instructions Panel (Bottom) */}
        <div 
            style={{ height: bottomPanelHeight }}
            className="bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex flex-col shrink-0"
        >
          <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <List size={16} /> Mô tả chi tiết (5W1H)
            </h3>
            {selectedNodeId ? (
               <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                 Đang chọn: {nodes.find(n => n.id === selectedNodeId)?.data.label}
               </span>
            ) : selectedEdgeId ? (
               <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                 Đang chọn: Mũi tên kết nối
               </span>
            ) : (
               <span className="text-xs text-slate-400 italic">Chọn một bước hoặc mũi tên để chỉnh sửa chi tiết</span>
            )}
          </div>
          
          {selectedNodeId && processData.stepDetails[selectedNodeId] ? (
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-6">
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên bước (Task)</label>
                  <input 
                    value={nodes.find(n => n.id === selectedNodeId)?.data.label}
                    onChange={e => {
                      setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, label: e.target.value } } : n));
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
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vai trò bước</label>
                  <select
                    value={nodes.find(n => n.id === selectedNodeId)?.data.role || 'process'}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, role: newRole } } : n));
                    }}
                    className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="process">Bước thực hiện</option>
                    <option value="decision">Điểm quyết định</option>
                    <option value="start">Điểm bắt đầu</option>
                    <option value="end">Điểm kết thúc</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Who (Ai thực hiện?)</label>
                <div className="space-y-2">
                  <select
                    className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                    value={processData.stepDetails[selectedNodeId].whoConfig?.unitType || ''}
                    onChange={(e) => {
                        const newType = e.target.value as any;
                        setProcessData(prev => {
                            if (!prev) return null;
                            const currentDetail = prev.stepDetails[selectedNodeId];
                            let newUnitId = undefined;
                            if (newType === 'external') {
                                const extUnit = units.find(u => u.unit_type === 'external');
                                if (extUnit) newUnitId = extUnit.unit_id;
                            }
                            const newConfig = { ...currentDetail.whoConfig, unitType: newType, unitId: newUnitId, personId: undefined };
                            let displayString = '';
                            if (newType === 'school') displayString = 'Cấp Trường';
                            else if (newType === 'faculty') displayString = 'Cấp Khoa/Phòng';
                            else if (newType === 'department') displayString = 'Cấp Bộ môn/Tổ';
                            else if (newType === 'external') displayString = 'Đối tượng ngoài';
                            return {
                                ...prev,
                                stepDetails: {
                                    ...prev.stepDetails,
                                    [selectedNodeId]: { 
                                        ...currentDetail, 
                                        whoConfig: newConfig,
                                        who: displayString
                                    }
                                }
                            };
                        });
                    }}
                  >
                    <option value="">-- Chọn Cấp Đơn vị --</option>
                    <option value="school">Cấp Trường</option>
                    <option value="faculty">Cấp Khoa/Phòng ban</option>
                    <option value="department">Cấp Bộ môn/Tổ</option>
                    <option value="external">Đối tượng ngoài</option>
                  </select>

                  <select
                    className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                    value={processData.stepDetails[selectedNodeId].whoConfig?.unitId || ''}
                    disabled={!processData.stepDetails[selectedNodeId].whoConfig?.unitType || processData.stepDetails[selectedNodeId].whoConfig?.unitType === 'external'}
                    onChange={(e) => {
                        const newUnitId = e.target.value;
                        setProcessData(prev => {
                            if (!prev) return null;
                            const currentDetail = prev.stepDetails[selectedNodeId];
                            const newConfig = { ...currentDetail.whoConfig, unitId: newUnitId, personId: undefined };
                            let displayString = currentDetail.who;
                            const unit = units.find(u => u.unit_id === newUnitId);
                            if (unit) displayString = unit.unit_name;
                            return {
                                ...prev,
                                stepDetails: {
                                    ...prev.stepDetails,
                                    [selectedNodeId]: { 
                                        ...currentDetail, 
                                        whoConfig: newConfig,
                                        who: displayString
                                    }
                                }
                            };
                        });
                    }}
                  >
                    <option value="">-- Chọn Đơn vị cụ thể (Nếu cần) --</option>
                    {units
                        .filter(u => u.unit_type === processData.stepDetails[selectedNodeId].whoConfig?.unitType)
                        .map(u => (
                            <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                        ))
                    }
                  </select>

                  <select
                    className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                    value={processData.stepDetails[selectedNodeId].whoConfig?.personId || ''}
                    disabled={!processData.stepDetails[selectedNodeId].whoConfig?.unitId}
                    onChange={(e) => {
                        const newPersonId = e.target.value;
                        setProcessData(prev => {
                            if (!prev) return null;
                            const currentDetail = prev.stepDetails[selectedNodeId];
                            const newConfig = { ...currentDetail.whoConfig, personId: newPersonId };
                            let displayString = currentDetail.who;
                            const person = humanResources.find(p => p.id === newPersonId);
                            const unit = units.find(u => u.unit_id === currentDetail.whoConfig?.unitId);
                            if (person) {
                                if (currentDetail.whoConfig?.unitType === 'external') {
                                    displayString = person.customPositionName || 'Đối tượng ngoài';
                                } else {
                                    let personName = person.id;
                                    const facultyProfile = faculties.find(f => f.id === person.facultyId);
                                    if (facultyProfile) personName = facultyProfile.name.vi;
                                    displayString = `${personName} (${unit?.unit_name})`;
                                }
                            } else if (unit) {
                                displayString = unit.unit_name;
                            }
                            return {
                                ...prev,
                                stepDetails: {
                                    ...prev.stepDetails,
                                    [selectedNodeId]: { 
                                        ...currentDetail, 
                                        whoConfig: newConfig,
                                        who: displayString
                                    }
                                }
                            };
                        });
                    }}
                  >
                    <option value="">-- Chọn {processData.stepDetails[selectedNodeId].whoConfig?.unitType === 'external' ? 'Đối tượng' : 'Cá nhân'} cụ thể --</option>
                    {humanResources
                        .filter(p => p.unitId === processData.stepDetails[selectedNodeId].whoConfig?.unitId)
                        .map(p => {
                            const facultyProfile = faculties.find(f => f.id === p.facultyId);
                            const name = processData.stepDetails[selectedNodeId].whoConfig?.unitType === 'external' 
                                ? p.customPositionName 
                                : (facultyProfile ? facultyProfile.name.vi : p.id);
                            return <option key={p.id} value={p.id}>{name || p.id}</option>;
                        })
                    }
                  </select>

                   <input 
                      value={processData.stepDetails[selectedNodeId].who}
                      onChange={e => setProcessData(prev => prev ? ({
                        ...prev,
                        stepDetails: {
                          ...prev.stepDetails,
                          [selectedNodeId]: { ...prev.stepDetails[selectedNodeId], who: e.target.value }
                        }
                      }) : null)}
                      className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none bg-slate-50 italic"
                      placeholder="Tên hiển thị (tự động hoặc nhập tay)"
                    />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">When (Khi nào/Bao lâu?)</label>
                <div className="flex gap-2">
                    <input 
                      type="number"
                      min="0"
                      value={processData.stepDetails[selectedNodeId].whenConfig?.value || ''}
                      onChange={e => {
                          const val = parseInt(e.target.value);
                          setProcessData(prev => {
                            if (!prev) return null;
                            const currentDetail = prev.stepDetails[selectedNodeId];
                            const currentUnit = currentDetail.whenConfig?.unit || 'working_hours';
                            const newConfig = { ...currentDetail.whenConfig, value: val, unit: currentUnit };
                            const unitLabels: Record<string, string> = {
                                'working_hours': 'giờ làm việc',
                                'working_days': 'ngày làm việc',
                                'weeks': 'tuần',
                                'months': 'tháng',
                                'years': 'năm'
                            };
                            const displayString = `${val} ${unitLabels[currentUnit]}`;
                            return {
                                ...prev,
                                stepDetails: {
                                    ...prev.stepDetails,
                                    [selectedNodeId]: { 
                                        ...currentDetail, 
                                        whenConfig: newConfig,
                                        when: displayString
                                    }
                                }
                            };
                          });
                      }}
                      className="w-24 p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Giá trị"
                    />
                    <select
                        className="flex-1 p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        value={processData.stepDetails[selectedNodeId].whenConfig?.unit || 'working_hours'}
                        onChange={e => {
                            const newUnit = e.target.value as any;
                            setProcessData(prev => {
                                if (!prev) return null;
                                const currentDetail = prev.stepDetails[selectedNodeId];
                                const currentVal = currentDetail.whenConfig?.value || 0;
                                const newConfig = { ...currentDetail.whenConfig, value: currentVal, unit: newUnit };
                                const unitLabels: Record<string, string> = {
                                    'working_hours': 'giờ làm việc',
                                    'working_days': 'ngày làm việc',
                                    'weeks': 'tuần',
                                    'months': 'tháng',
                                    'years': 'năm'
                                };
                                const displayString = `${currentVal} ${unitLabels[newUnit]}`;
                                return {
                                    ...prev,
                                    stepDetails: {
                                        ...prev.stepDetails,
                                        [selectedNodeId]: { 
                                            ...currentDetail, 
                                            whenConfig: newConfig,
                                            when: displayString
                                        }
                                    }
                                };
                            });
                        }}
                    >
                        <option value="working_hours">Giờ làm việc</option>
                        <option value="working_days">Ngày làm việc</option>
                        <option value="weeks">Tuần</option>
                        <option value="months">Tháng</option>
                        <option value="years">Năm</option>
                    </select>
                </div>
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
          ) : selectedEdgeId ? (
            <div className="p-6">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Link size={16} className="text-purple-600"/>
                    Chi tiết Mũi tên (Kết nối)
                </h4>
                <div className="max-w-md space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nhãn / Điều kiện (Label)</label>
                        <input 
                            value={edges.find(e => e.id === selectedEdgeId)?.label || ''}
                            onChange={(e) => {
                                setEdges(eds => eds.map(edge => edge.id === selectedEdgeId ? { ...edge, label: e.target.value } : edge));
                            }}
                            className="w-full p-2 border border-slate-300 rounded font-medium focus:border-blue-500 focus:outline-none"
                            placeholder="Ví dụ: Nếu có, Nếu không..."
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Điểm bắt đầu</label>
                            <select
                                value={edges.find(e => e.id === selectedEdgeId)?.sourceHandle || 's-bottom'}
                                onChange={(e) => {
                                    setEdges(eds => eds.map(edge => edge.id === selectedEdgeId ? { ...edge, sourceHandle: e.target.value } : edge));
                                }}
                                className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                            >
                                <option value="s-top">Trên (Top)</option>
                                <option value="s-bottom">Dưới (Bottom)</option>
                                <option value="s-left">Trái (Left)</option>
                                <option value="s-right">Phải (Right)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Điểm kết thúc</label>
                            <select
                                value={edges.find(e => e.id === selectedEdgeId)?.targetHandle || 't-top'}
                                onChange={(e) => {
                                    setEdges(eds => eds.map(edge => edge.id === selectedEdgeId ? { ...edge, targetHandle: e.target.value } : edge));
                                }}
                                className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                            >
                                <option value="t-top">Trên (Top)</option>
                                <option value="t-bottom">Dưới (Bottom)</option>
                                <option value="t-left">Trái (Left)</option>
                                <option value="t-right">Phải (Right)</option>
                            </select>
                        </div>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 italic">
                        Nhập văn bản để hiển thị trên mũi tên (thường dùng cho các nhánh rẽ từ Điểm quyết định).
                        <br/>
                        Nhấn phím <strong>Backspace</strong> hoặc <strong>Delete</strong> để xóa mũi tên.
                    </p>
                </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <p>Click vào một hình khối hoặc mũi tên trong lưu đồ để nhập thông tin chi tiết.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
