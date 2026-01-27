import React, { useState } from 'react';
import { extractReportData } from '../services/geminiService';
import { UniversityReport, AcademicYear } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface IngestionModuleProps {
  onDataExtracted: (report: UniversityReport) => void;
  customPrompt?: string;
  academicYears: AcademicYear[];
  currentAcademicYearCode: string;
  isLocked: boolean;
}

type SubModuleType = 
  | 'HUB' 
  | 'SCIENTIFIC' 
  | 'TRAINING' 
  | 'PERSONNEL' 
  | 'ADMISSIONS' 
  | 'CLASS' 
  | 'DEPARTMENT' 
  | 'BUSINESS';

const IngestionModule: React.FC<IngestionModuleProps> = ({ 
  onDataExtracted, 
  customPrompt, 
  currentAcademicYearCode,
  isLocked
}) => {
  const [activeSubModule, setActiveSubModule] = useState<SubModuleType>('HUB');
  
  // Extraction Logic State (Only used when activeSubModule === 'SCIENTIFIC')
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleExtract = async () => {
    if (!inputText.trim()) return;

    // Double Check Lock (though UI should prevent it)
    if (isLocked) {
        setError(`Năm học ${currentAcademicYearCode} đang bị khóa. Không thể nhập liệu thêm.`);
        return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const data = await extractReportData(inputText, customPrompt);
      
      const newReport: UniversityReport = {
        id: uuidv4(),
        unitName: data.unitName || 'Chưa xác định',
        academicYear: currentAcademicYearCode, // Strict enforcement of global year context
        personnel: data.personnel || { professors: 0, associateProfessors: 0, phd: 0, masters: 0 },
        publications: data.publications || { isi: 0, scopus: 0, domestic: 0, otherInternational: 0 },
        projects: data.projects || { assigned: 0, ongoing: 0, completed: 0 },
        qualitative: data.qualitative || { researchDirections: [], difficulties: [], proposals: [] },
        extractionDate: new Date().toISOString(),
      };

      onDataExtracted(newReport);
      setInputText('');
      alert(`Trích xuất dữ liệu thành công cho năm học ${currentAcademicYearCode}!`);
    } catch (err) {
      setError('Lỗi khi trích xuất dữ liệu. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          setInputText(text);
        }
      };
      reader.readAsText(file);
    }
  };

  // --- SUB-COMPONENTS ---

  const ModuleCard = ({ type, title, icon, description, color }: any) => (
    <button
      onClick={() => setActiveSubModule(type)}
      className="flex flex-col items-center p-6 bg-white border border-slate-200 rounded-xl hover:shadow-lg transition-all duration-300 group hover:-translate-y-1"
    >
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${color} text-white`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-800 text-lg mb-2">{title}</h3>
      <p className="text-sm text-slate-500 text-center">{description}</p>
    </button>
  );

  const renderHub = () => (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Trung tâm Tiếp nhận Dữ liệu (Ingestion Hub)</h2>
        <div className="flex items-center gap-3">
             <p className="text-slate-600">Chọn phân hệ dữ liệu để thực hiện nhập liệu hoặc trích xuất tự động.</p>
             <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold border border-blue-200">
                Năm học: {currentAcademicYearCode}
             </span>
             {isLocked && (
                 <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-200">
                    ĐÃ KHÓA (CHỈ XEM)
                 </span>
             )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ModuleCard 
          type="SCIENTIFIC" 
          title="Thông tin Khoa học" 
          description="Công bố bài báo, đề tài nghiên cứu, hội thảo."
          color="bg-blue-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
        />
        <ModuleCard 
          type="TRAINING" 
          title="Thông tin Đào tạo" 
          description="Chương trình đào tạo, tiến độ giảng dạy, học liệu."
          color="bg-green-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <ModuleCard 
          type="PERSONNEL" 
          title="Thông tin Nhân sự" 
          description="Hồ sơ giảng viên, cán bộ, hợp đồng lao động."
          color="bg-orange-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <ModuleCard 
          type="ADMISSIONS" 
          title="Thông tin Tuyển sinh" 
          description="Dữ liệu thí sinh, điểm chuẩn, nhập học."
          color="bg-purple-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
        />
        <ModuleCard 
          type="CLASS" 
          title="Thông tin Lớp học" 
          description="Danh sách sinh viên, thời khóa biểu."
          color="bg-indigo-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        />
        <ModuleCard 
          type="DEPARTMENT" 
          title="Thông tin Tổ bộ môn" 
          description="Cơ cấu bộ môn, sinh hoạt chuyên môn."
          color="bg-teal-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
        />
        <ModuleCard 
          type="BUSINESS" 
          title="Quan hệ Doanh nghiệp" 
          description="Hợp tác, tài trợ, thực tập sinh."
          color="bg-rose-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
        />
      </div>
    </div>
  );

  const renderScientificExtractor = () => (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-4 flex items-center">
        <button 
          onClick={() => setActiveSubModule('HUB')}
          className="mr-4 p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Trích xuất Dữ liệu Khoa học</h2>
           <p className="text-slate-600">Upload báo cáo để AI bóc tách thông tin bài báo, đề tài, nhân sự nghiên cứu.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
        {isLocked && (
            <div className="absolute inset-0 bg-slate-50/80 z-10 flex flex-col items-center justify-center text-center p-4">
                 <div className="bg-white p-6 rounded-xl shadow-lg border border-red-100 max-w-md">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Dữ liệu đang bị Khóa</h3>
                    <p className="text-slate-600">Năm học <strong>{currentAcademicYearCode}</strong> đang ở chế độ Chỉ Xem.</p>
                    <p className="text-slate-500 text-sm mt-2">Vui lòng chọn năm học khác trong Cài đặt hoặc mở khóa năm học này để tiếp tục nhập liệu.</p>
                 </div>
            </div>
        )}

        <div className="mb-6 flex items-center gap-4">
            <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Năm học nhập liệu (Cố định theo hệ thống)
                </label>
                <input 
                    type="text"
                    disabled
                    value={currentAcademicYearCode}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-600 font-bold"
                />
            </div>
            <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nguồn dữ liệu đầu vào
                </label>
                 <label className={`flex items-center justify-center px-4 py-2 bg-slate-50 text-blue rounded-lg shadow-sm tracking-wide uppercase border border-blue cursor-pointer hover:bg-blue-50 text-blue-600 font-bold transition-all border-blue-200 hover:border-blue-400 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                    <span className="text-sm leading-normal">Upload File (.txt)</span>
                    <input type='file' className="hidden" accept=".txt" onChange={handleFileUpload} disabled={isLocked} />
                </label>
            </div>
        </div>
          
          <textarea
            className="w-full h-64 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm bg-slate-50"
            placeholder="Dán nội dung báo cáo tổng kết năm học của Khoa/Viện vào đây..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLocked}
          ></textarea>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={handleExtract}
            disabled={isProcessing || !inputText.trim() || isLocked}
            className={`flex items-center px-6 py-3 rounded-lg text-white font-medium shadow-md transition-all ${
              isProcessing || !inputText.trim() || isLocked
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
            }`}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xử lý với Gemini AI...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Trích xuất dữ liệu
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-800 mb-1">Mẹo sử dụng:</h3>
        <p className="text-sm text-blue-600">
          Hệ thống hoạt động tốt nhất với các văn bản có cấu trúc rõ ràng, ví dụ: "1. Về nhân sự: Khoa hiện có 5 Phó Giáo sư... 2. Về nghiên cứu khoa học: Đã công bố 12 bài ISI..."
        </p>
      </div>
    </div>
  );

  const renderPlaceholder = (title: string) => (
    <div className="p-8 h-full flex flex-col">
       <div className="mb-8 flex items-center">
        <button 
          onClick={() => setActiveSubModule('HUB')}
          className="mr-4 p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 border-dashed">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-slate-500 text-lg font-medium">Chức năng đang được phát triển</p>
        <p className="text-slate-400">Vui lòng quay lại sau.</p>
      </div>
    </div>
  );

  switch (activeSubModule) {
    case 'HUB': return renderHub();
    case 'SCIENTIFIC': return renderScientificExtractor();
    case 'TRAINING': return renderPlaceholder('Thông tin Đào tạo');
    case 'PERSONNEL': return renderPlaceholder('Thông tin Nhân sự');
    case 'ADMISSIONS': return renderPlaceholder('Thông tin Tuyển sinh');
    case 'CLASS': return renderPlaceholder('Thông tin Lớp học');
    case 'DEPARTMENT': return renderPlaceholder('Thông tin Tổ bộ môn');
    case 'BUSINESS': return renderPlaceholder('Thông tin Quan hệ Doanh nghiệp');
    default: return renderHub();
  }
};

export default IngestionModule;
