import React, { useState, useMemo } from 'react';
import { UserProfile, Unit } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { Mail, Edit, X } from 'lucide-react';

interface UserManagementModuleProps {
  users: UserProfile[];
  currentUser?: UserProfile;
  units: Unit[];
  onAddUser: (user: UserProfile) => void;
  onUpdateUsers: (users: UserProfile[]) => void;
  onRemoveUser: (id: string) => void;
}

const UserManagementModule: React.FC<UserManagementModuleProps> = ({ users, currentUser, units, onAddUser, onUpdateUsers, onRemoveUser }) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<Partial<UserProfile>>({ 
      fullName: '', 
      role: 'unit_manager',
      email: '',
      isPrimary: false,
      managedUnitId: '',
      permissions: {
        canEditDataConfig: false,
        canEditOrgStructure: false,
        canProposeEditProcess: false
      }
  });

  const isSchoolAdmin = currentUser?.role === 'school_admin' && currentUser.isPrimary;
  const isUnitManager = currentUser?.role === 'unit_manager' && currentUser.isPrimary;

  const allowedUnits = useMemo(() => {
      if (isSchoolAdmin) return units;
      if (isUnitManager && currentUser?.managedUnitId) {
          const getDescendants = (parentId: string): Unit[] => {
              const children = units.filter(u => u.unit_parentId === parentId);
              let all = [...children];
              children.forEach(child => {
                  all = [...all, ...getDescendants(child.unit_id)];
              });
              return all;
          };
          const self = units.find(u => u.unit_id === currentUser.managedUnitId);
          return self ? [self, ...getDescendants(self.unit_id)] : [];
      }
      return [];
  }, [units, currentUser, isSchoolAdmin, isUnitManager]);

  const handleAddUser = () => {
    if (!newUser.fullName || !newUser.email) return;
    
    if (newUser.role === 'school_admin' && newUser.isPrimary) {
        const otherAdmins = users.filter(u => u.role === 'school_admin' && u.isPrimary && u.id !== editingUserId);
        if (otherAdmins.length > 0) {
            alert("Đã có tài khoản Quản lý cấp trường CHÍNH.");
            return;
        }
    }

    if (editingUserId) {
        const updatedUsers = users.map(u => {
            if (u.id === editingUserId) {
                return {
                    ...u,
                    fullName: newUser.fullName!,
                    role: newUser.role as 'school_admin' | 'unit_manager',
                    email: newUser.email!,
                    isPrimary: newUser.isPrimary || false,
                    managedUnitId: newUser.role === 'unit_manager' ? newUser.managedUnitId : undefined,
                    permissions: newUser.permissions || u.permissions
                };
            }
            return u;
        });
        onUpdateUsers(updatedUsers);
        handleCancelEdit();
    } else {
        onAddUser({
            id: uuidv4(),
            fullName: newUser.fullName!,
            role: newUser.role as 'school_admin' | 'unit_manager',
            email: newUser.email!,
            isPrimary: newUser.isPrimary || false,
            managedUnitId: newUser.role === 'unit_manager' ? newUser.managedUnitId : undefined,
            permissions: newUser.permissions || {
              canEditDataConfig: false,
              canEditOrgStructure: false,
              canProposeEditProcess: false
            }
        });
        setNewUser({ fullName: '', role: 'unit_manager', email: '', isPrimary: false, managedUnitId: '', permissions: { canEditDataConfig: false, canEditOrgStructure: false, canProposeEditProcess: false } });
    }
  };

  const handleEditUser = (user: UserProfile) => {
      setEditingUserId(user.id);
      setNewUser({
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          isPrimary: user.isPrimary,
          managedUnitId: user.managedUnitId,
          permissions: user.permissions
      });
  };

  const handleCancelEdit = () => {
      setEditingUserId(null);
      setNewUser({ fullName: '', role: 'unit_manager', email: '', isPrimary: false, managedUnitId: '', permissions: { canEditDataConfig: false, canEditOrgStructure: false, canProposeEditProcess: false } });
  };

  return (
    <div className="space-y-8">
       {(isSchoolAdmin || isUnitManager) && (
       <div>
           <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">
               {editingUserId ? 'Chỉnh sửa thông tin người dùng' : 'Thêm người dùng mới'}
           </h3>
           <div className={`p-4 rounded-lg border grid grid-cols-1 md:grid-cols-2 gap-4 ${editingUserId ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
               <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1">Họ và tên hiển thị</label>
                   <input 
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                      placeholder="Nguyễn Văn A"
                   />
               </div>
               <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                       <Mail size={12}/> Email Google
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
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                      disabled={isUnitManager}
                   >
                       <option value="unit_manager">Quản lý Cấp Đơn vị</option>
                       {isSchoolAdmin && <option value="school_admin">Quản lý Cấp Trường (Admin)</option>}
                   </select>
               </div>
               {newUser.role === 'unit_manager' && (
                   <div>
                       <label className="block text-xs font-semibold text-slate-500 mb-1">Đơn vị quản lý</label>
                       <select 
                          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newUser.managedUnitId}
                          onChange={(e) => setNewUser({...newUser, managedUnitId: e.target.value})}
                       >
                           <option value="">-- Chọn đơn vị --</option>
                           {allowedUnits.map(u => (
                               <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                           ))}
                       </select>
                   </div>
               )}
               <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                   {editingUserId && (
                       <button 
                           onClick={handleCancelEdit}
                           className="px-4 py-2 rounded text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                       >
                           Hủy
                       </button>
                   )}
                   <button 
                      onClick={handleAddUser}
                      disabled={!newUser.fullName || !newUser.email || (newUser.role === 'unit_manager' && !newUser.managedUnitId)}
                      className={`px-6 py-2 rounded text-sm font-bold text-white transition-colors ${(!newUser.fullName || !newUser.email) ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                   >
                       {editingUserId ? 'Lưu thay đổi' : 'Thêm User'}
                   </button>
               </div>
           </div>
       </div>
       )}

       <div>
           <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wide">Danh sách người dùng</h3>
           <div className="overflow-hidden border border-slate-200 rounded-lg">
               <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-700 font-semibold">
                       <tr>
                           <th className="px-4 py-3">Email</th>
                           <th className="px-4 py-3">Họ tên</th>
                           <th className="px-4 py-3">Vai trò</th>
                           <th className="px-4 py-3 text-right">Thao tác</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                       {users.map(user => (
                           <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                               <td className="px-4 py-3 font-mono text-slate-600">{user.email}</td>
                               <td className="px-4 py-3 font-medium text-slate-800">{user.fullName}</td>
                               <td className="px-4 py-3">
                                   {user.role === 'school_admin' ? 'Admin' : 'Manager'}
                               </td>
                               <td className="px-4 py-3 text-right">
                                   <button onClick={() => handleEditUser(user)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">Sửa</button>
                                   <button onClick={() => onRemoveUser(user.id)} className="text-red-400 hover:text-red-600 text-xs font-medium ml-2">Xóa</button>
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
