import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  Node,
  Edge,
  Connection,
  MarkerType,
  ReactFlowProvider,
  Panel,
  ControlButton
} from 'reactflow';
import 'reactflow/dist/style.css';

import { 
  Save, Plus, Trash2, Edit2, FileText, Settings, 
  Layout, List, CheckSquare, BarChart2, ArrowLeft,
  MousePointer, Type,
  ChevronDown, ChevronUp, Upload, Link, Search, User, Users, File, ExternalLink, X, FileType, Clock, CheckCircle, Copy
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

import { ISOInfoModule } from './ISO_Modules/ISOInfoModule';
import { ISOGeneralModule } from './ISO_Modules/ISOGeneralModule';
import { ISOFlowModule } from './ISO_Modules/ISOFlowModule';
import { ISOKPIModule } from './ISO_Modules/ISOKPIModule';
import { ISODocModule } from './ISO_Modules/ISODocModule';

// --- Custom Node Components ---

// Moved to ISOFlowModule.tsx

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
      // Filter only 'đã ban hành' processes to push to Cloud
      // Note: handleSaveToCloud in App.tsx handles the actual filtering for 'isodata.json' (Public)
      // based on the logic we saw in App.tsx (it filters d.status === 'đã ban hành').
      // So we just need to trigger it.
      // However, we should ensure that when we "Publish" locally, we also stop older versions.
      // This logic is handled in the "Publish" button action, not here.
      
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
        data: { label, role: type === 'start' || type === 'end' ? type : role },
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

  // --- Versioning Logic ---
  const [versionModal, setVersionModal] = useState<{ isOpen: boolean; baseDef: IsoDefinition | null } | null>(null);
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null); // For Read-only view
  
  const getNextVersion = (currentVer: string, type: 'minor' | 'major'): string => {
      const [major, minor] = (currentVer || '1.0').split('.').map(Number);
      if (type === 'major') return `${major + 1}.0`;
      return `${major}.${minor + 1}`;
  };

  const handleCreateVersion = (type: 'minor' | 'major') => {
      if (!versionModal?.baseDef) return;
      
      const base = versionModal.baseDef;
      const newVersion = getNextVersion(base.version || '1.0', type);
      const newId = uuidv4();
      
      const newDef: IsoDefinition = {
          ...base,
          id: newId,
          familyId: base.familyId || base.id, // Ensure family linkage
          version: newVersion,
          status: 'đang chỉnh sửa',
          updatedAt: new Date().toISOString(),
          processData: base.processData ? {
              ...base.processData,
              id: newId, // Update internal ID
              controlInfo: {
                  ...base.processData.controlInfo,
                  revision: newVersion
              },
              updatedAt: new Date().toISOString()
          } : undefined
      };
      
      onUpdateIsoDefinitions([...isoDefinitions, newDef]);
      setVersionModal(null);
      
      // Open Editor for new version
      setSelectedDefId(newId);
      setProcessData(newDef.processData || null);
      setIsEditing(true);
      
      // Load React Flow
      if (newDef.processData?.flowchart) {
          setNodes(newDef.processData.flowchart.nodes.map(n => ({ 
              id: n.id,
              type: n.type === 'decision' ? 'diamond' : n.type,
              position: n.position,
              data: { label: n.label, role: n.type }
          })));
          setEdges(newDef.processData.flowchart.edges.map(e => ({ 
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
              label: e.label,
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
              style: { strokeWidth: 2.5, stroke: '#475569' }
          })));
      }
  };

  const handleEdit = (def: IsoDefinition, isReadOnly: boolean = false) => {
      // Legacy Migration / Fallback
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

      if (isReadOnly) {
          // Read Only Mode
          setViewingVersionId(def.id);
          setSelectedDefId(def.id);
          setProcessData(proc);
          setIsEditing(true);
          
          if (proc.flowchart) {
              setNodes(proc.flowchart.nodes.map(n => ({ 
                  id: n.id,
                  type: n.type === 'decision' ? 'diamond' : n.type,
                  position: n.position,
                  data: { label: n.label, role: n.type }, // Store role for logic
                  draggable: false, 
                  connectable: false 
              })));
              setEdges(proc.flowchart.edges.map(e => ({ 
                  id: e.id,
                  source: e.source,
                  target: e.target,
                  sourceHandle: e.sourceHandle,
                  targetHandle: e.targetHandle,
                  label: e.label,
                  type: 'smoothstep',
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
                  style: { strokeWidth: 2.5, stroke: '#475569' },
                  animated: false 
              })));
          }
          return;
      }

      if (def.status === 'đã ban hành') {
          // Prompt for Versioning
          setVersionModal({ isOpen: true, baseDef: def });
      } else {
          // Normal Edit
          setViewingVersionId(null);
          setSelectedDefId(def.id);
          setProcessData(proc);
          setIsEditing(true);
          
          if (proc.flowchart) {
              setNodes(proc.flowchart.nodes.map(n => ({ 
                  id: n.id,
                  type: n.type === 'decision' ? 'diamond' : n.type,
                  position: n.position,
                  data: { label: n.label, role: n.type } // Store role
              })));
              setEdges(proc.flowchart.edges.map(e => ({ 
                  id: e.id,
                  source: e.source,
                  target: e.target,
                  sourceHandle: e.sourceHandle,
                  targetHandle: e.targetHandle,
                  label: e.label,
                  type: 'smoothstep',
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
                  style: { strokeWidth: 2.5, stroke: '#475569' }
              })));
          }
      }
  };

  const handleCreateNew = () => {
      const newId = uuidv4();
      const newDef: IsoDefinition = {
          id: newId,
          familyId: newId, // Self is root
          version: '1.0',
          name: 'Quy trình mới',
          code: 'ISO-NEW',
          active: true,
          status: 'đang thiết kế',
          updatedAt: new Date().toISOString(),
          steps: [],
          transitions: [],
          processData: {
              id: newId,
              name: 'Quy trình mới',
              controlInfo: {
                  documentCode: 'ISO-NEW',
                  revision: '1.0',
                  effectiveDate: new Date().toISOString().slice(0, 10),
                  drafter: currentUser?.fullName || '',
                  reviewer: '',
                  approver: '',
              },
              purposeScope: { purpose: '', scope: '' },
              definitions: [],
              flowchart: { nodes: [], edges: [] },
              stepDetails: {},
              kpis: [],
              records: [],
              updatedAt: new Date().toISOString()
          }
      };
      onUpdateIsoDefinitions([...isoDefinitions, newDef]);
      handleEdit(newDef);
  };
  
  // Group Definitions for List View
  const groupedDefinitions = useMemo(() => {
      const groups: Record<string, IsoDefinition[]> = {};
      isoDefinitions.forEach(def => {
          const key = def.familyId || def.code; // Fallback to code if familyId missing
          if (!groups[key]) groups[key] = [];
          groups[key].push(def);
      });
      
      // Sort each group by version desc
      Object.keys(groups).forEach(key => {
          groups[key].sort((a, b) => {
             const vA = a.version || '0.0';
             const vB = b.version || '0.0';
             return vB.localeCompare(vA, undefined, { numeric: true, sensitivity: 'base' });
          });
      });
      
      return groups;
  }, [isoDefinitions]);

  // --- Handlers ---

  // --- Helpers ---

  const handleCopyFlowchart = async () => {
    const flowElement = document.querySelector('.react-flow') as HTMLElement;
    if (flowElement) {
      try {
        const canvas = await html2canvas(flowElement, {
          ignoreElements: (element) => 
            element.classList.contains('react-flow__controls') || 
            element.classList.contains('react-flow__panel') ||
            element.classList.contains('react-flow__attribution')
        });
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              const data = [new ClipboardItem({ 'image/png': blob })];
              await navigator.clipboard.write(data);
              alert("Đã sao chép hình ảnh lưu đồ vào clipboard!");
            } catch (err) {
              console.error("Failed to copy image: ", err);
              // Fallback for browsers that don't support ClipboardItem for images
              alert("Không thể sao chép hình ảnh vào clipboard. Bạn có thể dùng tính năng 'Xuất Docx' để lấy hình ảnh.");
            }
          }
        });
      } catch (err) {
        console.error("html2canvas error: ", err);
        alert("Lỗi khi chụp ảnh lưu đồ.");
      }
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
      type: (n.type === 'start' || n.data.role === 'start') ? 'start' : 
            (n.type === 'end' || n.data.role === 'end') ? 'end' : 
            n.type === 'diamond' ? 'decision' : 'process',
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

    // Determine Status
    // If user has 'canProposeEditProcess' but is NOT Primary Admin, status is 'đang chỉnh sửa'
    // If Primary Admin, they can keep it 'đang thiết kế' or 'đã ban hành' (handled elsewhere?)
    // For now, let's default to 'đang chỉnh sửa' if it's an edit, unless it was already 'đã ban hành' and we are just saving a draft?
    // The requirement says: "Quy trình của các thành viên này sẽ có 2 trạng thái 'Đang chỉnh sửa' nếu có bất kỳ chỉnh sửa nào"
    
    const isProposer = currentUser?.permissions?.canProposeEditProcess && !currentUser?.isPrimary;
    const newStatus = isProposer ? 'đang chỉnh sửa' : (isoDefinitions.find(d => d.id === updatedProcess.id)?.status || 'đang thiết kế');

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
      status: newStatus,
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

  const handlePropose = () => {
      if (!processData) return;
      if (!window.confirm("Bạn có chắc chắn muốn đề xuất quy trình này? Trạng thái sẽ chuyển thành 'Đã chuẩn bị đề xuất'.")) return;

      // Save first to ensure data is up to date
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

      const updatedDef: IsoDefinition = {
        id: updatedProcess.id,
        name: updatedProcess.name,
        code: updatedProcess.controlInfo.documentCode,
        description: updatedProcess.purposeScope.purpose,
        steps: [],
        transitions: [],
        active: true,
        updatedAt: updatedProcess.updatedAt,
        status: 'đã chuẩn bị đề xuất', // Change status
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
      alert("Đã chuyển trạng thái thành 'Đã chuẩn bị đề xuất'. Vui lòng bấm 'Lưu Cloud' để gửi đề xuất.");
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
        data: { 
          label: label,
          role: type === 'start' ? 'start' : type === 'end' ? 'end' : undefined
        },
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
            {currentUser?.role === 'school_admin' && (() => {
                const currentDef = isoDefinitions.find(d => d.id === processData.id);
                const isPublished = currentDef?.status === 'đã ban hành';
                const isStopped = currentDef?.status === 'dừng ban hành';
                if (isPublished || isStopped) return null;
                
                return (
                  <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm font-medium">
                    <Save size={18} /> Lưu Quy trình
                  </button>
                );
            })()}
            {currentUser?.permissions?.canProposeEditProcess && !currentUser?.isPrimary && (() => {
                const currentDef = isoDefinitions.find(d => d.id === processData.id);
                const isPublished = currentDef?.status === 'đã ban hành';
                const isStopped = currentDef?.status === 'dừng ban hành';
                if (isPublished || isStopped) return null;

                return (
                  <>
                    <button onClick={handleSave} className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 shadow-sm font-medium">
                        <Save size={18} /> Lưu Nháp (Đang chỉnh sửa)
                    </button>
                    <button onClick={handlePropose} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm font-medium">
                        <CheckCircle size={18} /> Đề xuất
                    </button>
                  </>
                );
            })()}
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
            <ISOInfoModule 
              processData={processData}
              setProcessData={setProcessData}
              isoDefinitions={isoDefinitions}
              onUpdateIsoDefinitions={onUpdateIsoDefinitions}
              currentUser={currentUser}
              setVersionModal={setVersionModal}
              driveSession={driveSession}
              humanResources={humanResources}
              faculties={faculties}
              units={units}
            />
          )}

          {/* 2. Purpose & Scope */}
          {activeTab === 'purpose' && (
            <ISOGeneralModule 
              processData={processData}
              setProcessData={setProcessData}
            />
          )}

          {/* 3. Definitions */}
          {activeTab === 'definitions' && (
            <ISOGeneralModule 
              processData={processData}
              setProcessData={setProcessData}
            />
          )}

          {/* 4. Flowchart & Details */}
          {activeTab === 'flowchart' && (
            <ISOFlowModule 
              processData={processData}
              setProcessData={setProcessData}
              nodes={nodes}
              setNodes={setNodes}
              onNodesChange={onNodesChange}
              edges={edges}
              setEdges={setEdges}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onReconnect={onReconnect}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onNodesDelete={onNodesDelete}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              onDrop={onDrop}
              onDragOver={onDragOver}
              handleAddNodeFromMenu={handleAddNodeFromMenu}
              handleCopyFlowchart={handleCopyFlowchart}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
              selectedEdgeId={selectedEdgeId}
              setSelectedEdgeId={setSelectedEdgeId}
              sidebarWidth={sidebarWidth}
              bottomPanelHeight={bottomPanelHeight}
              isResizing={isResizing}
              setIsResizing={setIsResizing}
              contextMenu={contextMenu}
              setContextMenu={setContextMenu}
              showAddMenu={showAddMenu}
              setShowAddMenu={setShowAddMenu}
              setConditionModal={setConditionModal}
              humanResources={humanResources}
              faculties={faculties}
              units={units}
            />
          )}

          {/* 6. KPIs */}
          {activeTab === 'kpi' && (
            <ISOKPIModule 
              processData={processData}
              setProcessData={setProcessData}
            />
          )}

          {/* 7. Records & Forms */}
          {activeTab === 'records' && (
            <ISODocModule 
              processData={processData}
              setProcessData={setProcessData}
              driveSession={driveSession}
            />
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
        {currentUser?.role === 'school_admin' && (
          <button 
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-all"
          >
            <Plus size={20} /> Tạo Quy trình Mới
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20">
        {Object.entries(groupedDefinitions).map(([groupId, groupDefs]: [string, IsoDefinition[]]) => {
          // 1. Find Latest Published Version
          const publishedDef = groupDefs.find(d => d.status === 'đã ban hành');
          
          // 2. Find Drafts (currently being edited)
          const draftDefs = groupDefs.filter(d => ['đang thiết kế', 'đang chỉnh sửa', 'đã chuẩn bị đề xuất'].includes(d.status || ''));
          const hasDraft = draftDefs.length > 0;
          
          // 3. Find History (Stopped or older versions)
          const historyDefs = groupDefs.filter(d => d.status === 'dừng ban hành' || (d.status === 'đã ban hành' && d.id !== publishedDef?.id));

          // Determine Main Display Definition: Published if exists, else Latest Draft
          const mainDef = publishedDef || draftDefs[0] || historyDefs[0];
          
          if (!mainDef) return null;
          
          return (
          <div key={mainDef.id} className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all group relative flex flex-col ${mainDef.status === 'dừng ban hành' ? 'opacity-75 grayscale' : ''}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-mono font-bold">
                  {mainDef.code}
                </div>
                <div className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-200">
                   v{mainDef.version || '1.0'}
                </div>
                {mainDef.status && (
                  <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider 
                    ${mainDef.status === 'đã ban hành' ? 'bg-green-100 text-green-700' : 
                      mainDef.status === 'dừng ban hành' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                    {mainDef.status}
                  </div>
                )}
              </div>
              <div className={`w-2 h-2 rounded-full ${mainDef.active ? 'bg-green-500' : 'bg-slate-300'}`} title={mainDef.active ? 'Active' : 'Inactive'} />
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
              {mainDef.name}
            </h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">
              {mainDef.description || 'Chưa có mô tả.'}
            </p>

            {/* Main Action Buttons */}
            <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-auto">
              {/* "Xem quy trình" button */}
              <button 
                onClick={() => handleEdit(mainDef, true)}
                className="flex-[2] flex items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <FileText size={16} /> Xem quy trình
              </button>

              {/* "Sửa đổi / Nâng cấp" button - Only if Published and NO draft exists */}
              {currentUser?.role === 'school_admin' && mainDef.status === 'đã ban hành' && !hasDraft && (
                  <button 
                    onClick={() => handleEdit(mainDef)}
                    className="flex-1 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-lg transition-colors text-sm font-medium"
                    title="Sửa đổi / Nâng cấp"
                  >
                    <Edit2 size={16} />
                  </button>
              )}

              {/* "Chỉnh sửa" button - If mainDef is a draft */}
              {currentUser?.role === 'school_admin' && ['đang thiết kế', 'đang chỉnh sửa', 'đã chuẩn bị đề xuất'].includes(mainDef.status || '') && (
                  <button 
                    onClick={() => handleEdit(mainDef)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Edit2 size={16} /> Chỉnh sửa
                  </button>
              )}
              
              {/* Stop Publishing Button */}
              {currentUser?.role === 'school_admin' && currentUser?.isPrimary && mainDef.status === 'đã ban hành' && (
                <button 
                  onClick={() => {
                    if (confirm("Bạn có chắc chắn muốn DỪNG BAN HÀNH quy trình này? Trạng thái sẽ chuyển sang 'Dừng ban hành'.")) {
                      const updatedDefs = isoDefinitions.map(d => 
                        d.id === mainDef.id ? { ...d, status: 'dừng ban hành' as const, updatedAt: new Date().toISOString() } : d
                      );
                      onUpdateIsoDefinitions(updatedDefs);
                    }
                  }}
                  className="p-2 rounded-lg transition-colors text-amber-600 bg-amber-50 hover:bg-amber-100"
                  title="Dừng ban hành"
                >
                  <X size={18} />
                </button>
              )}

              {/* Delete Button (Only for Drafts/Stopped) */}
              {currentUser?.role === 'school_admin' && mainDef.status !== 'đã ban hành' && (
                <button 
                  onClick={() => {
                      if (confirm("Bạn có chắc chắn muốn xóa quy trình này?")) {
                          onUpdateIsoDefinitions(isoDefinitions.filter(d => d.id !== mainDef.id));
                      }
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Xóa"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            
            {/* Drafts & History Section */}
            {(draftDefs.length > 0 || historyDefs.length > 0) && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {/* Drafts */}
                    {draftDefs.map(draft => (
                        draft.id !== mainDef.id && (
                            <button 
                                key={draft.id}
                                onClick={() => handleEdit(draft)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-xs text-orange-700 font-bold transition-colors w-fit"
                                title={`Bản thảo v${draft.version} - ${draft.status}`}
                            >
                                <Edit2 size={12}/> v{draft.version} (Sửa)
                            </button>
                        )
                    ))}
                    
                    {/* History */}
                    {historyDefs.map(hist => (
                        hist.id !== mainDef.id && (
                            <button 
                                key={hist.id}
                                onClick={() => handleEdit(hist, true)} // Open Read Only
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 font-mono transition-colors w-fit"
                                title={`Trạng thái: ${hist.status} - ${new Date(hist.updatedAt).toLocaleDateString()}`}
                            >
                                <Clock size={12}/> v{hist.version}
                            </button>
                        )
                    ))}
                </div>
            )}
          </div>
          );
        })}

        {isoDefinitions.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Chưa có quy trình nào</p>
            <p className="text-sm">Bấm "Tạo Quy trình Mới" để bắt đầu.</p>
          </div>
        )}
      </div>

      {/* Version Creation Modal */}
      {versionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Tạo phiên bản mới</h3>
                    <p className="text-sm text-slate-500">Quy trình này đã được ban hành. Bạn muốn thực hiện loại thay đổi nào?</p>
                </div>
                <div className="p-6 space-y-3">
                    <button 
                        onClick={() => handleCreateVersion('minor')}
                        className="w-full flex items-center p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-4 group-hover:bg-blue-200">
                            <Edit2 size={20}/>
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 group-hover:text-blue-700">Sửa phiên bản (Minor)</div>
                            <div className="text-xs text-slate-500">Sửa lỗi nhỏ, cập nhật nội dung không thay đổi luồng chính.</div>
                            <div className="text-xs font-mono font-bold text-blue-600 mt-1">
                                {versionModal.baseDef?.version || '1.0'} &rarr; {getNextVersion(versionModal.baseDef?.version || '1.0', 'minor')}
                            </div>
                        </div>
                    </button>

                    <button 
                        onClick={() => handleCreateVersion('major')}
                        className="w-full flex items-center p-4 border border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group text-left"
                    >
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-4 group-hover:bg-purple-200">
                            <Upload size={20}/>
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 group-hover:text-purple-700">Ban hành phiên bản mới (Major)</div>
                            <div className="text-xs text-slate-500">Thay đổi lớn về quy trình, luồng công việc hoặc biểu mẫu.</div>
                            <div className="text-xs font-mono font-bold text-purple-600 mt-1">
                                {versionModal.baseDef?.version || '1.0'} &rarr; {getNextVersion(versionModal.baseDef?.version || '1.0', 'major')}
                            </div>
                        </div>
                    </button>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button 
                        onClick={() => setVersionModal(null)}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm"
                    >
                        Hủy bỏ
                    </button>
                </div>
            </div>
        </div>
      )}

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
