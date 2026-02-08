import React from 'react';
import { ScientificRecord } from '../../types';
import JsonIngestionHandler from '../JsonIngestionHandler';

interface DataScienceModuleProps {
  onImport: (data: ScientificRecord[]) => void;
  isLocked: boolean;
  currentAcademicYear: string;
  virtualAssistantUrl?: string;
}

const DataScienceModule: React.FC<DataScienceModuleProps> = ({ onImport, isLocked, currentAcademicYear, virtualAssistantUrl }) => {
  const exampleJson = `{
  "lecturerName": "Nguyễn Văn A",
  "recordName": "Nghiên cứu ứng dụng AI trong Y tế",
  "type": "Bài báo ISI/SCOPUS",
  "requestSupport": true,
  "link": "https://doi.org/..."
}`;

  const columns = [
    { key: 'lecturerName', label: 'Tên Giảng viên' },
    { key: 'recordName', label: 'Tên Công bố/Đề tài' },
    { key: 'type', label: 'Loại hình' },
    { 
        key: 'requestSupport', 
        label: 'Hỗ trợ DTU', 
        render: (val: boolean) => val ? <span className="text-green-600 font-bold">Có</span> : <span className="text-slate-400">Không</span> 
    },
  ];

  return (
    <JsonIngestionHandler
      title="Tiếp nhận Dữ liệu Khoa học & Công nghệ"
      exampleJson={exampleJson}
      columns={columns}
      onImport={onImport}
      isLocked={isLocked}
      academicYear={currentAcademicYear}
      virtualAssistantUrl={virtualAssistantUrl}
    />
  );
};

export default DataScienceModule;
