import React from 'react';
import { 
  CheckCircle, X, FileType, Upload, User, Search
} from 'lucide-react';
import { 
  IsoDefinition, IsoProcess, UserProfile, GoogleDriveConfig 
} from '../../types';

interface ISOInfoModuleProps {
  processData: IsoProcess;
  setProcessData: React.Dispatch<React.SetStateAction<IsoProcess | null>>;
  isoDefinitions: IsoDefinition[];
  onUpdateIsoDefinitions: (defs: IsoDefinition[]) => void;
  currentUser?: UserProfile;
  setVersionModal: (val: { isOpen: boolean; baseDef: IsoDefinition | null } | null) => void;
  driveSession: GoogleDriveConfig;
  humanResources: any[]; // Simplified for now, or import HumanResourceRecord
  faculties: any[]; // Simplified for now, or import Faculty
  units: any[];
}

const PersonnelInput = ({ label, value, onChange, humanResources, faculties, units }: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void,
  humanResources: any[],
  faculties: any[],
  units: any[]
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  
  const candidates = React.useMemo(() => {
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
                                  onClick={() => { onChange(c.fullString || ''); setSearchTerm(''); }}
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

export const ISOInfoModule: React.FC<ISOInfoModuleProps> = ({
  processData,
  setProcessData,
  isoDefinitions,
  onUpdateIsoDefinitions,
  currentUser,
  setVersionModal,
  driveSession,
  humanResources,
  faculties,
  units
}) => {

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
        const result = await uploadResp.json();
        
        if (result.id) {
            setProcessData({
                ...processData,
                controlInfo: {
                    ...processData.controlInfo,
                    scanFileId: result.id,
                    scanLink: result.webViewLink,
                    scanMimeType: result.mimeType
                }
            });
            alert("Đã tải lên bản scan thành công!");
        }
    } catch (error) {
        console.error("Upload scan error:", error);
        alert("Lỗi khi tải lên bản scan.");
    }
  };

  const currentDef = isoDefinitions.find(d => d.id === processData.id);
  const currentStatus = currentDef?.status || 'đang thiết kế';

  return (
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
              humanResources={humanResources}
              faculties={faculties}
              units={units}
            />
          </div>
          <div>
            <PersonnelInput 
              label="Người kiểm tra"
              value={processData.controlInfo.reviewer}
              onChange={(val) => setProcessData({...processData, controlInfo: {...processData.controlInfo, reviewer: val}})}
              humanResources={humanResources}
              faculties={faculties}
              units={units}
            />
          </div>
          <div>
            <PersonnelInput 
              label="Người phê duyệt"
              value={processData.controlInfo.approver}
              onChange={(val) => setProcessData({...processData, controlInfo: {...processData.controlInfo, approver: val}})}
              humanResources={humanResources}
              faculties={faculties}
              units={units}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
            {currentUser?.role === 'school_admin' && (
                <div className="flex gap-2 mb-4">
                    {['đang thiết kế', 'đang chỉnh sửa', 'đã chuẩn bị đề xuất'].includes(currentStatus) && (
                        <button
                            onClick={() => {
                                if (confirm("Xác nhận BAN HÀNH quy trình này?")) {
                                    const code = processData.controlInfo.documentCode;
                                    const updatedDefs = isoDefinitions.map(d => {
                                        if (d.id === processData.id) {
                                            return { ...d, status: 'đã ban hành', updatedAt: new Date().toISOString(), processData: processData } as IsoDefinition;
                                        }
                                        if (d.code === code && d.status === 'đã ban hành') {
                                            return { ...d, status: 'dừng ban hành', updatedAt: new Date().toISOString() } as IsoDefinition;
                                        }
                                        return d;
                                    });
                                    onUpdateIsoDefinitions(updatedDefs);
                                    alert("Đã ban hành thành công!");
                                }
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                        >
                            <CheckCircle size={16} /> Ban hành
                        </button>
                    )}

                    {currentStatus === 'đã ban hành' && (
                        <>
                            <button
                                onClick={() => {
                                     setVersionModal({ isOpen: true, baseDef: currentDef! });
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg> Nâng cấp phiên bản
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm("Xác nhận DỪNG BAN HÀNH quy trình này?")) {
                                         const updatedDefs = isoDefinitions.map(d => 
                                            d.id === processData.id ? { ...d, status: 'dừng ban hành', updatedAt: new Date().toISOString() } as IsoDefinition : d
                                         );
                                         onUpdateIsoDefinitions(updatedDefs);
                                    }
                                }}
                                className="bg-amber-600 text-white px-4 py-2 rounded shadow hover:bg-amber-700 flex items-center gap-2 text-sm font-medium"
                            >
                                <X size={16} /> Dừng ban hành
                            </button>
                        </>
                    )}
                </div>
            )}

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
  );
};
