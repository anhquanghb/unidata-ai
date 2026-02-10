import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface UserManagementModuleProps {
  users: UserProfile[];
  onAddUser: (user: UserProfile) => void;
  onRemoveUser: (id: string) => void;
}

const UserManagementModule: React.FC<UserManagementModuleProps> = ({ users, onAddUser, onRemoveUser }) => {
  const [newUser, setNewUser] = useState({ fullName: '', username: '', role: 'staff' as 'admin' | 'staff' });

  const handleAddUser = () => {
    if (!newUser.fullName || !newUser.username) return;
    onAddUser({
      id: uuidv4(),
      fullName: newUser.fullName,
      username: newUser.username,
      role: newUser.role,
    });
    setNewUser({ fullName: '', username: '', role: 'staff' });
  };

  return (
    <div className="space-y-8">
       <div>
           <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Thêm người dùng mới</h3>
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
               <div className="md:col-span-1">
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Tên đăng nhập</label>
                   <input 
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      placeholder="username"
                   />
               </div>
               <div className="md:col-span-1">
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Họ và tên</label>
                   <input 
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                      placeholder="Nguyễn Văn A"
                   />
               </div>
               <div className="md:col-span-1">
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Vai trò</label>
                   <select 
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value as 'admin' | 'staff'})}
                   >
                       <option value="staff">Nhân viên (Staff)</option>
                       <option value="admin">Quản trị (Admin)</option>
                   </select>
               </div>
               <div className="md:col-span-1">
                   <button 
                      onClick={handleAddUser}
                      disabled={!newUser.username || !newUser.fullName}
                      className={`w-full py-2 rounded text-sm font-bold text-white transition-colors ${!newUser.username || !newUser.fullName ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                   >
                       Thêm User
                   </button>
               </div>
           </div>
       </div>

       <div>
           <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Danh sách người dùng</h3>
           <div className="overflow-hidden border border-slate-200 rounded-lg">
               <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-700 font-semibold">
                       <tr>
                           <th className="px-4 py-3">Tên đăng nhập</th>
                           <th className="px-4 py-3">Họ tên</th>
                           <th className="px-4 py-3">Vai trò</th>
                           <th className="px-4 py-3 text-right">Thao tác</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                       {users.map(user => (
                           <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                               <td className="px-4 py-3 font-mono text-slate-600">{user.username}</td>
                               <td className="px-4 py-3 font-medium text-slate-800">{user.fullName}</td>
                               <td className="px-4 py-3">
                                   <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                       {user.role.toUpperCase()}
                                   </span>
                               </td>
                               <td className="px-4 py-3 text-right">
                                   <button 
                                       onClick={() => onRemoveUser(user.id)}
                                       className="text-red-400 hover:text-red-600 text-xs font-medium"
                                   >
                                       Xóa
                                   </button>
                               </td>
                           </tr>
                       ))}
                       {users.length === 0 && (
                           <tr>
                               <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Chưa có người dùng nào.</td>
                           </tr>
                       )}
                   </tbody>
               </table>
           </div>
       </div>
    </div>
  );
};
export default UserManagementModule;