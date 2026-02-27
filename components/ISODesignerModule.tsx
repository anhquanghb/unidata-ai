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

import { 
  Save, Plus, Trash2, Edit2, FileText, Settings, 
  Layout, List, CheckSquare, BarChart2, ArrowLeft,
  MousePointer, Type, Square, Circle, Diamond,
  ChevronDown, ChevronUp, Upload, Link, Search, User, Users, File, ExternalLink, X, FileType, Clock
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { IsoDefinition, IsoProcess, IsoFlowchartNodeData, IsoFlowchartEdgeData, Unit, HumanResourceRecord, Faculty, GoogleDriveConfig } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, WidthType, BorderStyle, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

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
    <div className="px-6 py-3 rounded-[50px] border-2 border-slate-800 bg-white shadow-sm min-w-[120px] text-center relative group">
      <div className="text-sm font-bold text-slate-800">{data.label}</div>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 !bg-slate-800" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 !bg-slate-800" />
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-2 h-2 !bg-slate-800" />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-2 h-2 !bg-slate-800" />
    </div>
  );
};

const ProcessNode = ({ data, isConnectable }: any) => {
  return (
    <div className="px-4 py-3 rounded-md border-2 border-blue-600 bg-white shadow-sm min-w-[150px] text-center relative group">
      <div className="text-sm font-medium text-slate-800">{data.label}</div>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 !bg-blue-600" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 !bg-blue-600" />
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-2 h-2 !bg-blue-600" />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-2 h-2 !bg-blue-600" />
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
  humanResources: HumanResourceRecord[];
  faculties: Faculty[];
  driveSession: GoogleDriveConfig;
}

const ISODesignerModule: React.FC<ISODesignerModuleProps> = ({ isoDefinitions, onUpdateIsoDefinitions, units, humanResources, faculties, driveSession }) => {
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'purpose' | 'definitions' | 'flowchart' | 'kpi' | 'records'>('flowchart');
  
  // Editor State
  const [processData, setProcessData] = useState<IsoProcess | null>(null);
  
  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

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

  // Resizable Panels State
  const [sidebarWidth, setSidebarWidth] = useState(250);
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
      if (!driveSession.isConnected || !driveSession.accessToken || !driveSession.zoneBId) {
          alert("Chưa kết nối Google Drive hoặc không tìm thấy thư mục hệ thống.");
          return;
      }

      try {
          // 1. Ensure ISO Folder
          let isoFolderId = '';
          const q = `mimeType='application/vnd.google-apps.folder' and name='ISO' and '${driveSession.zoneBId}' in parents and trashed=false`;
          const resp = await window.gapi.client.drive.files.list({ q, fields: 'files(id)' });
          if (resp.result.files && resp.result.files.length > 0) {
              isoFolderId = resp.result.files[0].id;
          } else {
              const meta = {
                  name: 'ISO',
                  mimeType: 'application/vnd.google-apps.folder',
                  parents: [driveSession.zoneBId]
              };
              const createResp = await window.gapi.client.drive.files.create({
                  resource: meta,
                  fields: 'id'
              });
              isoFolderId = createResp.result.id;
          }

          // 2. Upload File
          const metadata = {
              name: file.name,
              parents: [isoFolderId]
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
      label: e.label,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed }
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);
    
    setSelectedDefId(def.id);
    setIsEditing(true);
  };

  const handleUploadScan = async (file: File) => {
    if (!driveSession.isConnected || !driveSession.accessToken || !driveSession.zoneBId) {
        alert("Chưa kết nối Google Drive hoặc không tìm thấy thư mục hệ thống.");
        return;
    }

    try {
        // 1. Ensure ISO Folder
        let isoFolderId = '';
        const q = `mimeType='application/vnd.google-apps.folder' and name='ISO' and '${driveSession.zoneBId}' in parents and trashed=false`;
        const resp = await window.gapi.client.drive.files.list({ q, fields: 'files(id)' });
        if (resp.result.files && resp.result.files.length > 0) {
            isoFolderId = resp.result.files[0].id;
        } else {
            const meta = {
                name: 'ISO',
                mimeType: 'application/vnd.google-apps.folder',
                parents: [driveSession.zoneBId]
            };
            const createResp = await window.gapi.client.drive.files.create({
                resource: meta,
                fields: 'id'
            });
            isoFolderId = createResp.result.id;
        }

        // 2. Upload File
        const metadata = {
            name: file.name,
            parents: [isoFolderId]
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
                        new TableCell({ children: [new Paragraph({ text: "Vai trò", bold: true })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ text: "Họ tên", bold: true })], width: { size: 70, type: WidthType.PERCENTAGE } }),
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
                            new TableCell({ children: [new Paragraph({ text: "Thuật ngữ", bold: true })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ text: "Định nghĩa", bold: true })], width: { size: 70, type: WidthType.PERCENTAGE } }),
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
             const imageBuffer = await flowchartImageBlob.arrayBuffer();
             children.push(new Paragraph({
                 children: [
                     new ImageRun({
                         data: imageBuffer,
                         transformation: { width: 600, height: 400 }, // Adjust size as needed
                     }),
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
                            new TableCell({ children: [new Paragraph({ text: "Bước (Task)", bold: true })] }),
                            new TableCell({ children: [new Paragraph({ text: "Ai (Who)", bold: true })] }),
                            new TableCell({ children: [new Paragraph({ text: "Khi nào (When)", bold: true })] }),
                            new TableCell({ children: [new Paragraph({ text: "Cách thức (How)", bold: true })] }),
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
                            new TableCell({ children: [new Paragraph({ text: "Chỉ số", bold: true })] }),
                            new TableCell({ children: [new Paragraph({ text: "Mục tiêu", bold: true })] }),
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
                            new TableCell({ children: [new Paragraph({ text: "Tên hồ sơ", bold: true })] }),
                            new TableCell({ children: [new Paragraph({ text: "Mã số", bold: true })] }),
                            new TableCell({ children: [new Paragraph({ text: "Link", bold: true })] }),
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
              {/* Sidebar Tools */}
              <div 
                style={{ width: sidebarWidth }}
                className="bg-white border-r border-slate-200 p-4 flex flex-col gap-4 z-10 shadow-sm shrink-0"
              >
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
                  onDragStart={(event) => onDragStart(event, 'diamond', 'Điểm quyết định')}
                  draggable
                >
                  <Diamond size={16} className="text-amber-600" />
                  <span className="text-sm">Điểm quyết định</span>
                </div>
                
                <div className="mt-auto text-xs text-slate-400">
                  Kéo thả hình vào vùng vẽ. Click vào hình để sửa chi tiết.
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
                      onNodeClick={onNodeClick}
                      onEdgeClick={onEdgeClick}
                      onNodesDelete={onNodesDelete}
                      nodeTypes={nodeTypes}
                      fitView
                      snapToGrid={true}
                      snapGrid={[15, 15]}
                    >
                      <Background color="#e2e8f0" gap={16} />
                      <Controls />
                      <Panel position="top-right" className="bg-white p-2 rounded shadow text-xs text-slate-500">
                        {nodes.length} Steps | {edges.length} Connections
                      </Panel>
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
                        <div className="max-w-md">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nhãn / Điều kiện (Label)</label>
                            <input 
                                value={edges.find(e => e.id === selectedEdgeId)?.label || ''}
                                onChange={(e) => {
                                    setEdges(eds => eds.map(edge => edge.id === selectedEdgeId ? { ...edge, label: e.target.value } : edge));
                                }}
                                className="w-full p-2 border border-slate-300 rounded font-medium focus:border-blue-500 focus:outline-none"
                                placeholder="Ví dụ: Nếu có, Nếu không..."
                            />
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
