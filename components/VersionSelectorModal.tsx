import React, { useState, useEffect } from 'react';
import { BackupVersion } from '../types';

interface VersionSelectorModalProps {
  isOpen: boolean;
  versions: BackupVersion[];
  onConfirm: (versionId: string) => void;
  isLoading: boolean;
}

const VersionSelectorModal: React.FC<VersionSelectorModalProps> = ({ isOpen, versions, onConfirm, isLoading }) => {
  const [selectedId, setSelectedId] = useState<string>('');

  // Default to the first item (assumed latest) when versions load
  useEffect(() => {
    if (versions.length > 0) {
      setSelectedId(versions[0].id);
    }
  }, [versions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-white/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
             </div>
             <div>
                <h3 className="text-lg font-bold text-white">Đồng bộ Dữ liệu</h3>
                <p className="text-blue-100 text-xs">Phát hiện các bản ghi từ Google Drive</p>
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-8">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                <p className="text-slate-500 font-medium">Đang quét thư mục Google Drive...</p>
             </div>
          ) : versions.length === 0 ? (
             <div className="text-center py-8 text-slate-500">
                <p>Không tìm thấy bản sao lưu nào trong thư mục cấu hình.</p>
                <button 
                    onClick={() => onConfirm('')} 
                    className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium"
                >
                    Tiếp tục với dữ liệu trắng
                </button>
             </div>
          ) : (
            <>
                <p className="text-sm text-slate-600 mb-4">
                    Hệ thống đã tìm thấy <strong>{versions.length}</strong> phiên bản dữ liệu. 
                    Mặc định đang chọn phiên bản mới nhất.
                </p>
                
                <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg mb-6">
                    {versions.map((ver, index) => (
                        <label 
                            key={ver.id} 
                            className={`flex items-center p-4 border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${selectedId === ver.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                        >
                            <input 
                                type="radio" 
                                name="version" 
                                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                checked={selectedId === ver.id}
                                onChange={() => setSelectedId(ver.id)}
                            />
                            <div className="ml-3 flex-1">
                                <div className="flex justify-between items-center">
                                    <span className={`font-medium text-sm ${selectedId === ver.id ? 'text-blue-800' : 'text-slate-700'}`}>
                                        {ver.fileName}
                                    </span>
                                    {index === 0 && (
                                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">Mới nhất</span>
                                    )}
                                </div>
                                <div className="flex gap-3 mt-1 text-xs text-slate-400">
                                    <span>Ngày tạo: {new Date(ver.createdTime).toLocaleString('vi-VN')}</span>
                                    <span>•</span>
                                    <span>Dung lượng: {ver.size}</span>
                                </div>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => onConfirm(selectedId)}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-md flex items-center"
                    >
                        <span>Xác nhận & Tải dữ liệu</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionSelectorModal;
