import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface ColumnDef {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface JsonIngestionHandlerProps {
  title: string;
  exampleJson: string;
  columns: ColumnDef[];
  onImport: (data: any[]) => void;
  isLocked: boolean;
  academicYear: string;
  virtualAssistantUrl?: string;
}

const JsonIngestionHandler: React.FC<JsonIngestionHandlerProps> = ({
  title,
  exampleJson,
  columns,
  onImport,
  isLocked,
  academicYear,
  virtualAssistantUrl
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = () => {
    try {
      if (!jsonInput.trim()) {
        setError("Vui lòng dán nội dung JSON vào ô trống.");
        return;
      }
      const data = JSON.parse(jsonInput);
      
      let arrayData = [];
      if (Array.isArray(data)) {
        arrayData = data;
      } else if (typeof data === 'object' && data !== null) {
        // Handle case where single object is pasted, or wrapped in a root key
        const keys = Object.keys(data);
        // Heuristic: check if any value is an array
        const arrayValue = keys.find(k => Array.isArray(data[k]));
        if (arrayValue) {
             arrayData = data[arrayValue];
        } else {
             arrayData = [data];
        }
      } else {
          throw new Error("Định dạng dữ liệu không hợp lệ. Cần một Array JSON.");
      }

      // Pre-process data: Assign IDs if missing and inject current Academic Year
      const processedData = arrayData.map((item: any) => ({
        ...item,
        id: item.id || uuidv4(),
        academicYear: academicYear
      }));

      setParsedData(processedData);
      setError(null);
    } catch (err: any) {
      setError("Lỗi cú pháp JSON: " + err.message);
      setParsedData(null);
    }
  };

  const handleImport = () => {
    if (parsedData && parsedData.length > 0) {
      if (window.confirm(`Xác nhận nhập ${parsedData.length} bản ghi vào hệ thống?`)) {
        onImport(parsedData);
        setJsonInput('');
        setParsedData(null);
        alert("Nhập dữ liệu thành công!");
      }
    }
  };

  const handleDeletePreviewRow = (idx: number) => {
    if (parsedData) {
        const newData = [...parsedData];
        newData.splice(idx, 1);
        setParsedData(newData);
    }
  };

  const handleCopyPrompt = () => {
    const fieldDefs = columns.map(c => `- ${c.key}: ${c.label}`).join('\n');
    const prompt = `Bạn đóng vai trò là công cụ tạo dữ liệu giả lập cho hệ thống ${title}.
Hãy tạo dữ liệu JSON (định dạng Array) dựa trên cấu trúc sau:

Các trường dữ liệu yêu cầu:
${fieldDefs}

Mẫu JSON chuẩn (chỉ trả về JSON, không thêm text):
[
  ${exampleJson}
]

Yêu cầu:
1. Trả về đúng định dạng JSON Array.
2. Tạo khoảng 5-10 bản ghi mẫu có nghĩa, tiếng Việt.
3. Không thêm text giải thích, chỉ trả về JSON.`;

    navigator.clipboard.writeText(prompt).then(() => {
        alert("Đã sao chép Prompt dữ liệu mẫu vào bộ nhớ đệm! Hãy dán vào Trợ lý ảo.");
    });
  };

  const handleOpenAssistant = () => {
      if (virtualAssistantUrl) {
          window.open(virtualAssistantUrl, '_blank');
      } else {
          alert("Chưa cấu hình đường dẫn Trợ lý ảo trong phần Cài đặt.");
      }
  };

  return (
    <div className="space-y-6 animate-fade-in-down">
      <div className="flex justify-between items-start">
        <div>
           <h3 className="text-lg font-bold text-slate-800">{title}</h3>
           <p className="text-sm text-slate-500">Sử dụng Gemini/AI để tạo dữ liệu JSON, sau đó dán vào đây để nhập liệu.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
            <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded border border-slate-200">
                Năm học: {academicYear}
            </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex w-8 h-8 bg-blue-100 text-blue-600 rounded-full items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
            </span>
            <p className="text-sm text-blue-800 font-medium">Bạn chưa có dữ liệu? Hãy nhờ Trợ lý ảo tạo giúp.</p>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={handleCopyPrompt}
                className="flex items-center px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded hover:bg-blue-50 text-xs font-bold shadow-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                1. Sao chép mẫu
            </button>
            <button 
                onClick={handleOpenAssistant}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-bold shadow-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                2. Mở Trợ lý ảo
            </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Area */}
        <div className="flex flex-col h-full">
           <label className="text-xs font-semibold text-slate-700 mb-2 uppercase">3. Dán JSON kết quả vào đây</label>
           <textarea
             className="flex-1 min-h-[300px] p-4 font-mono text-xs bg-slate-800 text-green-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
             placeholder={`[\n  ${exampleJson}\n  ...\n]`}
             value={jsonInput}
             onChange={(e) => setJsonInput(e.target.value)}
             disabled={isLocked}
           />
           {error && (
             <div className="mt-2 p-2 bg-red-100 text-red-700 text-xs rounded border border-red-200">
               {error}
             </div>
           )}
           <div className="mt-4 flex gap-2">
             <button
               onClick={handleParse}
               disabled={isLocked || !jsonInput}
               className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
             >
               Kiểm tra Dữ liệu &rarr;
             </button>
           </div>
        </div>

        {/* Right: Preview Area */}
        <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700 uppercase">4. Xem trước ({parsedData ? parsedData.length : 0} bản ghi)</label>
              {parsedData && (
                  <button 
                    onClick={() => setParsedData(null)}
                    className="text-xs text-slate-500 hover:text-red-500 underline"
                  >
                    Xóa kết quả
                  </button>
              )}
           </div>
           
           <div className="flex-1 overflow-auto bg-slate-50 p-0">
             {!parsedData ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                 <p className="text-sm">Vui lòng nhập JSON và nhấn "Kiểm tra" để xem trước dữ liệu tại đây.</p>
               </div>
             ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      {columns.map(col => (
                        <th key={col.key} className="px-3 py-2 whitespace-nowrap">{col.label}</th>
                      ))}
                      <th className="px-3 py-2 text-right">#</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.map((row, idx) => (
                      <tr key={idx} className="bg-white hover:bg-blue-50">
                        {columns.map(col => (
                          <td key={`${idx}-${col.key}`} className="px-3 py-2 truncate max-w-[150px]" title={String(row[col.key])}>
                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">
                             <button onClick={() => handleDeletePreviewRow(idx)} className="text-red-400 hover:text-red-600">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             )}
           </div>

           <div className="p-4 border-t border-slate-200 bg-white">
              <button
                onClick={handleImport}
                disabled={isLocked || !parsedData || parsedData.length === 0}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md transition-all transform hover:scale-[1.02]"
              >
                Nhập {parsedData?.length || 0} bản ghi vào Hệ thống
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default JsonIngestionHandler;
