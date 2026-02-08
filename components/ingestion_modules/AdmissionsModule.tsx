import React from 'react';
import { AdmissionRecord } from '../../types';
import JsonIngestionHandler from '../JsonIngestionHandler';

interface AdmissionsModuleProps {
  onImport: (data: AdmissionRecord[]) => void;
  isLocked: boolean;
  currentAcademicYear: string;
  virtualAssistantUrl?: string;
}

const AdmissionsModule: React.FC<AdmissionsModuleProps> = ({ onImport, isLocked, currentAcademicYear, virtualAssistantUrl }) => {
  const exampleJson = `{
  "major": "Khoa học Dữ liệu",
  "quota": 100,
  "applications": 500,
  "admitted": 105,
  "score": 24.5
}`;

  const columns = [
    { key: 'major', label: 'Ngành tuyển sinh' },
    { key: 'quota', label: 'Chỉ tiêu' },
    { key: 'applications', label: 'Hồ sơ' },
    { key: 'admitted', label: 'Trúng tuyển' },
    { key: 'score', label: 'Điểm chuẩn' },
  ];

  return (
    <JsonIngestionHandler
      title="Tiếp nhận Dữ liệu Tuyển sinh"
      exampleJson={exampleJson}
      columns={columns}
      onImport={onImport}
      isLocked={isLocked}
      academicYear={currentAcademicYear}
      virtualAssistantUrl={virtualAssistantUrl}
    />
  );
};

export default AdmissionsModule;
