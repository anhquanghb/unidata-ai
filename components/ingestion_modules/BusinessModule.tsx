import React from 'react';
import { BusinessRecord } from '../../types';
import JsonIngestionHandler from '../JsonIngestionHandler';

interface BusinessModuleProps {
  onImport: (data: BusinessRecord[]) => void;
  isLocked: boolean;
  currentAcademicYear: string;
  virtualAssistantUrl?: string;
}

const BusinessModule: React.FC<BusinessModuleProps> = ({ onImport, isLocked, currentAcademicYear, virtualAssistantUrl }) => {
  const exampleJson = `{
  "partnerName": "FPT Software",
  "activityType": "Ký kết MOU",
  "value": "N/A",
  "status": "Đã hoàn thành"
}`;

  const columns = [
    { key: 'partnerName', label: 'Tên Doanh nghiệp' },
    { key: 'activityType', label: 'Hoạt động' },
    { key: 'value', label: 'Giá trị' },
    { key: 'status', label: 'Trạng thái' },
  ];

  return (
    <JsonIngestionHandler
      title="Tiếp nhận Dữ liệu Quan hệ Doanh nghiệp"
      exampleJson={exampleJson}
      columns={columns}
      onImport={onImport}
      isLocked={isLocked}
      academicYear={currentAcademicYear}
      virtualAssistantUrl={virtualAssistantUrl}
    />
  );
};

export default BusinessModule;
