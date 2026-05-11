import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesAPI } from '../api';
import toast from 'react-hot-toast';

const PERMISSIONS = [
  { key: 'canAddLead',             label: 'Add Lead',               icon: '➕' },
  { key: 'canEditLead',            label: 'Edit Lead',              icon: '✏️' },
  { key: 'canDeleteLead',          label: 'Delete Lead',            icon: '🗑️' },
  { key: 'canAssignLead',          label: 'Assign Lead',            icon: '👤' },
  { key: 'canImportLead',          label: 'Import Leads',           icon: '📥' },
  { key: 'canViewReports',         label: 'View Reports',           icon: '📊' },
  { key: 'canManageUsers',         label: 'Manage Users',           icon: '👥' },
  { key: 'canManageFollowupTypes', label: 'Manage Follow-up Types', icon: '🏷️' },
];

const defaultPerms = Object.fromEntries(PERMISSIONS.map(p => [p.key, false]));

const Toggle = ({ checked, onChange, disabled }) => (
  <button type="button" onClick={() => !disabled && onChange(!checked)}
    className="toggle-track flex-shrink-0"
    style={{
      backgroundColor: checked ? 'var(--accent)' : 'var(--border-input)',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}>
    <span className="toggle-thumb" style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
  </button>
);

const roleColors = {
  superadmin: 'bg-red-100 text-red-700',
  admin:      'bg-violet-100 text-violet-700',
  manager:    'bg-blue-100 text-blue-700',
  employee:   'bg-emerald-100 text-emerald-700',
  custom:     'bg-amber-100 text-amber-700',
};

export default function RolesPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ label: '', permissions: { ...defaultPerms } });
  const [editId, setEditId]       = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesAPI.getAll().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => rolesAPI.create(d),
    onSuccess: () => { toast.success('Role created!'); qc.invalidateQueries(['roles']); closeModal(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => rolesAPI.update(id, data),
    onSuccess: () => { toast.success('Role updated!'); qc.invalidateQueries(['roles']); closeModal(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => rolesAPI.delete(id),
    onSuccess: () => { toast.success('Role deleted'); qc.invalidateQueries(['roles']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const roles = data?.roles || [];

  const openModal = (role = null) => {
    if (role) {
      setEditId(role._id);
      setForm({ label: role.label, permissions: { ...defaultPerms, ...role.permissions } });
    } else {
      setEditId(null);
      setForm({ label: '', permissions: { ...defaultPerms } });
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditId(null); setForm({ label: '', permissions: { ...defaultPerms } }); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.label.trim()) return toast.error('Role name is required');
    if (editId) updateMutation.mutate({ id: editId, data: form });
    else createMutation.mutate(form);
  };

  const togglePerm = (key, val) => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: val } }));
  const permCount = (perms) => Object.values(perms || {}).filter(Boolean).length;

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Roles & Permissions</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Manage roles dynamically — system roles are protected
          </p>
        </div>
        <button className="btn-primary text-sm" onClick={() => openModal()}>+ Add Role</button>
      </div>

      {isLoading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map((role) => {
            const pc = permCount(role.permissions);
            return (
              <div key={role._id} className="card hover:shadow-md transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white' }}>
                      {role.label[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{role.label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`badge text-[10px] capitalize ${role.isSystem ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                          {role.isSystem ? '🔒 System' : '✨ Custom'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                    {pc}/{PERMISSIONS.length}
                  </span>
                </div>

                {/* Permissions */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {PERMISSIONS.map(p => (
                    <span key={p.key}
                      className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                      style={{
                        backgroundColor: role.permissions?.[p.key] ? 'var(--accent-light)' : 'var(--bg-card2)',
                        color: role.permissions?.[p.key] ? 'var(--accent)' : 'var(--text-muted)',
                      }}>
                      {p.icon} {p.label}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => openModal(role)}
                    className="btn-secondary text-xs flex-1 py-1.5">
                    ✏️ Edit
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => { if (window.confirm(`Delete role "${role.label}"?`)) deleteMutation.mutate(role._id); }}
                      className="btn-danger text-xs flex-1 py-1.5">
                      🗑️ Delete
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
        <div className="modal-overlay">
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 sm:hidden" style={{ backgroundColor: 'var(--border)' }} />

            <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editId ? 'Edit Role' : 'Create New Role'}
              </h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Set role name and assign permissions
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {/* Role Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--text-muted)' }}>Role Name *</label>
                  <input className="input" placeholder="e.g. Telecaller, Team Lead, Sales Manager"
                    value={form.label}
                    onChange={e => setForm({ ...form, label: e.target.value })}
                    required />
                </div>

                {/* Permissions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}>
                      Permissions ({permCount(form.permissions)}/{PERMISSIONS.length})
                    </label>
                    <div className="flex gap-2">
                      <button type="button"
                        className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                        style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                        onClick={() => setForm(f => ({ ...f, permissions: Object.fromEntries(PERMISSIONS.map(p => [p.key, true])) }))}>
                        All On
                      </button>
                      <button type="button"
                        className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                        style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                        onClick={() => setForm(f => ({ ...f, permissions: { ...defaultPerms } }))}>
                        All Off
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
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
                          onChange={(val) => togglePerm(p.key, val)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button type="submit" className="btn-primary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editId ? 'Update Role' : 'Create Role'}
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
