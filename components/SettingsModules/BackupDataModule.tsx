import React from 'react';
import { SystemSettings } from '../../types';

interface BackupDataModuleProps {
  settings: SystemSettings;
  onExport: () => void;
  onSaveToDrive: () => void;
  onImportClick: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onShowVersions?: () => void;
}

const BackupDataModule: React.FC<BackupDataModuleProps> = ({
  settings,
  onExport,
  onSaveToDrive,
  onImportClick,
  onFileChange,
  fileInputRef,
  onShowVersions
}) => {
  return (
    <div className="space-y-6 max-w-xl">
       {/* 1. Select from Drive */}
       <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
          <h3 className="font-semibold text-indigo-900 mb-2">1. Chọn dữ liệu từ đám mây (Google Drive)</h3>
          <p className="text-sm text-indigo-700 mb-4">
              Khôi phục hoặc đồng bộ dữ liệu từ các phiên bản sao lưu đã được lưu trữ trong thư mục <strong>{settings.driveConfig.folderName || 'UniData_Backups'}</strong>.
          </p>
          <button 
              onClick={onShowVersions}
              disabled={!settings.driveConfig.isConnected}
              className={`flex items-center px-4 py-2 text-white rounded transition-colors text-sm font-medium ${settings.driveConfig.isConnected ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed'}`}
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {settings.driveConfig.isConnected ? "Danh sách bản sao lưu" : "Chưa kết nối Drive"}
          </button>
      </div>

       {/* 2. Save to Drive */}
       <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <h3 className="font-semibold text-green-900 mb-2">2. Lưu trữ đám mây (Google Drive)</h3>
          <p className="text-sm text-green-700 mb-4">
              Tải bản sao lưu hiện tại lên thư mục <strong>{settings.driveConfig.folderName || 'UniData_Backups'}</strong> trên Google Drive.
          </p>
          <button 
              onClick={onSaveToDrive}
              disabled={!settings.driveConfig.isConnected}
              className={`flex items-center px-4 py-2 text-white rounded transition-colors text-sm font-medium ${settings.driveConfig.isConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-300 cursor-not-allowed'}`}
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {settings.driveConfig.isConnected ? "Lưu lên Drive (Tạo phiên bản mới)" : "Chưa kết nối Drive"}
          </button>
      </div>

      {/* 3. Export Local */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-2">3. Xuất dữ liệu hệ thống (Local)</h3>
          <p className="text-sm text-blue-700 mb-4">
              Tải xuống toàn bộ dữ liệu (Báo cáo, Cơ cấu tổ chức, Người dùng, Cài đặt) dưới dạng file JSON để lưu trữ hoặc chuyển sang máy khác.
          </p>
          <button 
              onClick={onExport}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Xuất dữ liệu (.json)
          </button>
      </div>

      {/* 4. Import Local */}
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
          <h3 className="font-semibold text-orange-900 mb-2">4. Nhập dữ liệu từ file (Local)</h3>
          <p className="text-sm text-orange-700 mb-4">
              Khôi phục hệ thống từ file backup. <strong className="block mt-1">LƯU Ý: Hành động này sẽ ghi đè toàn bộ dữ liệu hiện tại!</strong>
          </p>
          <input 
              type="file" 
              ref={fileInputRef} 
              onChange={onFileChange} 
              accept=".json" 
              className="hidden" 
          />
          <button 
              onClick={onImportClick}
              className="flex items-center px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm font-medium"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Chọn file backup (.json)
          </button>
      </div>
   </div>
  );
};

export default BackupDataModule;