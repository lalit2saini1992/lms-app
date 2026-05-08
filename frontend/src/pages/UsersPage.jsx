import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../api';
import { roleColors } from '../utils/helpers';
import toast from 'react-hot-toast';

const PERMISSIONS = [
  { key: 'canAddLead',              label: 'Add Lead',              icon: '➕' },
  { key: 'canEditLead',             label: 'Edit Lead',             icon: '✏️' },
  { key: 'canDeleteLead',           label: 'Delete Lead',           icon: '🗑️' },
  { key: 'canAssignLead',           label: 'Assign Lead',           icon: '👤' },
  { key: 'canImportLead',           label: 'Import Leads',          icon: '📥' },
  { key: 'canViewReports',          label: 'View Reports',          icon: '📊' },
  { key: 'canManageUsers',          label: 'Manage Users',          icon: '👥' },
  { key: 'canManageFollowupTypes',  label: 'Manage Follow-up Types',icon: '🏷️' },
];

const defaultPerms = {
  canAddLead: false, canEditLead: false, canDeleteLead: false,
  canAssignLead: false, canImportLead: false, canViewReports: false,
  canManageUsers: false, canManageFollowupTypes: false,
};

const roleDefaults = {
  superadmin: { canAddLead:true,canEditLead:true,canDeleteLead:true,canAssignLead:true,canImportLead:true,canViewReports:true,canManageUsers:true,canManageFollowupTypes:true },
  admin:      { canAddLead:true,canEditLead:true,canDeleteLead:true,canAssignLead:true,canImportLead:true,canViewReports:true,canManageUsers:true,canManageFollowupTypes:true },
  manager:    { canAddLead:true,canEditLead:true,canDeleteLead:false,canAssignLead:true,canImportLead:true,canViewReports:true,canManageUsers:false,canManageFollowupTypes:false },
  employee:   { ...defaultPerms },
};

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="toggle-track flex-shrink-0"
    style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--border-input)' }}
  >
    <span className="toggle-thumb" style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
  </button>
);

const initialForm = { name: '', email: '', password: '', phone: '', role: 'employee', permissions: { ...defaultPerms } };

export default function UsersPage() {
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(initialForm);
  const [editId, setEditId]         = useState(null);
  const [activeTab, setActiveTab]   = useState('info'); // 'info' | 'permissions'
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.getAll().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => usersAPI.create(d),
    onSuccess: () => { toast.success('User created'); qc.invalidateQueries(['users']); closeModal(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries(['users']); closeModal(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => usersAPI.delete(id),
    onSuccess: () => { toast.success('User deactivated'); qc.invalidateQueries(['users']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const users = data?.users || [];

  const openModal = (user = null) => {
    if (user) {
      setEditId(user._id);
      setForm({ name: user.name, email: user.email, password: '', phone: user.phone || '', role: user.role, permissions: { ...defaultPerms, ...user.permissions } });
    } else {
      setEditId(null);
      setForm(initialForm);
    }
    setActiveTab('info');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditId(null); setForm(initialForm); };

  // When role changes, auto-fill default permissions
  const handleRoleChange = (role) => {
    setForm(f => ({ ...f, role, permissions: { ...roleDefaults[role] } }));
  };

  const handlePermToggle = (key, val) => {
    setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: val } }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editId) {
      updateMutation.mutate({ id: editId, data: { name: form.name, phone: form.phone, role: form.role, permissions: form.permissions } });
    } else {
      if (!form.password || form.password.length < 6) return toast.error('Password min 6 characters');
      createMutation.mutate(form);
    }
  };

  const permCount = Object.values(form.permissions).filter(Boolean).length;

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Users</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{users.length} total users</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => openModal()}>+ Add User</button>
      </div>

      {/* User Cards */}
      {isLoading ? (
        <div className="p-12 text-center card">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((u) => {
            const permsOn = Object.values(u.permissions || {}).filter(Boolean).length;
            return (
              <div key={u._id} className="card hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                    {u.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                      <span className={`badge text-xs capitalize ${roleColors[u.role]}`}>{u.role}</span>
                      {!u.isActive && <span className="badge bg-red-100 text-red-600 text-xs">Inactive</span>}
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                    {u.phone && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.phone}</p>}
                  </div>
                </div>

                {/* Permissions summary */}
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Permissions</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                      style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                      {permsOn}/{PERMISSIONS.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {PERMISSIONS.map(p => (
                      <span key={p.key}
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                        style={{
                          backgroundColor: u.permissions?.[p.key] ? 'var(--accent-light)' : 'var(--bg-card2)',
                          color: u.permissions?.[p.key] ? 'var(--accent)' : 'var(--text-muted)',
                        }}>
                        {p.icon} {p.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={() => openModal(u)} className="btn-secondary text-xs flex-1 py-1.5">✏️ Edit</button>
                  {u.isActive && (
                    <button
                      onClick={() => { if (window.confirm(`Deactivate ${u.name}?`)) deleteMutation.mutate(u._id); }}
                      className="btn-danger text-xs flex-1 py-1.5">
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 sm:hidden" style={{ backgroundColor: 'var(--border)' }} />

            {/* Modal header */}
            <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editId ? 'Edit User' : 'Add New User'}
              </h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {editId ? 'Update user info and permissions' : 'Create a new user account'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex px-6 pt-4 gap-1">
              {['info', 'permissions'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize"
                  style={{
                    backgroundColor: activeTab === tab ? 'var(--accent-light)' : 'transparent',
                    color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                  {tab === 'info' ? '👤 Info' : `🔐 Permissions (${permCount})`}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">

                {/* Info Tab */}
                {activeTab === 'info' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--text-muted)' }}>Full Name *</label>
                      <input className="input" placeholder="John Doe"
                        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--text-muted)' }}>Email *</label>
                      <input type="email" className="input" placeholder="john@company.com"
                        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                        required disabled={!!editId} />
                    </div>
                    {!editId && (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                          style={{ color: 'var(--text-muted)' }}>Password *</label>
                        <input type="password" className="input" placeholder="Min 6 characters"
                          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--text-muted)' }}>Phone</label>
                      <input className="input" placeholder="9876543210"
                        value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--text-muted)' }}>Role *</label>
                      <select className="input" value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                        <option value="employee">Employee / Telecaller</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                      <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                        Role change auto-fills default permissions. You can customize in Permissions tab.
                      </p>
                    </div>
                  </>
                )}

                {/* Permissions Tab */}
                {activeTab === 'permissions' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Custom Permissions
                      </p>
                      <div className="flex gap-2">
                        <button type="button" className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                          onClick={() => setForm(f => ({ ...f, permissions: Object.fromEntries(PERMISSIONS.map(p => [p.key, true])) }))}>
                          All On
                        </button>
                        <button type="button" className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                          style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                          onClick={() => setForm(f => ({ ...f, permissions: { ...defaultPerms } }))}>
                          All Off
                        </button>
                      </div>
                    </div>
                    {PERMISSIONS.map(p => (
                      <div key={p.key}
                        className="flex items-center justify-between p-3 rounded-xl transition-all"
                        style={{ backgroundColor: form.permissions[p.key] ? 'var(--accent-light)' : 'var(--bg-card2)' }}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{p.icon}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.label}</span>
                        </div>
                        <Toggle
                          checked={!!form.permissions[p.key]}
                          onChange={(val) => handlePermToggle(p.key, val)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button type="submit" className="btn-primary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editId ? 'Update User' : 'Create User'}
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
