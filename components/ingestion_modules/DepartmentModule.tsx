import React from 'react';
import { DepartmentRecord } from '../../types';
import JsonIngestionHandler from '../JsonIngestionHandler';

interface DepartmentModuleProps {
  onImport: (data: DepartmentRecord[]) => void;
  isLocked: boolean;
  currentAcademicYear: string;
  virtualAssistantUrl?: string;
}

const DepartmentModule: React.FC<DepartmentModuleProps> = ({ onImport, isLocked, currentAcademicYear, virtualAssistantUrl }) => {
  const exampleJson = `{
  "activityName": "Seminar: Deep Learning Advanced",
  "date": "2023-10-15",
  "attendees": 25,
  "description": "Chia sẻ về Transformer models"
}`;

  const columns = [
    { key: 'activityName', label: 'Tên hoạt động' },
    { key: 'date', label: 'Ngày tổ chức' },
    { key: 'attendees', label: 'Số người tham dự' },
  ];

  return (
    <JsonIngestionHandler
      title="Tiếp nhận Dữ liệu Tổ Bộ môn"
      exampleJson={exampleJson}
      columns={columns}
      onImport={onImport}
      isLocked={isLocked}
      academicYear={currentAcademicYear}
      virtualAssistantUrl={virtualAssistantUrl}
    />
  );
};

export default DepartmentModule;
