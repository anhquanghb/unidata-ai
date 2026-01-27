import React, { useState } from 'react';
import { analyzeTrend } from '../services/geminiService';
import { UniversityReport } from '../types';

interface AnalysisModuleProps {
  reports: UniversityReport[];
  customPrompt?: string;
}

const AnalysisModule: React.FC<AnalysisModuleProps> = ({ reports, customPrompt }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalysis = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      const response = await analyzeTrend(reports, query, customPrompt);
      setResult(response);
    } catch (e) {
      setResult("Có lỗi xảy ra khi kết nối với module phân tích.");
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQueries = [
    "Dự báo số lượng bài báo ISI của Viện CNTT năm tới dựa trên xu hướng hiện tại?",
    "Tổng hợp các hướng nghiên cứu mũi nhọn của toàn trường?",
    "So sánh năng suất nghiên cứu giữa các đơn vị?",
    "Tìm các đề tài liên quan đến 'Trí tuệ nhân tạo'?"
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto h-screen flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Phân hệ Phân tích & Xử lý (Analytics)</h2>
        <p className="text-slate-600">Đặt câu hỏi để AI phân tích dữ liệu đa chiều, dự báo xu hướng và tìm kiếm ngữ nghĩa.</p>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Chat History / Result Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
          {!result && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <p>Sẵn sàng phân tích dữ liệu từ {reports.length} báo cáo.</p>
            </div>
          )}
          
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-blue-600 font-medium animate-pulse">UniData AI đang suy nghĩ...</p>
              </div>
            </div>
          )}

          {result && (
            <div className="prose prose-slate max-w-none">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
                <div className="flex items-center space-x-2 mb-4">
                   <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                     </svg>
                   </div>
                   <span className="font-bold text-indigo-900">Kết quả phân tích</span>
                </div>
                <div className="text-slate-800 leading-relaxed whitespace-pre-line">
                  {result}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex space-x-2 mb-3 overflow-x-auto pb-2">
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(q)}
                className="whitespace-nowrap px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              className="flex-1 border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập câu hỏi phân tích của bạn..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalysis()}
            />
            <button
              onClick={handleAnalysis}
              disabled={isLoading || !query.trim()}
              className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                isLoading || !query.trim() 
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Phân tích
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModule;
