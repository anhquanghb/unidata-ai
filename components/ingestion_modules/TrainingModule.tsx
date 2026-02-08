import React from 'react';
import { TrainingRecord } from '../../types';
import JsonIngestionHandler from '../JsonIngestionHandler';

interface TrainingModuleProps {
  onImport: (data: TrainingRecord[]) => void;
  isLocked: boolean;
  currentAcademicYear: string;
  virtualAssistantUrl?: string;
}

const TrainingModule: React.FC<TrainingModuleProps> = ({ onImport, isLocked, currentAcademicYear, virtualAssistantUrl }) => {
  const exampleJson = `{
  "programName": "Kỹ thuật Phần mềm CLC",
  "level": "Đại học",
  "status": "Đang đào tạo",
  "studentsCount": 120
}`;

  const columns = [
    { key: 'programName', label: 'Chương trình' },
    { key: 'level', label: 'Bậc đào tạo' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'studentsCount', label: 'Số lượng SV' },
  ];

  return (
    <JsonIngestionHandler
      title="Tiếp nhận Dữ liệu Đào tạo"
      exampleJson={exampleJson}
      columns={columns}
      onImport={onImport}
      isLocked={isLocked}
      academicYear={currentAcademicYear}
      virtualAssistantUrl={virtualAssistantUrl}
    />
  );
};

export default TrainingModule;
