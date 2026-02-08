import React from 'react';
import { PersonnelRecord } from '../../types';
import JsonIngestionHandler from '../JsonIngestionHandler';

interface PersonnelModuleProps {
  onImport: (data: PersonnelRecord[]) => void;
  isLocked: boolean;
  currentAcademicYear: string;
  virtualAssistantUrl?: string;
}

const PersonnelModule: React.FC<PersonnelModuleProps> = ({ onImport, isLocked, currentAcademicYear, virtualAssistantUrl }) => {
  const exampleJson = `{
  "fullName": "Trần Thị B",
  "title": "Tiến sĩ",
  "position": "Giảng viên",
  "department": "Bộ môn CNPM",
  "startDate": "2023-09-01"
}`;

  const columns = [
    { key: 'fullName', label: 'Họ và Tên' },
    { key: 'title', label: 'Học hàm/Học vị' },
    { key: 'department', label: 'Đơn vị' },
    { key: 'startDate', label: 'Ngày bắt đầu' },
  ];

  return (
    <JsonIngestionHandler
      title="Tiếp nhận Dữ liệu Nhân sự"
      exampleJson={exampleJson}
      columns={columns}
      onImport={onImport}
      isLocked={isLocked}
      academicYear={currentAcademicYear}
      virtualAssistantUrl={virtualAssistantUrl}
    />
  );
};

export default PersonnelModule;
