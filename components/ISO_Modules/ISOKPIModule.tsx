import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { IsoProcess } from '../../types';

interface ISOKPIModuleProps {
  processData: IsoProcess;
  setProcessData: React.Dispatch<React.SetStateAction<IsoProcess | null>>;
}

export const ISOKPIModule: React.FC<ISOKPIModuleProps> = ({
  processData,
  setProcessData
}) => {
  return (
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
  );
};
