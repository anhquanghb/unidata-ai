import React from 'react';
import { Plus, Trash2, File, X, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { IsoProcess, GoogleDriveConfig } from '../../types';

interface ISODocModuleProps {
  processData: IsoProcess;
  setProcessData: React.Dispatch<React.SetStateAction<IsoProcess | null>>;
  driveSession: GoogleDriveConfig;
}

export const ISODocModule: React.FC<ISODocModuleProps> = ({
  processData,
  setProcessData,
  driveSession
}) => {

  const handleUploadRecord = async (file: File, recordIndex: number) => {
    if (!driveSession.isConnected || !driveSession.accessToken || !driveSession.zoneCId) {
        alert("Chưa kết nối Google Drive.");
        return;
    }

    try {
        // 1. Ensure Folder
        let folderId = '';
        const folderName = 'ISO_Records';
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

        const uploadResp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + driveSession.accessToken }),
            body: form
        });
        const result = await uploadResp.json();
        
        if (result.id) {
            const newRecs = [...processData.records];
            newRecs[recordIndex].fileId = result.id;
            newRecs[recordIndex].link = result.webViewLink;
            setProcessData({ ...processData, records: newRecs });
            alert("Đã tải lên biểu mẫu thành công!");
        }
    } catch (error) {
        console.error("Upload record error:", error);
        alert("Lỗi khi tải lên biểu mẫu.");
    }
  };

  return (
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
                                <Upload size={14}/> Tải lên file
                            </label>
                        </div>
                    )}
                </div>
              </div>
              <div className="w-1/4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã hiệu</label>
                <input 
                  value={rec.code}
                  onChange={e => {
                    const newRecs = [...processData.records];
                    newRecs[idx].code = e.target.value;
                    setProcessData({...processData, records: newRecs});
                  }}
                  className="w-full p-2 border border-slate-300 rounded text-sm"
                  placeholder="BM.01..."
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
  );
};
