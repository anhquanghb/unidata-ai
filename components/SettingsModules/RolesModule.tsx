import React, { useState, useMemo } from 'react';
import { UserProfile, HumanResourceRecord, Faculty, Unit } from '../../types';
import { Search, Shield, Building, User } from 'lucide-react';

interface RolesModuleProps {
  users: UserProfile[];
  onUpdateUsers: (users: UserProfile[]) => void;
  humanResources: HumanResourceRecord[];
  faculties: Faculty[];
  units: Unit[];
}

const RolesModule: React.FC<RolesModuleProps> = ({ users, onUpdateUsers, humanResources, faculties, units }) => {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const availablePersonnel = useMemo(() => {
    return humanResources.map(hr => {
      const f = faculties.find(fac => fac.id === hr.facultyId);
      const u = units.find(un => un.unit_id === hr.unitId);
      return {
        email: f?.email || '',
        name: f?.name.vi || 'Unknown',
        unit: u?.unit_name || 'Unknown'
      };
    }).filter(p => p.email);
  }, [humanResources, faculties, units]);

  const filteredPersonnel = useMemo(() => {
    if (!searchTerm) return [];
    return availablePersonnel.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availablePersonnel, searchTerm]);

  const handleAddUser = (person: { email: string; name: string }) => {
    if (users.find(u => u.email === person.email)) return;
    const newUser: UserProfile = {
      id: `user_${Date.now()}`,
      fullName: person.name,
      email: person.email,
      role: 'unit_manager',
      isPrimary: false,
      permissions: {
        canEditDataConfig: false,
        canEditOrgStructure: false,
        canProposeEditProcess: false
      }
    };
    onUpdateUsers([...users, newUser]);
    setSelectedUser(newUser); // Select the newly added user
  };

  const updatePermissions = (userId: string, newPermissions: UserProfile['permissions']) => {
    onUpdateUsers(users.map(u => u.id === userId ? { ...u, permissions: newPermissions } : u));
    // Update selectedUser state to reflect changes
    if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? {...prev, permissions: newPermissions} : null);
    }
  };

  return (
    <div className="p-6 grid grid-cols-3 gap-6 h-full">
      {/* User List */}
      <div className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col">
        <h3 className="font-bold text-slate-800 mb-4">Danh sách người dùng</h3>
        <input 
          placeholder="Tìm kiếm nhân sự..."
          className="w-full p-2 border border-slate-300 rounded mb-4 text-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <div className="flex-1 overflow-y-auto space-y-2">
          {searchTerm && filteredPersonnel.map((p, i) => (
            <div key={i} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer flex justify-between items-center" onClick={() => handleAddUser(p)}>
              <div>
                <div className="text-sm font-bold">{p.name}</div>
                <div className="text-xs text-slate-500">{p.email}</div>
              </div>
              {!users.find(u => u.email === p.email) && <button className="text-blue-600 text-xs font-bold">Thêm</button>}
            </div>
          ))}
          
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Đã là User</h4>
            {users.map(u => (
                <div key={u.id} className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${selectedUser?.id === u.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`} onClick={() => setSelectedUser(u)}>
                    <div>
                        <div className="text-sm font-bold">{u.fullName}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                </div>
            ))}
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {selectedUser ? (
          <div>
            <h3 className="font-bold text-lg text-slate-800 mb-1">{selectedUser.fullName}</h3>
            <p className="text-sm text-slate-500 mb-6">{selectedUser.email}</p>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50">
                <input type="checkbox" checked={selectedUser.permissions.canProposeEditProcess} onChange={e => updatePermissions(selectedUser.id, {...selectedUser.permissions, canProposeEditProcess: e.target.checked})} />
                <span className="text-sm font-medium">Đề xuất - Chỉnh sửa quy trình</span>
              </label>
              {/* Add other permissions similarly */}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">Chọn một user để phân quyền</div>
        )}
      </div>
    </div>
  );
};

export default RolesModule;
