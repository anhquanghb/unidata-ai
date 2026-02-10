import React, { useState } from 'react';
import { SystemSettings } from '../../types';

interface AIPromptModuleProps {
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
}

const AIPromptModule: React.FC<AIPromptModuleProps> = ({ settings, onUpdateSettings }) => {
  const [extractionPrompt, setExtractionPrompt] = useState(settings.extractionPrompt);
  const [analysisPrompt, setAnalysisPrompt] = useState(settings.analysisPrompt);

  const handleSavePrompts = () => {
    onUpdateSettings({ ...settings, extractionPrompt, analysisPrompt });
    alert("Đã lưu cấu hình AI Prompts!");
  };

  return (
    <div className="space-y-8">
       <div>
           <div className="flex justify-between items-center mb-4">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">AI Prompts Configuration</h3>
               <button 
                  onClick={handleSavePrompts}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
               >
                   Lưu Thay đổi
               </button>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-2">Prompt Trích xuất Dữ liệu (Extraction)</label>
                   <p className="text-xs text-slate-400 mb-2">Dùng biến <code>{`{{text}}`}</code> để đại diện cho văn bản đầu vào.</p>
                   <textarea 
                       className="w-full h-80 border border-slate-300 rounded-lg p-3 text-xs font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                       value={extractionPrompt}
                       onChange={(e) => setExtractionPrompt(e.target.value)}
                   />
               </div>
               <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-2">Prompt Phân tích & Dự báo (Analysis)</label>
                   <p className="text-xs text-slate-400 mb-2">Dùng biến <code>{`{{data}}`}</code> cho dữ liệu và <code>{`{{query}}`}</code> cho câu hỏi.</p>
                   <textarea 
                       className="w-full h-80 border border-slate-300 rounded-lg p-3 text-xs font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                       value={analysisPrompt}
                       onChange={(e) => setAnalysisPrompt(e.target.value)}
                   />
               </div>
           </div>
       </div>
    </div>
  );
};
export default AIPromptModule;