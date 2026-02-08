import React from 'react';
import { ClassRecord } from '../../types';
import JsonIngestionHandler from '../JsonIngestionHandler';

interface ClassModuleProps {
  onImport: (data: ClassRecord[]) => void;
  isLocked: boolean;
  currentAcademicYear: string;
  virtualAssistantUrl?: string;
}

const ClassModule: React.FC<ClassModuleProps> = ({ onImport, isLocked, currentAcademicYear, virtualAssistantUrl }) => {
  const exampleJson = `{
  "className": "K29-TPM1",
  "advisor": "Nguyễn Văn A",
  "monitor": "Lê Văn C",
  "size": 45
}`;

  const columns = [
    { key: 'className', label: 'Tên lớp' },
    { key: 'advisor', label: 'Cố vấn HT' },
    { key: 'monitor', label: 'Lớp trưởng' },
    { key: 'size', label: 'Sĩ số' },
  ];

  return (
    <JsonIngestionHandler
      title="Tiếp nhận Dữ liệu Lớp Sinh viên"
      exampleJson={exampleJson}
      columns={columns}
      onImport={onImport}
      isLocked={isLocked}
      academicYear={currentAcademicYear}
      virtualAssistantUrl={virtualAssistantUrl}
    />
  );
};

export default ClassModule;
