import React from 'react';
import { Database, FileJson, HardDrive } from 'lucide-react';

interface InitDataPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInitEmpty: () => void;
  onSelectExternal: () => void;
}

const InitDataPromptModal: React.FC<InitDataPromptModalProps> = ({ isOpen, onClose, onInitEmpty, onSelectExternal }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database size={20} />
                Khởi tạo Dữ liệu
            </h3>
        </div>
        
        <div className="p-6">
            <p className="text-slate-600 mb-6 text-sm">
                Hệ thống không tìm thấy bản sao lưu nào trong thư mục <strong>UniData_System</strong>. 
                Hãy lựa chọn dữ liệu hệ thống từ nguồn mở rộng hoặc khởi tạo dữ liệu trắng.
            </p>
            
            <div className="space-y-3">
                <button 
                    onClick={onSelectExternal}
                    className="w-full flex items-center p-4 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all group text-left"
                >
                    <div className="bg-white p-2 rounded-lg shadow-sm text-purple-600 group-hover:scale-110 transition-transform">
                        <HardDrive size={24} />
                    </div>
                    <div className="ml-4">
                        <div className="font-bold text-purple-900">Nguồn mở rộng</div>
                        <div className="text-xs text-purple-700">Chọn dữ liệu từ thư mục được chia sẻ</div>
                    </div>
                </button>

                <button 
                    onClick={onInitEmpty}
                    className="w-full flex items-center p-4 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all group text-left"
                >
                    <div className="bg-white p-2 rounded-lg shadow-sm text-emerald-600 group-hover:scale-110 transition-transform">
                        <FileJson size={24} />
                    </div>
                    <div className="ml-4">
                        <div className="font-bold text-emerald-900">Dữ liệu trắng</div>
                        <div className="text-xs text-emerald-700">Khởi tạo hệ thống mới hoàn toàn</div>
                    </div>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InitDataPromptModal;
