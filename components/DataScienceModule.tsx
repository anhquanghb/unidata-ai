import React, { useState } from 'react';
import { ScientificRecord, UniversityReport } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface DataScienceModuleProps {
  reports: UniversityReport[]; // Kept for future aggregation logic
  scientificRecords: ScientificRecord[];
  onAddScientificRecord: (record: ScientificRecord) => void;
  onDeleteScientificRecord: (id: string) => void;
  isLocked: boolean;
  currentAcademicYear: string;
}

const SCIENTIFIC_TYPES = [
  "Hội nghị/Hội thảo",
  "Bài báo trong nước",
  "Tạp chí ngành",
  "Bài báo ISI/SCOPUS",
  "Bài báo quốc tế Non ISI/SCOPUS",
  "Giải thưởng của sinh viên (do GV hướng dẫn)",
  "Đề tài nghiên cứu",
  "Dịch sách",
  "Sách chuyên khảo",
  "Đề tài NCKH cấp tỉnh/Thành phố",
  "Đề tài NCKH cấp Bộ/Quốc gia",
  "Đề tài NAFOSTED",
  "Hướng dẫn đề tài sinh viên NCKH cấp tỉnh/Thành phố",
  "Hướng dẫn đề tài sinh viên NCKH cấp Bộ/Quốc gia",
  "Hướng dẫn sinh viên công bố tạp chí NCKH",
  "Hướng dẫn sinh viên đạt giải thưởng",
  "Bằng sáng chế, giải pháp hữu ích, kiểu dáng công nghiệp (PATENT)",
  "Other"
];

const DataScienceModule: React.FC<DataScienceModuleProps> = ({ 
  scientificRecords,
  onAddScientificRecord,
  onDeleteScientificRecord,
  isLocked, 
  currentAcademicYear 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [lecturerName, setLecturerName] = useState('');
  const [recordName, setRecordName] = useState('');
  const [type, setType] = useState(SCIENTIFIC_TYPES[0]);
  const [requestSupport, setRequestSupport] = useState(true);
  const [link, setLink] = useState('');

  const handleSave = () => {
    if (!lecturerName.trim() || !recordName.trim()) {
      alert("Vui lòng nhập Tên giảng viên và Tên công bố/đề tài.");
      return;
    }

    const newRecord: ScientificRecord = {
      id: uuidv4(),
      lecturerName,
      recordName,
      academicYear: currentAcademicYear,
      requestSupport,
      type,
      link
    };

    onAddScientificRecord(newRecord);
    
    // Reset form
    setLecturerName('');
    setRecordName('');
    setType(SCIENTIFIC_TYPES[0]);
    setRequestSupport(true);
    setLink('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                <span className="text-xs text-slate-500 block uppercase font-bold">Tổng số bản ghi</span>
                <span className="text-xl font-bold text-blue-600">{scientificRecords.length}</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                <span className="text-xs text-slate-500 block uppercase font-bold">Đề nghị hỗ trợ</span>
                <span className="text-xl font-bold text-orange-500">{scientificRecords.filter(r => r.requestSupport).length}</span>
            </div>
        </div>
        
        <div className="flex gap-2">
             <button 
                onClick={() => alert("Chức năng đang phát triển: Xuất báo cáo tổng hợp theo mẫu Bộ GD&ĐT")}
                className="flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors font-medium border border-slate-300"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Xuất Excel
            </button>
            <button 
                onClick={() => setIsAdding(!isAdding)}
                disabled={isLocked}
                className={`flex items-center px-4 py-2 rounded-lg text-white text-sm transition-colors shadow-sm font-medium ${isLocked ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {isAdding ? 'Hủy thêm mới' : '+ Thêm bản ghi mới'}
            </button>
        </div>
      </div>

      {/* Add New Form */}
      {isAdding && !isLocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm animate-fade-in-down">
          <h4 className="font-bold text-blue-800 mb-4 flex items-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
             </svg>
             Nhập thông tin Khoa học Công nghệ (Năm học: {currentAcademicYear})
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên giảng viên <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Nguyễn Văn A"
                value={lecturerName}
                onChange={e => setLecturerName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên công bố/Giải thưởng/Sách <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Nghiên cứu về AI..."
                value={recordName}
                onChange={e => setRecordName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Loại hình</label>
              <select 
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                {SCIENTIFIC_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Đường dẫn (Link Google Drive/URL)</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
                value={link}
                onChange={e => setLink(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-6">
             <label className="block text-xs font-semibold text-slate-600 mb-2">Đề nghị hỗ trợ báo cáo lên trường DTU <span className="text-red-500">*</span></label>
             <div className="flex gap-4">
               <label className="flex items-center cursor-pointer">
                 <input 
                    type="radio" 
                    className="w-4 h-4 text-blue-600" 
                    checked={requestSupport === true} 
                    onChange={() => setRequestSupport(true)}
                 />
                 <span className="ml-2 text-sm text-slate-700">Đề nghị hỗ trợ</span>
               </label>
               <label className="flex items-center cursor-pointer">
                 <input 
                    type="radio" 
                    className="w-4 h-4 text-blue-600" 
                    checked={requestSupport === false} 
                    onChange={() => setRequestSupport(false)}
                 />
                 <span className="ml-2 text-sm text-slate-700">Không đề nghị (Tự báo cáo)</span>
               </label>
             </div>
          </div>

          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 font-medium"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 shadow-sm font-medium"
            >
              Lưu bản ghi
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Giảng viên</th>
                <th className="px-6 py-3">Loại hình</th>
                <th className="px-6 py-3">Tên Công bố / Đề tài</th>
                <th className="px-6 py-3 text-center">Hỗ trợ DTU</th>
                <th className="px-6 py-3 text-center">Link</th>
                {!isLocked && <th className="px-6 py-3 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {scientificRecords.length === 0 ? (
                <tr>
                    <td colSpan={isLocked ? 5 : 6} className="px-6 py-12 text-center text-slate-400">
                        Chưa có dữ liệu khoa học cho năm học {currentAcademicYear}. 
                        {!isLocked && <span className="block mt-2 text-sm text-blue-500 cursor-pointer hover:underline" onClick={() => setIsAdding(true)}>+ Thêm bản ghi mới ngay</span>}
                    </td>
                </tr>
              ) : (
                scientificRecords.map((record) => (
                  <tr key={record.id} className="bg-white border-b hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{record.lecturerName}</td>
                    <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-600 border border-slate-200 truncate max-w-[150px]" title={record.type}>
                            {record.type}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 line-clamp-2" title={record.recordName}>{record.recordName}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        {record.requestSupport ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                Có
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Không
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-center">
                        {record.link ? (
                             <a href={record.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
                                Xem
                             </a>
                        ) : (
                            <span className="text-slate-300">-</span>
                        )}
                    </td>
                    {!isLocked && (
                        <td className="px-6 py-4 text-right">
                           <button 
                                onClick={() => onDeleteScientificRecord(record.id)}
                                className="text-red-400 hover:text-red-600 transition-colors"
                                title="Xóa bản ghi"
                           >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                           </button>
                        </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataScienceModule;
