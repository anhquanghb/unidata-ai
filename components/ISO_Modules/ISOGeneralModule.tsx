import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { IsoProcess } from '../../types';

interface ISOGeneralModuleProps {
  processData: IsoProcess;
  setProcessData: React.Dispatch<React.SetStateAction<IsoProcess | null>>;
  activeTab: 'purpose' | 'definitions';
}

export const ISOGeneralModule: React.FC<ISOGeneralModuleProps> = ({
  processData,
  setProcessData,
  activeTab
}) => {
  if (activeTab === 'purpose') {
    return (
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
    );
  }

  return (
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
  );
};
