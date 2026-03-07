import React, { useState, useMemo } from 'react';
import { UserProfile, HumanResourceRecord, Faculty, Unit } from '../../types';
import { Search, Shield, Building, User, Crown, AlertCircle, Trash2 } from 'lucide-react';

interface RolesModuleProps {
  users: UserProfile[];
  onUpdateUsers: (users: UserProfile[]) => void;
  humanResources: HumanResourceRecord[];
  faculties: Faculty[];
  units: Unit[];
  currentUser?: UserProfile;
}

const RolesModule: React.FC<RolesModuleProps> = ({ users, onUpdateUsers, humanResources, faculties, units, currentUser }) => {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- LOGIC HELPERS ---
  const isSchoolAdmin = currentUser?.role === 'school_admin' && currentUser.isPrimary;
  const isUnitManager = currentUser?.role === 'unit_manager' && currentUser.isPrimary;

  // Filter Units based on permission
  const allowedUnits = useMemo(() => {
      if (isSchoolAdmin) return units;
      if (isUnitManager && currentUser?.managedUnitId) {
          // Unit Manager can only see their unit and children
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

  const availablePersonnel = useMemo(() => {
    return humanResources.map(hr => {
      const f = faculties.find(fac => fac.id === hr.facultyId);
      const u = units.find(un => un.unit_id === hr.unitId);
      return {
        email: f?.email || '',
        name: f?.name.vi || 'Unknown',
        unit: u?.unit_name || 'Unknown',
        unitId: u?.unit_id
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

  const handleAddUser = (person: { email: string; name: string, unitId?: string }) => {
    if (users.find(u => u.email === person.email)) return;
    
    // Default to Unit Manager of their current unit if allowed, otherwise just Unit Manager without unit
    const defaultUnitId = person.unitId && allowedUnits.some(u => u.unit_id === person.unitId) ? person.unitId : '';

    const newUser: UserProfile = {
      id: `user_${Date.now()}`,
      fullName: person.name,
      email: person.email,
      role: 'unit_manager',
      isPrimary: false,
      managedUnitId: defaultUnitId,
      permissions: {
        canEditDataConfig: false,
        canEditOrgStructure: false,
        canProposeEditProcess: false
      }
    };
    onUpdateUsers([...users, newUser]);
    setSelectedUser(newUser); // Select the newly added user
    setSearchTerm(''); // Clear search
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
      const newUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
      onUpdateUsers(newUsers);
      setSelectedUser(updatedUser);
  };

  const handleRemoveUser = (userId: string) => {
      if (window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
          onUpdateUsers(users.filter(u => u.id !== userId));
          if (selectedUser?.id === userId) setSelectedUser(null);
      }
  };

  // Determine if Primary Checkbox should be enabled/defaulted
  const canSetPrimary = useMemo(() => {
      if (!selectedUser) return false;
      if (!currentUser?.isPrimary) return false; // Only Primary users can set Primary status

      if (selectedUser.role === 'school_admin') {
          // Check if there is already a primary school admin (excluding self if editing)
          const hasPrimaryAdmin = users.some(u => u.role === 'school_admin' && u.isPrimary && u.id !== selectedUser.id);
          return !hasPrimaryAdmin; 
      }
      
      if (selectedUser.role === 'unit_manager') {
          if (isSchoolAdmin) return true; // School Admin can set Primary for any Unit Manager
          if (isUnitManager) {
              // Unit Manager can set Primary for their child units
              if (selectedUser.managedUnitId === currentUser?.managedUnitId) return false; // Cannot change own unit's primary status (unless self, but logic handles that)
              
              // Check if target unit already has a primary manager
              const hasPrimaryManager = users.some(u => u.role === 'unit_manager' && u.managedUnitId === selectedUser.managedUnitId && u.isPrimary && u.id !== selectedUser.id);
              return !hasPrimaryManager;
          }
      }
      return false;
  }, [selectedUser, users, isSchoolAdmin, isUnitManager, currentUser]);

  const showPrimaryOption = useMemo(() => {
      if (!selectedUser) return false;
      // Show if user is Primary OR if no Primary exists for the target level (allowing self-claim or first-time setup)
      if (currentUser?.isPrimary) return true;

      // Special Case: Self-claim if no primary exists
      if (selectedUser.id === currentUser?.id) {
          if (selectedUser.role === 'school_admin') {
               const hasPrimaryAdmin = users.some(u => u.role === 'school_admin' && u.isPrimary);
               return !hasPrimaryAdmin;
          }
          if (selectedUser.role === 'unit_manager' && selectedUser.managedUnitId) {
               const hasPrimaryManager = users.some(u => u.role === 'unit_manager' && u.managedUnitId === selectedUser.managedUnitId && u.isPrimary);
               return !hasPrimaryManager;
          }
      }
      
      return false;
  }, [selectedUser, currentUser, users]);

  const canGrantPermission = (perm: keyof NonNullable<UserProfile['permissions']>) => {
      if (isSchoolAdmin) return true;
      return currentUser?.permissions?.[perm] === true;
  };

  return (
    <div className="p-6 grid grid-cols-3 gap-6 h-full">
      {/* Left Column: Search & List */}
      <div className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-full">
        <h3 className="font-bold text-slate-800 mb-4">Danh sách người dùng</h3>
        
        {/* Search Box */}
        <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              placeholder="Tìm kiếm nhân sự để thêm..."
              className="w-full pl-9 p-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Search Results */}
        {searchTerm && (
            <div className="mb-4 max-h-40 overflow-y-auto border border-slate-100 rounded bg-slate-50">
                {filteredPersonnel.length === 0 ? (
                    <div className="p-2 text-xs text-slate-400 text-center">Không tìm thấy nhân sự.</div>
                ) : (
                    filteredPersonnel.map((p, i) => {
                        const isAdded = users.some(u => u.email === p.email);
                        return (
                            <div key={i} className="p-2 border-b border-slate-100 last:border-0 hover:bg-white cursor-pointer flex justify-between items-center group" onClick={() => !isAdded && handleAddUser(p)}>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold truncate">{p.name}</div>
                                    <div className="text-xs text-slate-500 truncate">{p.email}</div>
                                    <div className="text-[10px] text-slate-400 truncate">{p.unit}</div>
                                </div>
                                {isAdded ? (
                                    <span className="text-xs text-green-600 font-bold px-2">Đã thêm</span>
                                ) : (
                                    <button className="text-blue-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Thêm</button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        )}

        {/* User List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 sticky top-0 bg-white py-1">Đã là User ({users.length})</h4>
          {users.map(u => (
              <div 
                key={u.id} 
                className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedUser?.id === u.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'border-transparent hover:bg-slate-50'}`} 
                onClick={() => setSelectedUser(u)}
              >
                  <div className="flex justify-between items-start">
                      <div>
                          <div className="text-sm font-bold text-slate-800">{u.fullName}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                      {u.isPrimary && <Crown size={14} className="text-amber-500 fill-current" />}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${u.role === 'school_admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                          {u.role === 'school_admin' ? 'Cấp Trường' : 'Cấp Đơn vị'}
                      </span>
                      {u.role === 'unit_manager' && u.managedUnitId && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                              {units.find(unit => unit.unit_id === u.managedUnitId)?.unit_name}
                          </span>
                      )}
                  </div>
              </div>
          ))}
        </div>
      </div>

      {/* Right Column: Configuration */}
      <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
        {selectedUser ? (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                <div>
                    <h3 className="font-bold text-xl text-slate-800">{selectedUser.fullName}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                        <User size={14}/> {selectedUser.email}
                    </p>
                </div>
                <button 
                    onClick={() => handleRemoveUser(selectedUser.id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                    title="Xóa người dùng"
                >
                    <Trash2 size={18} />
                </button>
            </div>
            
            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {/* Role Configuration */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                    <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                        <Shield size={16}/> Vai trò & Vị trí
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Vai trò</label>
                            <select 
                                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                                value={selectedUser.role}
                                onChange={(e) => handleUpdateUser({...selectedUser, role: e.target.value as any, managedUnitId: e.target.value === 'school_admin' ? undefined : selectedUser.managedUnitId})}
                                disabled={!isSchoolAdmin} // Only School Admin can change roles freely
                            >
                                <option value="unit_manager">Quản lý Cấp Đơn vị</option>
                                {isSchoolAdmin && <option value="school_admin">Quản lý Cấp Trường (Admin)</option>}
                            </select>
                        </div>

                        {selectedUser.role === 'unit_manager' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Đơn vị quản lý</label>
                                <select 
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedUser.managedUnitId || ''}
                                    onChange={(e) => handleUpdateUser({...selectedUser, managedUnitId: e.target.value})}
                                >
                                    <option value="">-- Chọn đơn vị --</option>
                                    {allowedUnits.map(u => (
                                        <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {showPrimaryOption && (
                        <div className="pt-2 border-t border-slate-200 mt-2">
                            <label className={`flex items-center ${!canSetPrimary ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-blue-600 rounded"
                                    checked={selectedUser.isPrimary}
                                    onChange={(e) => canSetPrimary && handleUpdateUser({...selectedUser, isPrimary: e.target.checked})}
                                    disabled={!canSetPrimary}
                                />
                                <span className="ml-2 text-sm font-bold text-slate-700 flex items-center gap-1">
                                    <Crown size={14} className={selectedUser.isPrimary ? "text-amber-500 fill-current" : "text-slate-400"} />
                                    Đặt làm Tài khoản CHÍNH (Quản lý Drive)
                                </span>
                            </label>
                            {!canSetPrimary && (
                                <p className="text-[10px] text-slate-400 ml-6 mt-1 italic">
                                    (Bạn không có quyền thay đổi trạng thái này hoặc trạng thái này bị khóa theo quy tắc hệ thống)
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Permissions */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                    <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                        <AlertCircle size={16}/> Phân quyền chi tiết
                    </h4>
                    
                    <div className="space-y-3">
                        {canGrantPermission('canProposeEditProcess') && (
                            <label className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:bg-slate-50 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={selectedUser.permissions?.canProposeEditProcess || false} 
                                    onChange={e => handleUpdateUser({
                                        ...selectedUser, 
                                        permissions: { ...selectedUser.permissions, canProposeEditProcess: e.target.checked }
                                    })} 
                                />
                                <div>
                                    <span className="text-sm font-medium block">Đề xuất - Chỉnh sửa quy trình</span>
                                    <span className="text-xs text-slate-500">Cho phép người dùng đề xuất thay đổi hoặc chỉnh sửa các quy trình ISO.</span>
                                </div>
                            </label>
                        )}

                        {canGrantPermission('canEditDataConfig') && (
                            <label className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:bg-slate-50 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={selectedUser.permissions?.canEditDataConfig || false} 
                                    onChange={e => handleUpdateUser({
                                        ...selectedUser, 
                                        permissions: { ...selectedUser.permissions, canEditDataConfig: e.target.checked }
                                    })} 
                                />
                                <div>
                                    <span className="text-sm font-medium block">Cấu hình dữ liệu (Data Config)</span>
                                    <span className="text-xs text-slate-500">Cho phép chỉnh sửa cấu trúc dữ liệu, thêm trường mới.</span>
                                </div>
                            </label>
                        )}

                        {canGrantPermission('canEditOrgStructure') && (
                            <label className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:bg-slate-50 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={selectedUser.permissions?.canEditOrgStructure || false} 
                                    onChange={e => handleUpdateUser({
                                        ...selectedUser, 
                                        permissions: { ...selectedUser.permissions, canEditOrgStructure: e.target.checked }
                                    })} 
                                />
                                <div>
                                    <span className="text-sm font-medium block">Chỉnh sửa Cấu trúc tổ chức</span>
                                    <span className="text-xs text-slate-500">Cho phép thêm/sửa/xóa các đơn vị, phòng ban trong hệ thống.</span>
                                </div>
                            </label>
                        )}
                    </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <User size={48} className="mb-4 opacity-20"/>
              <p>Chọn một người dùng để phân quyền</p>
              <p className="text-xs mt-2">Hoặc tìm kiếm nhân sự để thêm mới</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RolesModule;
