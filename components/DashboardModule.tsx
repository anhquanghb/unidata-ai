import React from 'react';
import { UniversityReport } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface DashboardModuleProps {
  reports: UniversityReport[];
  currentAcademicYear: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const DashboardModule: React.FC<DashboardModuleProps> = ({ reports, currentAcademicYear }) => {
  // Aggregate data
  const totalReports = reports.length;
  const totalISI = reports.reduce((acc, curr) => acc + curr.publications.isi, 0);
  const totalProjects = reports.reduce((acc, curr) => acc + curr.projects.ongoing, 0);
  const totalStaff = reports.reduce((acc, curr) => {
    return acc + curr.personnel.professors + curr.personnel.associateProfessors + curr.personnel.phd + curr.personnel.masters;
  }, 0);

  // Prepare Chart Data
  const publicationData = reports.map(r => ({
    name: r.unitName,
    ISI: r.publications.isi,
    Scopus: r.publications.scopus,
    Domestic: r.publications.domestic
  }));

  const personnelDist = [
    { name: 'Giáo sư', value: reports.reduce((acc, r) => acc + r.personnel.professors, 0) },
    { name: 'Phó Giáo sư', value: reports.reduce((acc, r) => acc + r.personnel.associateProfessors, 0) },
    { name: 'Tiến sĩ', value: reports.reduce((acc, r) => acc + r.personnel.phd, 0) },
    { name: 'Thạc sĩ', value: reports.reduce((acc, r) => acc + r.personnel.masters, 0) },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard Tổng quan</h2>
          <p className="text-slate-600">Số liệu thời gian thực từ toàn hệ thống đại học.</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm font-bold shadow-sm">
          Năm học: {currentAcademicYear}
        </div>
      </div>

      {totalReports === 0 ? (
         <div className="flex flex-col items-center justify-center h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
             <p className="text-slate-500 font-medium">Chưa có dữ liệu cho năm học {currentAcademicYear}</p>
             <p className="text-sm text-slate-400 mt-1">Vui lòng vào phần "Tiếp nhận dữ liệu" để thêm báo cáo mới.</p>
         </div>
      ) : (
        <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Đơn vị báo cáo</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{totalReports}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Tổng công bố ISI</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{totalISI}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Đề tài đang thực hiện</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{totalProjects}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Tổng nhân sự (ThS+)</p>
                <p className="text-3xl font-bold text-orange-500 mt-2">{totalStaff}</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Publications Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Năng suất Công bố Khoa học theo Đơn vị</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={publicationData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickMargin={10} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f1f5f9' }}
                        />
                        <Legend />
                        <Bar dataKey="ISI" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Scopus" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Domestic" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
                </div>

                {/* Personnel Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Cơ cấu Nhân sự (Học hàm/Học vị)</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={personnelDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                        {personnelDist.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
                </div>

            </div>
        </>
      )}
    </div>
  );
};

export default DashboardModule;
