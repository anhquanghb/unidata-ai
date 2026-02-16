import React, { useState } from 'react';
import { UserProfile, Unit } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { Shield, User, Building, CheckCircle, Mail, Crown } from 'lucide-react';

interface UserManagementModuleProps {
  users: UserProfile[];
  units: Unit[];
  onAddUser: (user: UserProfile) => void;
  onUpdateUsers: (users: UserProfile[]) => void;
  onRemoveUser: (id: string) => void;
}

const UserManagementModule: React.FC<UserManagementModuleProps> = ({ users, units, onAddUser, onUpdateUsers, onRemoveUser }) => {
  const [newUser, setNewUser] = useState<Partial<UserProfile>>({ 
      fullName: '', 
      username: '', 
      role: 'unit_manager',
      email: '',
      isPrimary: false,
      managedUnitId: ''
  });

  const handleAddUser = () => {
    if (!newUser.fullName || !newUser.username) return;
    
    // Safety check: if adding a primary school admin, check if one already exists
    if (newUser.role === 'school_admin' && newUser.isPrimary) {
        if (users.some(u => u.role === 'school_admin' && u.isPrimary)) {
            alert("Đã có tài khoản Quản lý cấp trường CHÍNH. Vui lòng bỏ chọn 'Tài khoản chính' hoặc hạ cấp tài khoản cũ trước.");
            return;
        }
    }

    // Safety check: if adding a primary unit manager, check if unit already has one
    if (newUser.role === 'unit_manager' && newUser.isPrimary && newUser.managedUnitId) {
        if (users.some(u => u.role === 'unit_manager' && u.managedUnitId === newUser.managedUnitId && u.isPrimary)) {
            alert("Đơn vị này đã có tài khoản Quản lý CHÍNH.");
            return;
        }
    }

    onAddUser({
      id: uuidv4(),
      fullName: newUser.fullName!,
      username: newUser.username!,
      role: newUser.role as 'school_admin' | 'unit_manager',
      email: newUser.email,
      isPrimary: newUser.isPrimary || false,
      managedUnitId: newUser.role === 'unit_manager' ? newUser.managedUnitId : undefined
    });

    // Reset form
    setNewUser({ fullName: '', username: '', role: 'unit_manager', email: '', isPrimary: false, managedUnitId: '' });
  };

  const togglePrimaryStatus = (userId: string) => {
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser) return;

      const newStatus = !targetUser.isPrimary;
      
      // If turning ON primary status
      if (newStatus) {
          // 1. If School Admin, disable other primary school admins
          if (targetUser.role === 'school_admin') {
              const updatedUsers = users.map(u => ({
                  ...u,
                  isPrimary: (u.id === userId)
              }));
              onUpdateUsers(updatedUsers);
          } 
          // 2. If Unit Manager, disable other primary managers FOR THIS UNIT
          else if (targetUser.role === 'unit_manager' && targetUser.managedUnitId) {
              const updatedUsers = users.map(u => {
                  if (u.role === 'unit_manager' && u.managedUnitId === targetUser.managedUnitId) {
                      return { ...u, isPrimary: (u.id === userId) };
                  }
                  return u;
              });
              onUpdateUsers(updatedUsers);
          }
      } else {
          // Just turn off
          const updatedUsers = users.map(u => u.id === userId ? { ...u, isPrimary: false } : u);
          onUpdateUsers(updatedUsers);
      }
  };

  return (
    <div className="space-y-8">
       <div>
           <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Thêm người dùng mới</h3>
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Line 1: Basic Info */}
               <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Tên đăng nhập (Hệ thống)</label>
                   <input 
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      placeholder="user123"
                   />
               </div>
               <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Họ và tên hiển thị</label>
                   <input 
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                      placeholder="Nguyễn Văn A"
                   />
               </div>

               {/* Line 2: Google Email & Role */}
               <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                       <Mail size={12}/> Email Google (để định danh Drive)
                   </label>
                   <input 
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      placeholder="example@gmail.com"
                   />
               </div>
               <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Vai trò</label>
                   <select 
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                   >
                       <option value="unit_manager">Quản lý Cấp Đơn vị</option>
                       <option value="school_admin">Quản lý Cấp Trường (Admin)</option>
                   </select>
               </div>

               {/* Line 3: Context specific config */}
               {newUser.role === 'unit_manager' && (
                   <div className="md:col-span-2">
                       <label className="block text-xs font-semibold text-slate-500 mb-1">Đơn vị quản lý</label>
                       <select 
                          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newUser.managedUnitId}
                          onChange={(e) => setNewUser({...newUser, managedUnitId: e.target.value})}
                       >
                           <option value="">-- Chọn đơn vị --</option>
                           {units.map(u => (
                               <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                           ))}
                       </select>
                   </div>
               )}

               {/* Line 4: Primary & Action */}
               <div className="md:col-span-2 flex justify-between items-center pt-2">
                   <label className="flex items-center cursor-pointer">
                       <input 
                           type="checkbox" 
                           className="w-4 h-4 text-blue-600 rounded"
                           checked={newUser.isPrimary}
                           onChange={(e) => setNewUser({...newUser, isPrimary: e.target.checked})}
                       />
                       <span className="ml-2 text-sm font-bold text-slate-700 flex items-center gap-1">
                           <Crown size={14} className={newUser.isPrimary ? "text-amber-500" : "text-slate-400"} />
                           Đặt làm Tài khoản CHÍNH (Quản lý Drive)
                       </span>
                   </label>
                   <button 
                      onClick={handleAddUser}
                      disabled={!newUser.username || !newUser.fullName || (newUser.role === 'unit_manager' && !newUser.managedUnitId)}
                      className={`px-6 py-2 rounded text-sm font-bold text-white transition-colors ${(!newUser.username || !newUser.fullName) ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
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
                           <th className="px-4 py-3 w-10"></th>
                           <th className="px-4 py-3">User / Email</th>
                           <th className="px-4 py-3">Họ tên</th>
                           <th className="px-4 py-3">Vai trò</th>
                           <th className="px-4 py-3 text-right">Thao tác</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                       {users.map(user => (
                           <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                               <td className="px-4 py-3 text-center">
                                   <button 
                                       onClick={() => togglePrimaryStatus(user.id)}
                                       className={`p-1 rounded-full ${user.isPrimary ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-200' : 'text-slate-300 hover:bg-slate-200'}`}
                                       title={user.isPrimary ? "Đây là tài khoản chính quản lý Drive" : "Đặt làm tài khoản chính"}
                                   >
                                       <Crown size={16} fill={user.isPrimary ? "currentColor" : "none"}/>
                                   </button>
                               </td>
                               <td className="px-4 py-3">
                                   <div className="font-mono text-slate-600">{user.username}</div>
                                   <div className="text-xs text-slate-400">{user.email || '(No Email)'}</div>
                               </td>
                               <td className="px-4 py-3 font-medium text-slate-800">{user.fullName}</td>
                               <td className="px-4 py-3">
                                   {user.role === 'school_admin' ? (
                                       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                           <Shield size={10}/> CẤP TRƯỜNG
                                       </span>
                                   ) : (
                                       <div className="flex flex-col items-start">
                                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                               <Building size={10}/> CẤP ĐƠN VỊ
                                           </span>
                                           <span className="text-[10px] text-slate-500 mt-1 pl-1">
                                               {units.find(u => u.unit_id === user.managedUnitId)?.unit_name || 'Unknown Unit'}
                                           </span>
                                       </div>
                                   )}
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
                               <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Chưa có người dùng nào.</td>
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