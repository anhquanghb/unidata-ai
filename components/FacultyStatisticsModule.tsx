import React from 'react';
import { Faculty, Course } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Props {
  faculties: Faculty[];
  courses: Course[];
  language: 'vi' | 'en';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const FacultyStatisticsModule: React.FC<Props> = ({ faculties, courses, language }) => {
  // Simple aggregation for Degree
  const degreeStats = faculties.reduce((acc, f) => {
      const degree = f.degree[language] || 'Unknown';
      acc[degree] = (acc[degree] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  const degreeData = Object.keys(degreeStats).map(key => ({
      name: key,
      value: degreeStats[key]
  }));

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Tổng Giảng viên</h3>
                <p className="text-4xl font-bold text-indigo-600">{faculties.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Tiến sĩ</h3>
                 <p className="text-4xl font-bold text-emerald-600">{faculties.filter(f => f.degree.en.toLowerCase().includes('doctor') || f.degree.vi.toLowerCase().includes('tiến sĩ')).length}</p>
            </div>
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Bài báo Quốc tế</h3>
                 <p className="text-4xl font-bold text-orange-600">{faculties.reduce((acc, f) => acc + (f.publicationsList?.length || 0), 0)}</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6">Phân bố theo Học vị</h3>
            <div className="h-80">
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
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};

export default FacultyStatisticsModule;