import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
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

import { 
  Save, Plus, Trash2, Edit2, FileText, Settings, 
  Layout, List, CheckSquare, BarChart2, ArrowLeft,
  MousePointer, Type, Square, Circle, Diamond,
  ChevronDown, ChevronUp, Upload, Link, Search, User, Users, File, ExternalLink, X, FileType, Clock, CheckCircle
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  IsoDefinition, IsoProcess, IsoFlowchartNodeData, IsoFlowchartEdgeData, Unit, 
  HumanResourceRecord, Faculty, GoogleDriveConfig, UserProfile, SchoolInfo 
} from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, WidthType, BorderStyle, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

// --- Custom Node Components ---

const DiamondNode = ({ data, isConnectable }: any) => {
  const isEnd = data.role === 'end';

  return (
    <div className="relative flex items-center justify-center w-32 h-32 group">
      <div className="absolute inset-0 bg-white border-2 border-slate-400 transform rotate-45 rounded-sm shadow-sm hover:border-blue-500 transition-colors" />
      <div className="relative z-10 text-xs font-medium text-center p-2 pointer-events-none transform">
        {data.label}
      </div>
      {/* Target Handles */}
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
      
      {/* Source Handles - Hide if End Point */}
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

const OvalNode = ({ data, isConnectable }: any) => {
  const isStart = data.role === 'start';
  const isEnd = data.role === 'end';

  return (
    <div className={`px-6 py-3 rounded-[50px] border-2 bg-white shadow-sm min-w-[120px] text-center relative group ${isStart ? 'border-green-600' : isEnd ? 'border-red-600' : 'border-slate-800'}`}>
      <div className={`text-sm font-bold ${isStart ? 'text-green-800' : isEnd ? 'text-red-800' : 'text-slate-800'}`}>{data.label}</div>
      
      {/* Target handles (input) - hide for start node */}
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
      
      {/* Source handles (output) - hide for end node */}
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
      {/* Target Handles */}
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
      
      {/* Source Handles - Hide if End Point */}
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
};

// --- Main Component ---

interface ISODesignerModuleProps {
  isoDefinitions: IsoDefinition[];
  onUpdateIsoDefinitions: (defs: IsoDefinition[]) => void;
  handleSaveToCloud?: (overrideIsoDefinitions?: IsoDefinition[]) => Promise<void>;
  units: Unit[];
  humanResources: HumanResourceRecord[];
  faculties: Faculty[];
  driveSession: GoogleDriveConfig;
  currentUser?: UserProfile;
  schoolInfo: SchoolInfo;
}

const ISODesignerModule: React.FC<ISODesignerModuleProps> = ({ 
  isoDefinitions, 
  onUpdateIsoDefinitions, 
  handleSaveToCloud,
  units, 
  humanResources, 
  faculties, 
  driveSession,
  currentUser,
  schoolInfo
}) => {
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'purpose' | 'definitions' | 'flowchart' | 'kpi' | 'records'>('flowchart');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Sync State
  const [publishedIsoData, setPublishedIsoData] = useState<IsoDefinition[] | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncDiffs, setSyncDiffs] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Editor State
  const [processData, setProcessData] = useState<IsoProcess | null>(null);
  
  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // --- CLOUD STORAGE LOGIC (isodata.json in Zone C) ---
  
  // Load isodata.json on mount
  useEffect(() => {
    const loadAndCompare = async () => {
      // Use schoolInfo.publicDriveId as the source of truth for everyone
      if (!schoolInfo.publicDriveId || !driveSession.isConnected) return;
      
      setIsLoading(true);
      try {
        const fileName = 'isodata.json';
        const q = `name = '${fileName}' and '${schoolInfo.publicDriveId}' in parents and trashed = false`;
        const listResp = await window.gapi.client.drive.files.list({ q, fields: 'files(id)' });
        
        const fileId = listResp.result.files?.[0]?.id;
        if (fileId) {
          const contentResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': `Bearer ${driveSession.accessToken}` }
          });
          if (contentResp.ok) {
            const cloudData = await contentResp.json();
            if (Array.isArray(cloudData)) {
              const isPrimaryAdmin = currentUser?.role === 'school_admin' && currentUser?.isPrimary;
              
              if (isPrimaryAdmin) {
                // Primary Admin Logic: Compare and Sync
                const diffs: string[] = [];
                
                // Check for new/updated in cloud
                cloudData.forEach(cloudDef => {
                  const localDef = isoDefinitions.find(d => d.id === cloudDef.id);
                  if (!localDef) {
                    diffs.push(`Quy trình mới từ Cloud: ${cloudDef.name} (${cloudDef.code})`);
                  } else if (cloudDef.updatedAt !== localDef.updatedAt) {
                    diffs.push(`Cập nhật từ Cloud: ${cloudDef.name} (Cloud: ${new Date(cloudDef.updatedAt).toLocaleString()} vs Local: ${new Date(localDef.updatedAt).toLocaleString()})`);
                  }
                });

                // Check for new in local
                isoDefinitions.forEach(localDef => {
                  const cloudDef = cloudData.find(d => d.id === localDef.id);
                  if (!cloudDef) {
                    diffs.push(`Quy trình mới tại Local: ${localDef.name} (${localDef.code})`);
                  }
                });

                if (diffs.length > 0) {
                  setPublishedIsoData(cloudData);
                  setSyncDiffs(diffs);
                  setShowSyncModal(true);
                }
              } else {
                // Regular Users (Default): ALWAYS load published data from Cloud
                // This ensures they see what the Admin has published
                console.log("Loading published ISO data for regular user.");
                onUpdateIsoDefinitions(cloudData);
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to load ISO data from public drive:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAndCompare();
  }, [schoolInfo.publicDriveId, driveSession.isConnected]);

  const handleUpdateFromCloud = () => {
    if (publishedIsoData) {
      onUpdateIsoDefinitions(publishedIsoData);
      setShowSyncModal(false);
      alert("Đã cập nhật dữ liệu từ phiên bản Ban hành (Cloud).");
    }
  };

  const handlePublishToCloud = async () => {
    if (!handleSaveToCloud) return;
    setIsSyncing(true);
    try {
      // Just trigger the save, App.tsx handles filtering published ones
      await handleSaveToCloud();
      setShowSyncModal(false);
      alert("Đã cập nhật dữ liệu lên Cloud thành công. Chỉ các quy trình ở trạng thái 'Đã ban hành' mới xuất hiện trên phiên bản công khai.");
    } catch (e) {
      console.error(e);
      alert("Lỗi khi ban hành lên Cloud.");
    } finally {
      setIsSyncing(false);
    }
  };

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      setEdges((eds) => {
        const deletedNodeIds = new Set(deleted.map((n) => n.id));
        // React Flow handles removal, but we need to calculate auto-reconnect based on PREVIOUS edges.
        // However, setEdges callback receives current edges (which might still have the deleted ones if onNodesChange hasn't processed yet? 
        // Actually onNodesDelete is called BEFORE nodes are removed from store? No, "gets called when nodes are deleted".
        // But we have access to 'eds' which is the current state.
        
        // We need to find edges connected to the deleted nodes *before* they are removed.
        // Since 'eds' is the current state, it should still contain them if this runs before the edge cleanup effect.
        // React Flow's onNodesChange(remove) triggers edge removal.
        
        // Let's assume 'eds' has the edges.
        const newConnections: Edge[] = [];
        
        deleted.forEach((node) => {
           const connectedEdges = eds.filter(e => e.source === node.id || e.target === node.id);
           const incoming = connectedEdges.filter(e => e.target === node.id);
           const outgoing = connectedEdges.filter(e => e.source === node.id);
           
           if (incoming.length === 1 && outgoing.length === 1) {
               const sourceNode = incoming[0].source;
               const targetNode = outgoing[0].target;
               
               // Create new edge
               const newEdge: Edge = {
                   id: `e${sourceNode}-${targetNode}-${uuidv4()}`,
                   source: sourceNode,
                   target: targetNode,
                   type: 'smoothstep', 
                   markerEnd: { type: MarkerType.ArrowClosed },
                   label: incoming[0].label || outgoing[0].label
               };
               newConnections.push(newEdge);
           }
        });
        
        // Return edges excluding the ones connected to deleted nodes (React Flow does this, but if we return a new array here, we override)
        // Actually, if we use setEdges, we are responsible for the state.
        // So we should remove the old edges and add the new ones.
        const remainingEdges = eds.filter((e) => !deletedNodeIds.has(e.source) && !deletedNodeIds.has(e.target));
        return [...remainingEdges, ...newConnections];
      });
      
      if (deleted.some(n => n.id === selectedNodeId)) {
          setSelectedNodeId(null);
      }
    },
    [setEdges, selectedNodeId]
  );

  const onEdgeClick = useCallback((event, edge) => {
      setSelectedEdgeId(edge.id);
      setSelectedNodeId(null);
  }, []);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sourceNodeId: string; sourceHandle: string | null } | null>(null);

  const onConnectStart = useCallback((_, { nodeId, handleId }) => {
      // Store source info
      // We can't store it in contextMenu yet because we don't know if it will end on pane
      // But we can store it in a ref or temp state if needed. 
      // Actually, React Flow doesn't pass this to onConnectEnd directly.
      // We need a ref.
      (window as any).currentConnectionStart = { nodeId, handleId };
  }, []);

  const onConnectEnd = useCallback(
    (event: any) => {
      const targetIsPane = event.target.classList.contains('react-flow__pane');
      const start = (window as any).currentConnectionStart;

      if (targetIsPane && start) {
        const { nodeId, handleId } = start;
        const x = event.clientX || (event.touches && event.touches[0].clientX);
        const y = event.clientY || (event.touches && event.touches[0].clientY);

        setContextMenu({
          x,
          y,
          sourceNodeId: nodeId,
          sourceHandle: handleId
        });
      }
      (window as any).currentConnectionStart = null;
    },
    []
  );

  const handleAddNodeFromMenu = (type: string, label: string, role?: string) => {
      if (!contextMenu) return;

      const { x, y, sourceNodeId, sourceHandle } = contextMenu;
      
      // We need to project these x,y (which are pixel offsets) to React Flow internal coordinates (zoom/pan)
      // Since we don't have easy access to project() without useReactFlow hook inside a child component,
      // we can try to approximate or use the raw values if zoom is 1.
      // Better: Wrap the content in ReactFlowProvider and use useReactFlow in a sub-component?
      // Or just use the raw values and let the user move it. 
      // Let's try to adjust for basic pan/zoom if possible, but for now raw is okay as a start.
      // Wait, we are inside ReactFlowProvider in the render, but this component IS the parent.
      // We can't use useReactFlow here.
      // We will just place it at the click position. 
      // Note: If the user has panned, this might be off. 
      // A robust solution requires a child component to handle the interaction or moving this logic.
      // For this iteration, let's place it at the mouse position relative to the pane.
      
      // Actually, we can get the transform from the viewport if we track it, but let's keep it simple.
      // We will use a helper to get the viewport state if we can, or just accept the offset.
      
      // Let's assume the user hasn't panned too far or we just place it where they clicked.
      // React Flow nodes position is absolute in the world.
      // We need to convert screen pixels -> world coordinates.
      // Without `project`, it's hard. 
      // Let's try to use the `reactFlowInstance` if we can get a ref to it.
      // But we don't have it. 
      
      // Workaround: We will place it at the visual position.
      // If the user zooms, it might be weird.
      
      const newNodeId = uuidv4();
      const newNode: Node = {
        id: newNodeId,
        type,
        position: { x: x - 50, y: y - 20 }, // Center somewhat
        data: { label, role },
      };

      setNodes((nds) => nds.concat(newNode));
      
      // Create Edge
      const newEdge: Edge = {
          id: `e${sourceNodeId}-${newNodeId}-${uuidv4()}`,
          source: sourceNodeId,
          sourceHandle: sourceHandle,
          target: newNodeId,
          targetHandle: type === 'diamond' ? 't-top' : 't-left', // Default target handle
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
      };
      setEdges((eds) => addEdge(newEdge, eds));

      // Initialize Detail
      if (processData) {
          setProcessData(prev => prev ? ({
              ...prev,
              stepDetails: {
                  ...prev.stepDetails,
                  [newNodeId]: { nodeId: newNodeId, who: '', what: label, when: '', how: '' }
              }
          }) : null);
      }
      
      setSelectedNodeId(newNodeId);
      setContextMenu(null);
  };

  // Close context menu on click elsewhere
  useEffect(() => {
      const handleClick = () => setContextMenu(null);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
  }, []);

  const [showAddMenu, setShowAddMenu] = useState(false);
  
  // Close add menu on click elsewhere
  useEffect(() => {
      const handleClick = (e: MouseEvent) => {
          if (showAddMenu && !(e.target as Element).closest('.add-step-menu-container')) {
              setShowAddMenu(false);
          }
      };
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
  }, [showAddMenu]);

  // Resizable Panels State
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [conditionModal, setConditionModal] = useState<{ isOpen: boolean; nodeId: string; condition: string; targetId: string } | null>(null);

  const [bottomPanelHeight, setBottomPanelHeight] = useState(300);
  const [isResizing, setIsResizing] = useState<'sidebar' | 'bottom' | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      if (isResizing === 'sidebar') {
        // Limit sidebar width between 150px and 500px
        // We need to account for the fact that the sidebar is on the left
        // The mouse position X is the new width relative to the left edge of the container
        // Assuming the container starts at 0 (or close to it), e.clientX is a good approximation
        // However, since this component might be nested, using movementX is safer if we track the start
        // But movementX is simple enough for relative changes
        setSidebarWidth(prev => Math.max(150, Math.min(500, prev + e.movementX)));
      } else if (isResizing === 'bottom') {
        // Limit bottom panel height between 100px and 600px
        // Moving mouse UP (negative movementY) should INCREASE height
        setBottomPanelHeight(prev => Math.max(100, Math.min(600, prev - e.movementY)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.body.style.cursor = 'default';
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizing === 'sidebar' ? 'col-resize' : 'row-resize';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isResizing]);

  // --- Handlers ---

  // --- Helpers ---

  const handleUploadRecord = async (file: File, recordIndex: number) => {
      if (!driveSession.isConnected || !driveSession.accessToken || !driveSession.zoneCId) {
          alert("Chưa kết nối Google Drive hoặc không tìm thấy thư mục công khai.");
          return;
      }

      try {
          // 1. Ensure Folder
          let folderId = '';
          const folderName = 'ISO';
          const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${driveSession.zoneCId}' in parents and trashed=false`;
          const resp = await window.gapi.client.drive.files.list({ q, fields: 'files(id)' });
          if (resp.result.files && resp.result.files.length > 0) {
              folderId = resp.result.files[0].id;
          } else {
              const meta = {
                  name: folderName,
                  mimeType: 'application/vnd.google-apps.folder',
                  parents: [driveSession.zoneCId]
              };
              const createResp = await window.gapi.client.drive.files.create({
                  resource: meta,
                  fields: 'id'
              });
              folderId = createResp.result.id;
          }

          // 2. Upload File
          const metadata = {
              name: file.name,
              parents: [folderId]
          };
          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', file);

          const uploadResp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,mimeType', {
              method: 'POST',
              headers: new Headers({ 'Authorization': 'Bearer ' + driveSession.accessToken }),
              body: form
          });
          
          if (!uploadResp.ok) throw new Error("Upload failed");
          const fileData = await uploadResp.json();

          // 3. Update Record
          const newRecs = [...processData!.records];
          newRecs[recordIndex] = {
              ...newRecs[recordIndex],
              fileId: fileData.id,
              link: fileData.webViewLink,
              mimeType: fileData.mimeType,
              name: newRecs[recordIndex].name || file.name
          };
          setProcessData({...processData!, records: newRecs});
          alert("Upload thành công!");

      } catch (e) {
          console.error(e);
          alert("Lỗi upload file: " + e);
      }
  };

  const PersonnelInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
      const [searchTerm, setSearchTerm] = useState('');
      const [isSearching, setIsSearching] = useState(false);
      
      const candidates = useMemo(() => {
          if (!searchTerm) return [];
          const lower = searchTerm.toLowerCase();
          return humanResources
            .filter(hr => {
                const f = faculties.find(fac => fac.id === hr.facultyId);
                return f && (f.name.vi.toLowerCase().includes(lower) || f.email?.toLowerCase().includes(lower));
            })
            .map(hr => {
                const f = faculties.find(fac => fac.id === hr.facultyId);
                const u = units.find(un => un.unit_id === hr.unitId);
                return {
                    name: f?.name.vi,
                    email: f?.email,
                    role: hr.role,
                    unit: u?.unit_name,
                    fullString: `${f?.name.vi} - ${hr.role} (${u?.unit_name})`
                };
            })
            .slice(0, 5);
      }, [searchTerm, humanResources, faculties, units]);

      return (
          <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              {value ? (
                  <div className="flex items-center justify-between p-2 border border-blue-200 bg-blue-50 rounded text-sm text-blue-800">
                      <span className="font-medium">{value}</span>
                      <button onClick={() => onChange('')} className="text-blue-400 hover:text-blue-600"><X size={14}/></button>
                  </div>
              ) : (
                  <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search size={14} className="text-slate-400" />
                      </div>
                      <input 
                          className="w-full pl-9 p-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-sm"
                          placeholder="Tìm kiếm nhân sự..."
                          value={searchTerm}
                          onChange={e => { setSearchTerm(e.target.value); setIsSearching(true); }}
                          onFocus={() => setIsSearching(true)}
                          onBlur={() => setTimeout(() => setIsSearching(false), 200)}
                      />
                      {isSearching && searchTerm && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {candidates.map((c, i) => (
                                  <div 
                                      key={i} 
                                      className="p-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                                      onClick={() => { onChange(c.fullString); setSearchTerm(''); }}
                                  >
                                      <div className="font-bold text-slate-700">{c.name}</div>
                                      <div className="text-xs text-slate-500">{c.role} - {c.unit}</div>
                                  </div>
                              ))}
                              {candidates.length === 0 && <div className="p-2 text-xs text-slate-400">Không tìm thấy.</div>}
                          </div>
                      )}
                  </div>
              )}
          </div>
      );
  };

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
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label: e.label,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
      style: { strokeWidth: 2.5, stroke: '#475569' }
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);
    
    setSelectedDefId(def.id);
    setIsEditing(true);
  };

  const handleUploadScan = async (file: File) => {
    if (!driveSession.isConnected || !driveSession.accessToken || !driveSession.zoneCId) {
        alert("Chưa kết nối Google Drive hoặc không tìm thấy thư mục công khai.");
        return;
    }

    try {
        // 1. Ensure Folder
        let folderId = '';
        const folderName = 'ISO';
        const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${driveSession.zoneCId}' in parents and trashed=false`;
        const resp = await window.gapi.client.drive.files.list({ q, fields: 'files(id)' });
        if (resp.result.files && resp.result.files.length > 0) {
            folderId = resp.result.files[0].id;
        } else {
            const meta = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [driveSession.zoneCId]
            };
            const createResp = await window.gapi.client.drive.files.create({
                resource: meta,
                fields: 'id'
            });
            folderId = createResp.result.id;
        }

        // 2. Upload File
        const metadata = {
            name: file.name,
            parents: [folderId]
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const uploadResp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,mimeType', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + driveSession.accessToken }),
            body: form
        });
        
        if (!uploadResp.ok) throw new Error("Upload failed");
        const fileData = await uploadResp.json();

        // 3. Update Control Info
        setProcessData({
            ...processData!,
            controlInfo: {
                ...processData!.controlInfo,
                scanFileId: fileData.id,
                scanLink: fileData.webViewLink,
                scanMimeType: fileData.mimeType
            }
        });
        alert("Upload bản scan thành công!");

    } catch (e) {
        console.error(e);
        alert("Lỗi upload file: " + e);
    }
  };

  const handleExportDocx = async () => {
    if (!processData) return;

    try {
        // 1. Capture Flowchart Image
        let flowchartImageBlob: Blob | null = null;
        const flowElement = document.querySelector('.react-flow') as HTMLElement;
        if (flowElement) {
             // Temporarily hide controls/panels if needed, or just capture
             const canvas = await html2canvas(flowElement, {
                 ignoreElements: (element) => element.classList.contains('react-flow__controls') || element.classList.contains('react-flow__panel')
             });
             flowchartImageBlob = await new Promise(resolve => canvas.toBlob(resolve));
        }

        // 2. Build Document Sections
        const children: any[] = [];

        // Header
        children.push(
            new Paragraph({
                text: processData.name,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({ text: `Mã số: ${processData.controlInfo.documentCode} | Phiên bản: ${processData.controlInfo.revision}`, size: 24 }),
                ],
                spacing: { after: 100 }
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({ text: `Ngày hiệu lực: ${new Date(processData.controlInfo.effectiveDate).toLocaleDateString('vi-VN')}`, size: 24 }),
                ],
                spacing: { after: 400 }
            })
        );

        // Control Info Table
        const controlTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Vai trò", bold: true })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Họ tên", bold: true })] })], width: { size: 70, type: WidthType.PERCENTAGE } }),
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph("Soạn thảo")] }),
                        new TableCell({ children: [new Paragraph(processData.controlInfo.drafter)] }),
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph("Kiểm tra")] }),
                        new TableCell({ children: [new Paragraph(processData.controlInfo.reviewer)] }),
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph("Phê duyệt")] }),
                        new TableCell({ children: [new Paragraph(processData.controlInfo.approver)] }),
                    ]
                }),
            ]
        });
        children.push(controlTable);
        children.push(new Paragraph({ text: "", spacing: { after: 400 } }));

        // Purpose & Scope
        children.push(
            new Paragraph({ text: "1. Mục đích & Phạm vi", heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: "Mục đích: ", bold: true }), new TextRun(processData.purposeScope.purpose)], spacing: { after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: "Phạm vi: ", bold: true }), new TextRun(processData.purposeScope.scope)], spacing: { after: 400 } })
        );

        // Definitions
        if (processData.definitions.length > 0) {
            children.push(new Paragraph({ text: "2. Thuật ngữ & Định nghĩa", heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }));
            const defRows = processData.definitions.map(d => new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(d.term)] }),
                    new TableCell({ children: [new Paragraph(d.definition)] }),
                ]
            }));
            children.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Thuật ngữ", bold: true })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Định nghĩa", bold: true })] })], width: { size: 70, type: WidthType.PERCENTAGE } }),
                        ]
                    }),
                    ...defRows
                ]
            }));
            children.push(new Paragraph({ text: "", spacing: { after: 400 } }));
        }

        // Flowchart Image
        if (flowchartImageBlob) {
             children.push(new Paragraph({ text: "3. Lưu đồ", heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }));
             const imageBuffer = new Uint8Array(await flowchartImageBlob.arrayBuffer());
             children.push(new Paragraph({
                 children: [
                     new ImageRun({
                         data: imageBuffer,
                         transformation: { width: 600, height: 400 }, // Adjust size as needed
                     } as any),
                 ],
                 alignment: AlignmentType.CENTER,
                 spacing: { after: 400 }
             }));
        }

        // Steps (5W1H)
        if (nodes.length > 0) {
            children.push(new Paragraph({ text: "4. Nội dung chi tiết (5W1H)", heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }));
            
            const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
            const stepRows = sortedNodes.map(node => {
                const detail = processData.stepDetails[node.id] || {};
                return new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(node.data.label)] }),
                        new TableCell({ children: [new Paragraph(detail.who || '')] }),
                        new TableCell({ children: [new Paragraph(detail.when || '')] }),
                        new TableCell({ children: [new Paragraph(detail.how || '')] }),
                    ]
                });
            });

            children.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Bước (Task)", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ai (Who)", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Khi nào (When)", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Cách thức (How)", bold: true })] })] }),
                        ]
                    }),
                    ...stepRows
                ]
            }));
            children.push(new Paragraph({ text: "", spacing: { after: 400 } }));
        }

        // KPIs
        if (processData.kpis.length > 0) {
            children.push(new Paragraph({ text: "5. Chỉ số đo lường (KPIs)", heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }));
            const kpiRows = processData.kpis.map(k => new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(k.indicator)] }),
                    new TableCell({ children: [new Paragraph(k.target)] }),
                ]
            }));
            children.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Chỉ số", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mục tiêu", bold: true })] })] }),
                        ]
                    }),
                    ...kpiRows
                ]
            }));
            children.push(new Paragraph({ text: "", spacing: { after: 400 } }));
        }

        // Records
        if (processData.records.length > 0) {
            children.push(new Paragraph({ text: "6. Hồ sơ & Biểu mẫu", heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }));
            const recRows = processData.records.map(r => new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(r.name)] }),
                    new TableCell({ children: [new Paragraph(r.code)] }),
                    new TableCell({ children: [new Paragraph(r.link || '')] }),
                ]
            }));
            children.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tên hồ sơ", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mã số", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Link", bold: true })] })] }),
                        ]
                    }),
                    ...recRows
                ]
            }));
        }

        // Generate Docx
        const doc = new Document({
            sections: [{
                properties: {},
                children: children
            }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${processData.controlInfo.documentCode}_${processData.name}.docx`);

    } catch (e) {
        console.error("Export Docx Error:", e);
        alert("Lỗi xuất file Docx: " + e);
    }
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
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
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
      status: 'đang thiết kế',
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

  const onConnect = useCallback((params: Connection) => {
    if (params.source === params.target) return;
    setEdges((eds) => addEdge({ 
      ...params, 
      type: 'smoothstep', 
      style: { strokeWidth: 2.5, stroke: '#475569' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' } 
    }, eds));
  }, [setEdges]);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
    [setEdges]
  );

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
      setSelectedEdgeId(null);
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
            <button onClick={handleExportDocx} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 shadow-sm font-medium text-sm">
                <FileText size={16} /> Xuất Docx
            </button>
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
                    <PersonnelInput 
                      label="Người soạn thảo"
                      value={processData.controlInfo.drafter}
                      onChange={(val) => setProcessData({...processData, controlInfo: {...processData.controlInfo, drafter: val}})}
                    />
                  </div>
                  <div>
                    <PersonnelInput 
                      label="Người kiểm tra"
                      value={processData.controlInfo.reviewer}
                      onChange={(val) => setProcessData({...processData, controlInfo: {...processData.controlInfo, reviewer: val}})}
                    />
                  </div>
                  <div>
                    <PersonnelInput 
                      label="Người phê duyệt"
                      value={processData.controlInfo.approver}
                      onChange={(val) => setProcessData({...processData, controlInfo: {...processData.controlInfo, approver: val}})}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Bản scan đã ban hành (PDF)</label>
                    {processData.controlInfo.scanLink ? (
                        <div className="flex items-center gap-2 bg-slate-50 p-3 rounded border border-slate-200">
                            <FileType size={20} className="text-red-500"/>
                            <a href={processData.controlInfo.scanLink} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex-1">
                                Xem bản scan
                            </a>
                            <button 
                                onClick={() => setProcessData({
                                    ...processData, 
                                    controlInfo: {
                                        ...processData.controlInfo,
                                        scanFileId: undefined,
                                        scanLink: undefined,
                                        scanMimeType: undefined
                                    }
                                })}
                                className="text-slate-400 hover:text-red-500"
                            >
                                <X size={16}/>
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <input 
                                type="file" 
                                id="scan-upload"
                                accept="application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleUploadScan(e.target.files[0]);
                                    }
                                }}
                            />
                            <label 
                                htmlFor="scan-upload"
                                className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors text-slate-500"
                            >
                                <Upload size={20}/>
                                <span className="text-sm font-medium">Tải lên bản scan (PDF)</span>
                            </label>
                        </div>
                    )}
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
                                            type: 'oval',
                                            position: { x: 50, y: 50 },
                                            data: { label: 'Start', role: 'start' },
                                        };
                                        setNodes(nds => nds.concat(newNode));
                                        // Init details
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
                                        type: 'oval',
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
                    {nodes.map((node, index) => {
                        const outgoingEdges = edges.filter(e => e.source === node.id);
                        const incomingEdges = edges.filter(e => e.target === node.id);
                        const isStartNode = node.data.role === 'start' || node.type === 'start' || (node.type === 'oval' && (node.data.label?.toLowerCase().includes('start') || node.data.label?.toLowerCase().includes('bắt đầu')));
                        const isEndNode = node.data.role === 'end' || node.type === 'end' || (node.type === 'oval' && (node.data.label?.toLowerCase().includes('end') || node.data.label?.toLowerCase().includes('kết thúc')));
                        
                        // Validation Logic
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
                                    {node.type === 'oval' ? <Circle size={14} /> : node.type === 'diamond' ? <Diamond size={14} /> : <Square size={14} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-bold truncate ${error ? 'text-red-700' : 'text-slate-700'}`}>{node.data.label}</div>
                                </div>
                                {selectedNodeId === node.id && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Trigger delete
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
                                    
                                    {/* Config Next Steps */}
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
                                        // Standard Node (1 outgoing max)
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
                                                        // Remove edge if exists
                                                        if (outgoingEdges.length > 0) {
                                                            setEdges(eds => eds.filter(ed => ed.id !== outgoingEdges[0].id));
                                                        }
                                                    } else {
                                                        // Update or Create
                                                        if (outgoingEdges.length > 0) {
                                                            // Update existing edge target? React Flow edges are immutable-ish, better replace.
                                                            setEdges(eds => eds.map(ed => ed.id === outgoingEdges[0].id ? { ...ed, target: targetId } : ed));
                                                        } else {
                                                            const newEdge: Edge = {
                                                                id: `e${node.id}-${targetId}-${uuidv4()}`,
                                                                source: node.id,
                                                                target: targetId,
                                                                type: 'smoothstep',
                                                                markerEnd: { type: MarkerType.ArrowClosed },
                                                            };
                                                            setEdges(eds => addEdge(newEdge, eds));
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
                      <Controls />
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
                              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
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
                                  onClick={() => handleAddNodeFromMenu('oval', 'Kết thúc', 'end')}
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
                          {/* Level 1: Unit Type */}
                          <select
                            className="w-full p-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                            value={processData.stepDetails[selectedNodeId].whoConfig?.unitType || ''}
                            onChange={(e) => {
                                const newType = e.target.value as any;
                                setProcessData(prev => {
                                    if (!prev) return null;
                                    const currentDetail = prev.stepDetails[selectedNodeId];
                                    
                                    // Auto-select unit if external
                                    let newUnitId = undefined;
                                    if (newType === 'external') {
                                        const extUnit = units.find(u => u.unit_type === 'external');
                                        if (extUnit) newUnitId = extUnit.unit_id;
                                    }

                                    const newConfig = { ...currentDetail.whoConfig, unitType: newType, unitId: newUnitId, personId: undefined };
                                    
                                    // Generate display string
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

                          {/* Level 2: Specific Unit */}
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
                                    
                                    // Generate display string
                                    let displayString = currentDetail.who;
                                    const unit = units.find(u => u.unit_id === newUnitId);
                                    if (unit) {
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
                            <option value="">-- Chọn Đơn vị cụ thể (Nếu cần) --</option>
                            {units
                                .filter(u => u.unit_type === processData.stepDetails[selectedNodeId].whoConfig?.unitType)
                                .map(u => (
                                    <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                                ))
                            }
                          </select>

                          {/* Level 3: Specific Person */}
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
                                    
                                    // Generate display string
                                    let displayString = currentDetail.who;
                                    const person = humanResources.find(p => p.id === newPersonId);
                                    const unit = units.find(u => u.unit_id === currentDetail.whoConfig?.unitId);
                                    
                                    if (person) {
                                        if (currentDetail.whoConfig?.unitType === 'external') {
                                            displayString = person.customPositionName || 'Đối tượng ngoài';
                                        } else {
                                            // Try to find name from Faculty profile if linked
                                            let personName = person.id; // Fallback
                                            const facultyProfile = faculties.find(f => f.id === person.facultyId);
                                            if (facultyProfile) personName = facultyProfile.name.vi;
                                            
                                            displayString = `${personName} (${unit?.unit_name})`;
                                        }
                                    } else if (unit) {
                                        displayString = unit.unit_name; // Revert to unit name if person deselected
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

                          {/* Manual Override Input */}
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
                                    
                                    // Generate display string
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
                                        
                                        // Generate display string
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
                        
                        {/* File Upload Area */}
                        <div className="mt-2 flex items-center gap-2">
                            {rec.link ? (
                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-green-200 text-green-700 text-sm">
                                    <File size={14}/>
                                    <a href={rec.link} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-[200px]">
                                        {rec.name || 'File đính kèm'}
                                    </a>
                                    <button 
                                        onClick={() => {
                                            const newRecs = [...processData.records];
                                            newRecs[idx].link = undefined;
                                            newRecs[idx].fileId = undefined;
                                            setProcessData({...processData, records: newRecs});
                                        }}
                                        className="text-slate-400 hover:text-red-500 ml-2"
                                        title="Gỡ file"
                                    >
                                        <X size={12}/>
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        id={`file-upload-${rec.id}`}
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleUploadRecord(e.target.files[0], idx);
                                            }
                                        }}
                                    />
                                    <label 
                                        htmlFor={`file-upload-${rec.id}`}
                                        className="flex items-center gap-1 cursor-pointer bg-white px-3 py-1.5 rounded border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                    >
                                        <Upload size={14}/> Upload File
                                    </label>
                                </div>
                            )}
                        </div>
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
          <h2 className="text-2xl font-bold text-slate-800">Quy trình công việc</h2>
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
              <div className="flex items-center gap-2">
                <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-mono font-bold">
                  {def.code}
                </div>
                {def.status && (
                  <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${def.status === 'đã ban hành' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {def.status}
                  </div>
                )}
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
              
              {currentUser?.role === 'school_admin' && currentUser?.isPrimary && (
                <button 
                  onClick={() => {
                    const newStatus = def.status === 'đã ban hành' ? 'đang thiết kế' : 'đã ban hành';
                    const confirmMsg = newStatus === 'đã ban hành' 
                      ? "Bạn có chắc chắn muốn BAN HÀNH quy trình này lên Cloud?" 
                      : "Bạn có chắc chắn muốn GỠ BAN HÀNH quy trình này?";
                    
                    if (confirm(confirmMsg)) {
                      const updatedDefs = isoDefinitions.map(d => 
                        d.id === def.id ? { ...d, status: newStatus, updatedAt: new Date().toISOString() } : d
                      );
                      onUpdateIsoDefinitions(updatedDefs);
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    def.status === 'đã ban hành' 
                      ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                      : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                  }`}
                  title={def.status === 'đã ban hành' ? 'Gỡ ban hành' : 'Ban hành'}
                >
                  <CheckCircle size={18} />
                </button>
              )}

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

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-amber-50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Phát hiện sự khác biệt dữ liệu</h3>
                <p className="text-slate-600">Dữ liệu Quy trình công việc hiện tại khác với phiên bản đã Ban hành trên Cloud.</p>
              </div>
            </div>
            
            <div className="p-6 max-h-[400px] overflow-y-auto">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Chi tiết khác biệt:</h4>
              <ul className="space-y-2">
                {syncDiffs.map((diff, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    {diff}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleUpdateFromCloud}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl hover:bg-slate-100 transition-all font-medium disabled:opacity-50"
              >
                <Upload size={20} className="rotate-180" /> Cập nhật phiên bản từ Cloud
              </button>
              <button
                onClick={handlePublishToCloud}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all font-medium disabled:opacity-50"
              >
                {isSyncing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Upload size={20} />
                )}
                Ban hành phiên bản mới lên Cloud
              </button>
            </div>
            
            <div className="px-6 pb-6 bg-slate-50 flex justify-center">
              <button 
                onClick={() => setShowSyncModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Để sau (Tiếp tục với dữ liệu hiện tại)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ISODesignerModule;
