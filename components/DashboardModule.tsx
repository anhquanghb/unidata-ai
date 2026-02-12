import React from 'react';
import { ScientificRecord, Faculty } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface DashboardModuleProps {
  scientificRecords: ScientificRecord[];
  faculties: Faculty[];
  currentAcademicYear: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const DashboardModule: React.FC<DashboardModuleProps> = ({ scientificRecords, faculties, currentAcademicYear }) => {
  // Filter records by current academic year
  const currentYearRecords = scientificRecords.filter(r => r.academicYear === currentAcademicYear);

  // Aggregate Data
  const totalScientific = currentYearRecords.length;
  const totalSupportRequested = currentYearRecords.filter(r => r.requestSupport).length;
  const totalFaculties = faculties.length;
  const totalPhDs = faculties.filter(f => f.degree.vi.toLowerCase().includes('tiến sĩ') || f.degree.en.toLowerCase().includes('doctor')).length;

  // Chart 1: Scientific Records by Type
  const recordsByType = currentYearRecords.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  const typeData = Object.keys(recordsByType).map(key => ({
      name: key,
      value: recordsByType[key]
  })).sort((a, b) => b.value - a.value).slice(0, 6); // Top 6 categories

  // Chart 2: Faculty Distribution (Sample: by Degree/Rank)
  const facultyByDegree = faculties.reduce((acc, curr) => {
      const deg = curr.degree.vi || 'Khác';
      acc[deg] = (acc[deg] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  const degreeData = Object.keys(facultyByDegree).map(key => ({
      name: key,
      value: facultyByDegree[key]
  }));

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard Tổng quan</h2>
          <p className="text-slate-600">Thống kê hoạt động khoa học và nhân sự.</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm font-bold shadow-sm">
          Năm học: {currentAcademicYear}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500">Tổng Hoạt động KHCN</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{totalScientific}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500">Đề nghị hỗ trợ báo cáo</p>
            <p className="text-3xl font-bold text-orange-500 mt-2">{totalSupportRequested}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500">Tổng Nhân sự</p>
            <p className="text-3xl font-bold text-indigo-600 mt-2">{totalFaculties}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500">Nhân sự trình độ TS</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">{totalPhDs}</p>
          </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Scientific Records Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Hoạt động Khoa học theo Loại hình</h3>
            {totalScientific > 0 ? (
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={typeData}
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#64748b" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={120} />
                        <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        cursor={{ fill: '#f1f5f9' }}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-80 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed">
                    Chưa có dữ liệu KHCN
                </div>
            )}
          </div>

          {/* Personnel Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Cơ cấu Nhân sự (Học vị)</h3>
            {totalFaculties > 0 ? (
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={degreeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                        {degreeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-80 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed">
                    Chưa có dữ liệu Nhân sự
                </div>
            )}
          </div>

      </div>
    </div>
  );
};

export default DashboardModule;