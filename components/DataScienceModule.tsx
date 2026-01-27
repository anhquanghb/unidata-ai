import React from 'react';
import { UniversityReport } from '../types';

interface DataScienceModuleProps {
  reports: UniversityReport[];
  isLocked: boolean;
  currentAcademicYear: string;
}

const DataScienceModule: React.FC<DataScienceModuleProps> = ({ reports, isLocked, currentAcademicYear }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-800">Dữ liệu Công bố & Đề tài</h3>
          <button 
            onClick={() => alert("Chức năng đang phát triển: Xuất báo cáo tổng hợp theo mẫu Bộ GD&ĐT")}
            className="flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors shadow-sm"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Xuất Excel/PDF
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Đơn vị</th>
              <th className="px-6 py-3">Năm học</th>
              <th className="px-6 py-3 text-center">Tổng Nhân sự</th>
              <th className="px-6 py-3 text-center">Bài báo ISI</th>
              <th className="px-6 py-3 text-center">Bài báo Scopus</th>
              <th className="px-6 py-3 text-center">Đề tài (Đang làm)</th>
              <th className="px-6 py-3">Ngày cập nhật</th>
              {!isLocked && <th className="px-6 py-3 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                  <td colSpan={isLocked ? 7 : 8} className="px-6 py-12 text-center text-slate-400">
                      Chưa có dữ liệu cho năm học {currentAcademicYear}. 
                      {!isLocked && ' Vui lòng vào phân hệ "Tiếp nhận dữ liệu" để thêm báo cáo.'}
                  </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="bg-white border-b hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{report.unitName}</td>
                  <td className="px-6 py-4">{report.academicYear}</td>
                  <td className="px-6 py-4 text-center">
                      {report.personnel.professors + report.personnel.associateProfessors + report.personnel.phd + report.personnel.masters}
                  </td>
                  <td className="px-6 py-4 text-center text-blue-600 font-bold">{report.publications.isi}</td>
                  <td className="px-6 py-4 text-center text-green-600 font-bold">{report.publications.scopus}</td>
                  <td className="px-6 py-4 text-center">{report.projects.ongoing}</td>
                  <td className="px-6 py-4 text-slate-400">
                      {new Date(report.extractionDate).toLocaleDateString('vi-VN')}
                  </td>
                  {!isLocked && (
                      <td className="px-6 py-4 text-right">
                           <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">Sửa</button>
                      </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataScienceModule;
