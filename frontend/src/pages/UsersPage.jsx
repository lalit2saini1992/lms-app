import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI, orgsAPI, authAPI } from '../api';
import useAuthStore from '../store/authStore';
import { roleColors, formatDate, statusColors, statusLabels } from '../utils/helpers';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

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

// Extra permission only superadmin can grant
const SUPERADMIN_ONLY_PERMISSIONS = [
  { key: 'canManageOrganizations', label: 'Manage Organizations', icon: '🏢' },
];

const defaultPerms = {
  canAddLead: false, canEditLead: false, canDeleteLead: false,
  canAssignLead: false, canImportLead: false, canViewReports: false,
  canManageUsers: false, canManageFollowupTypes: false,
  canManageOrganizations: false,
};

const roleDefaults = {
  superadmin: { canAddLead:true,canEditLead:true,canDeleteLead:true,canAssignLead:true,canImportLead:true,canViewReports:true,canManageUsers:true,canManageFollowupTypes:true,canManageOrganizations:true },
  admin:      { canAddLead:true,canEditLead:true,canDeleteLead:true,canAssignLead:true,canImportLead:true,canViewReports:true,canManageUsers:true,canManageFollowupTypes:true,canManageOrganizations:false },
  manager:    { canAddLead:true,canEditLead:true,canDeleteLead:false,canAssignLead:true,canImportLead:true,canViewReports:true,canManageUsers:false,canManageFollowupTypes:false,canManageOrganizations:false },
  employee:   { ...defaultPerms },
};

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    className="toggle-track flex-shrink-0"
    style={{
      backgroundColor: checked ? 'var(--accent)' : 'var(--border-input)',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
  >
    <span className="toggle-thumb" style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
  </button>
);

const initialForm = { name: '', email: '', password: '', phone: '', role: 'employee', permissions: { ...defaultPerms }, orgId: '' };

export default function UsersPage() {
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(initialForm);
  const [editId, setEditId]         = useState(null);
  const [activeTab, setActiveTab]   = useState('info');
  const [orgFilter, setOrgFilter]   = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  // Superadmin main tabs
  const [mainTab, setMainTab]       = useState('users'); // 'users' | 'organizations'
  // Org detail panel
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgDetailTab, setOrgDetailTab] = useState('overview');
  const qc = useQueryClient();
  const { user: authUser } = useAuthStore();
  const isSuperAdmin = authUser?.role === 'superadmin';

  const { data, isLoading } = useQuery({
    queryKey: ['users', orgFilter],
    queryFn: () => usersAPI.getAll({
      ...(orgFilter ? { orgId: orgFilter } : {}),
      // Superadmin Users tab: show only platform users (no org)
      ...(isSuperAdmin && mainTab === 'users' && !orgFilter ? { noOrg: true } : {}),
    }).then(r => r.data),
  });

  // Always fetch fresh current user permissions from server (not stale store)
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => authAPI.getMe().then(r => r.data),
    staleTime: 0, // always fresh
  });
  const freshUser = meData?.user || authUser;

  const { data: orgsData } = useQuery({
    queryKey: ['organizations-list'],
    queryFn: () => orgsAPI.getAll().then(r => r.data),
    enabled: isSuperAdmin,
  });

  // Org detail — employees + leads
  const { data: orgDetailData, isLoading: orgDetailLoading } = useQuery({
    queryKey: ['org-detail', selectedOrg],
    queryFn: () => orgsAPI.getOne(selectedOrg).then(r => r.data),
    enabled: !!selectedOrg,
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

  // Hierarchy levels
  const hierarchy = { superadmin: 4, orgadmin: 3, admin: 3, manager: 2, employee: 1, custom: 1 };
  const myLevel   = hierarchy[authUser?.role] || 0;
  const isSelf    = (u) => u._id === authUser?._id || u.email === authUser?.email;

  // Can deactivate — only higher level, not self
  const canDeactivate = (u) => !isSelf(u) && myLevel > (hierarchy[u.role] || 0);

  // Roles assignable — only lower than own level, not self's current role when editing self
  const assignableRoles = [
    { value: 'employee',   label: 'Employee / Telecaller' },
    { value: 'manager',    label: 'Manager' },
    { value: 'admin',      label: 'Admin' },
    { value: 'orgadmin',   label: 'Org Admin' },
    { value: 'superadmin', label: 'Super Admin' },
  ].filter(r => (hierarchy[r.value] || 0) < myLevel);

  // Superadmin can edit all permissions
  // OrgAdmin/Admin can edit permissions but only those they themselves have
  const canEditPermissions = authUser?.role === 'superadmin' || authUser?.role === 'orgadmin' || authUser?.role === 'admin';

  // Which permissions the current user is allowed to grant — use freshUser for live permissions
  // Superadmin → all permissions
  // OrgAdmin/Admin → only permissions they have (from server, not stale store)
  const grantablePerms = isSuperAdmin
    ? [...PERMISSIONS, ...SUPERADMIN_ONLY_PERMISSIONS]
    : PERMISSIONS.filter(p => freshUser?.permissions?.[p.key] === true);

  const openModal = (user = null) => {
    if (user) {
      setEditId(user._id);
      setForm({ name: user.name, email: user.email, password: '', phone: user.phone || '', role: user.role, permissions: { ...defaultPerms, ...user.permissions }, orgId: '' });
    } else {
      setEditId(null);
      // For new user — start with all permissions OFF (defaultPerms)
      setForm({ ...initialForm, permissions: { ...defaultPerms } });
    }
    setActiveTab('info');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditId(null); setForm({ ...initialForm, permissions: { ...defaultPerms } }); };

  // When role changes, auto-fill default permissions BUT only those the current user can grant
  const handleRoleChange = (role) => {
    const base = roleDefaults[role] || defaultPerms;
    // Filter: only grant permissions that current user themselves has (freshUser from server)
    const filtered = isSuperAdmin
      ? base
      : Object.fromEntries(
          Object.entries(base).map(([key, val]) => [
            key,
            val && (freshUser?.permissions?.[key] === true),
          ])
        );
    setForm(f => ({ ...f, role, permissions: { ...defaultPerms, ...filtered } }));
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

  // Lock body scroll when modal open (iOS Safari fix)
  useBodyScrollLock(showModal);

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            {isSuperAdmin ? 'Users & Organizations' : 'Users'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {isSuperAdmin ? 'Manage platform users and organizations' : `${users.length} total users`}
          </p>
        </div>
        {(!isSuperAdmin || mainTab === 'users') && (
          <button className="btn-primary text-sm" onClick={() => openModal()}>+ Add User</button>
        )}
      </div>

      {/* Superadmin Main Tabs */}
      {isSuperAdmin && (
        <div className="flex gap-1 p-1 rounded-2xl" style={{ backgroundColor: 'var(--bg-card2)', border: '1px solid var(--border)', width: 'fit-content' }}>
          {[
            { key: 'users', label: '👤 Users', count: users.length },
            { key: 'organizations', label: '🏢 Organizations', count: orgsData?.organizations?.length ?? 0 },
          ].map(t => (
            <button key={t.key} onClick={() => { setMainTab(t.key); setSelectedOrg(null); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
              style={{
                backgroundColor: mainTab === t.key ? 'var(--bg-card)' : 'transparent',
                color: mainTab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                boxShadow: mainTab === t.key ? 'var(--shadow)' : 'none',
              }}>
              {t.label}
              <span className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                style={{ backgroundColor: mainTab === t.key ? 'var(--accent-light)' : 'var(--border)', color: mainTab === t.key ? 'var(--accent)' : 'var(--text-muted)' }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── USERS TAB ─────────────────────────────────────────────────────── */}
      {(!isSuperAdmin || mainTab === 'users') && (
        <>
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

                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Permissions</p>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                          {permsOn}/{isSuperAdmin ? [...PERMISSIONS, ...SUPERADMIN_ONLY_PERMISSIONS].length : PERMISSIONS.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(isSuperAdmin
                          ? [...PERMISSIONS, ...SUPERADMIN_ONLY_PERMISSIONS]
                          : PERMISSIONS.filter(p => freshUser?.permissions?.[p.key] === true)
                        ).map(p => (
                          <span key={p.key} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
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
                      {u.isActive && canDeactivate(u) && (
                        <button onClick={() => setConfirmDeactivate(u)} className="btn-danger text-xs flex-1 py-1.5">
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && (
                <div className="col-span-3 card text-center py-12">
                  <p className="text-3xl mb-2">👤</p>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No platform users yet</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Add users not assigned to any organization</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── ORGANIZATIONS TAB ─────────────────────────────────────────────── */}
      {isSuperAdmin && mainTab === 'organizations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Org List */}
          <div className="space-y-3">
            {(orgsData?.organizations || []).length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-3xl mb-2">🏢</p>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No organizations yet</p>
              </div>
            ) : (orgsData?.organizations || []).map(org => (
              <div key={org._id}
                onClick={() => { setSelectedOrg(org._id); setOrgDetailTab('overview'); }}
                className="card cursor-pointer transition-all hover:shadow-md"
                style={{
                  border: selectedOrg === org._id ? '2px solid var(--accent)' : '1px solid var(--border)',
                  backgroundColor: selectedOrg === org._id ? 'var(--accent-light)' : 'var(--bg-card)',
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                    {org.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{org.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{org.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`badge text-xs ${
                      org.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      org.status === 'suspended' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>{org.status}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      👤 {org.currentEmployees || 0} · 👥 {org.currentLeads || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Org Detail Panel */}
          {selectedOrg ? (
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              {orgDetailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
                </div>
              ) : orgDetailData ? (
                <>
                  {/* Detail Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                        {orgDetailData.organization?.name}
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {orgDetailData.organization?.email}
                      </p>
                    </div>
                    <button onClick={() => setSelectedOrg(null)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                      style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)' }}>✕</button>
                  </div>

                  {/* Detail Tabs */}
                  <div className="flex gap-1 mb-4">
                    {[
                      { key: 'overview', label: '📊 Overview' },
                      { key: 'employees', label: `👤 Employees (${orgDetailData.employees?.length || 0})` },
                      { key: 'leads', label: `👥 Leads (${orgDetailData.leads?.length || 0})` },
                    ].map(t => (
                      <button key={t.key} onClick={() => setOrgDetailTab(t.key)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: orgDetailTab === t.key ? 'var(--accent-light)' : 'var(--bg-card2)',
                          color: orgDetailTab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                        }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
                    {/* Overview */}
                    {orgDetailTab === 'overview' && (
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Plan',      value: orgDetailData.organization?.planName || '—' },
                          { label: 'Status',    value: orgDetailData.organization?.status },
                          { label: 'Employees', value: `${orgDetailData.employees?.length || 0} / ${orgDetailData.organization?.maxEmployees}` },
                          { label: 'Leads',     value: `${orgDetailData.leads?.length || 0} / ${orgDetailData.organization?.maxLeads}` },
                          { label: 'Expires',   value: formatDate(orgDetailData.organization?.expiresAt) },
                          { label: 'Duration',  value: orgDetailData.organization?.planDuration || '—' },
                        ].map(r => (
                          <div key={r.label} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-card2)' }}>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.label}</p>
                            <p className="font-bold text-sm mt-0.5 capitalize" style={{ color: 'var(--text-primary)' }}>{r.value}</p>
                          </div>
                        ))}
                        {/* Admins */}
                        {(orgDetailData.admins || []).length > 0 && (
                          <div className="col-span-2">
                            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Org Admins</p>
                            {orgDetailData.admins.map(a => (
                              <div key={a._id} className="flex items-center gap-2 p-2 rounded-lg mb-1"
                                style={{ backgroundColor: 'var(--bg-card2)' }}>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                                  {a.name[0]}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{a.email}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Employees */}
                    {orgDetailTab === 'employees' && (
                      <div className="space-y-2">
                        {(orgDetailData.employees || []).length === 0 ? (
                          <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No employees yet</p>
                        ) : (orgDetailData.employees || []).map(emp => (
                          <div key={emp._id} className="flex items-center gap-3 p-3 rounded-xl"
                            style={{ backgroundColor: 'var(--bg-card2)' }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                              {emp.name[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{emp.name}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.email} · <span className="capitalize">{emp.role}</span></p>
                            </div>
                            <span className={`badge text-xs ${emp.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                              {emp.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Leads */}
                    {orgDetailTab === 'leads' && (
                      <div className="space-y-2">
                        {(orgDetailData.leads || []).length === 0 ? (
                          <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No leads yet</p>
                        ) : (orgDetailData.leads || []).map(lead => (
                          <div key={lead._id} className="flex items-center gap-3 p-3 rounded-xl"
                            style={{ backgroundColor: 'var(--bg-card2)' }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{lead.name}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {lead.phone} · {lead.assignedTo?.name || 'Unassigned'}
                              </p>
                            </div>
                            <span className={`badge text-xs ${statusColors[lead.status]}`}>
                              {statusLabels[lead.status]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-16"
              style={{ border: '2px dashed var(--border)' }}>
              <p className="text-4xl mb-3">🏢</p>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Select an organization</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Click any org to see details</p>
            </div>
          )}
        </div>
      )}

      {/* ── USER MODAL ────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay">
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
                      {/* Hide role change if editing self */}
                      {editId && isSelf(users.find(u => u._id === editId) || {}) ? (
                        <div className="input flex items-center gap-2" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                          <span className="capitalize">{form.role}</span>
                          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>Cannot change own role</span>
                        </div>
                      ) : (
                        <select className="input" value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                          {assignableRoles.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )}
                      <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                        Role change auto-fills default permissions.
                      </p>
                    </div>
                    {/* Org assignment — superadmin only */}
                    {isSuperAdmin && (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                          style={{ color: 'var(--text-muted)' }}>Assign to Organization</label>
                        <select className="input" value={form.orgId}
                          onChange={e => setForm({ ...form, orgId: e.target.value })}>
                          <option value="">No Organization (Platform User)</option>
                          {(orgsData?.organizations || []).map(o => (
                            <option key={o._id} value={o._id}>{o.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* Permissions Tab */}
                {activeTab === 'permissions' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {canEditPermissions ? 'Custom Permissions' : 'Permissions (Read Only)'}
                      </p>
                      {canEditPermissions && (
                        <div className="flex gap-2">
                          <button type="button" className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                            onClick={() => setForm(f => ({
                              ...f,
                              permissions: {
                                ...f.permissions,
                                ...Object.fromEntries(grantablePerms.map(p => [p.key, true])),
                              },
                            }))}>
                            All On
                          </button>
                          <button type="button" className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                            style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                            onClick={() => setForm(f => ({
                              ...f,
                              permissions: {
                                ...f.permissions,
                                ...Object.fromEntries(grantablePerms.map(p => [p.key, false])),
                              },
                            }))}>
                            All Off
                          </button>
                        </div>
                      )}
                    </div>

                    {!canEditPermissions && (
                      <div className="p-3 rounded-xl mb-3 text-xs"
                        style={{ backgroundColor: '#fef9c3', color: '#92400e' }}>
                        🔒 Only Super Admin can change permissions
                      </div>
                    )}

                    {/* Show only permissions the current user can grant */}
                    {grantablePerms.length === 0 && canEditPermissions && (
                      <div className="p-3 rounded-xl text-xs text-center"
                        style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)' }}>
                        You don't have any permissions to grant.
                      </div>
                    )}

                    {/* Standard permissions — only those grantable */}
                    {grantablePerms.filter(p => !SUPERADMIN_ONLY_PERMISSIONS.find(s => s.key === p.key)).map(p => (
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
                          disabled={!canEditPermissions}
                        />
                      </div>
                    ))}

                    {/* Organization permissions — superadmin only section */}
                    {isSuperAdmin && (
                      <>
                        <div className="pt-3 pb-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2"
                              style={{ color: 'var(--text-muted)' }}>
                              🔑 Superadmin Only
                            </span>
                            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                          </div>
                        </div>
                        {SUPERADMIN_ONLY_PERMISSIONS.map(p => (
                          <div key={p.key}
                            className="flex items-center justify-between p-3 rounded-xl transition-all"
                            style={{
                              backgroundColor: form.permissions[p.key] ? '#fef3c7' : 'var(--bg-card2)',
                              border: `1px solid ${form.permissions[p.key] ? '#f59e0b40' : 'transparent'}`,
                            }}>
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{p.icon}</span>
                              <div>
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.label}</span>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                  Can create, edit & delete organizations
                                </p>
                              </div>
                            </div>
                            <Toggle
                              checked={!!form.permissions[p.key]}
                              onChange={(val) => handlePermToggle(p.key, val)}
                              disabled={false}
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer — sticky so always visible on iOS */}
              <div className="px-6 py-4 flex gap-3 sticky bottom-0"
                style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
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

      {/* Deactivate Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmDeactivate}
        title="Deactivate User?"
        message={`${confirmDeactivate?.name} will be deactivated and won't be able to login.`}
        confirmLabel="Deactivate"
        confirmClass="btn-danger"
        icon="👤"
        loading={deleteMutation.isPending}
        onConfirm={() => { deleteMutation.mutate(confirmDeactivate._id); setConfirmDeactivate(null); }}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  );
}
