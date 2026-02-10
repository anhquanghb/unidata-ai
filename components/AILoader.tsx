import React from 'react';
import { Loader2 } from 'lucide-react';

interface AILoaderProps {
  isVisible: boolean;
  message?: string;
}

const AILoader: React.FC<AILoaderProps> = ({ isVisible, message = 'Processing...' }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 border border-indigo-100">
        <div className="relative">
           <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
           <div className="absolute inset-0 flex items-center justify-center">
             <Loader2 size={20} className="text-indigo-600 animate-pulse" />
           </div>
        </div>
        <div className="text-center">
            <h4 className="font-bold text-slate-800">UniData AI</h4>
            <p className="text-xs text-slate-500 font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default AILoader;