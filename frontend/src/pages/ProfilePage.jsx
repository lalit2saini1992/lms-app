import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileAPI } from '../api';
import useAuthStore from '../store/authStore';
import { roleColors } from '../utils/helpers';
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

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuthStore();
  const qc = useQueryClient();

  const [infoForm, setInfoForm]   = useState({ name: '', phone: '' });
  const [passForm, setPassForm]   = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [editInfo, setEditInfo]   = useState(false);
  const [showPass, setShowPass]   = useState({ cur: false, new: false, con: false });
  const [activeTab, setActiveTab] = useState('profile');

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileAPI.get().then(r => r.data),
  });

  const user = data?.user || authUser;

  // Sync form when data loads — useEffect instead of onSuccess
  useEffect(() => {
    if (data?.user) {
      setInfoForm({ name: data.user.name || '', phone: data.user.phone || '' });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (d) => profileAPI.update(d),
    onSuccess: (res) => {
      toast.success('Profile updated!');
      updateUser(res.data.user);
      qc.invalidateQueries(['profile']);
      setEditInfo(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const passMutation = useMutation({
    mutationFn: (d) => profileAPI.changePassword(d),
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const handleInfoSubmit = (e) => {
    e.preventDefault();
    if (!infoForm.name.trim()) return toast.error('Name is required');
    updateMutation.mutate({ name: infoForm.name.trim() });
  };

  const handlePassSubmit = (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword)
      return toast.error('New passwords do not match');
    if (passForm.newPassword.length < 6)
      return toast.error('Password must be at least 6 characters');
    passMutation.mutate({
      currentPassword: passForm.currentPassword,
      newPassword: passForm.newPassword,
    });
  };

  const permsOn = PERMISSIONS.filter(p => user?.permissions?.[p.key]).length;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-5 page-enter">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>My Profile</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage your account settings</p>
      </div>

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{user?.name}</h2>
              <span className={`badge capitalize ${roleColors[user?.role]}`}>{user?.role}</span>
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            {user?.phone && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.phone}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Active
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl"
        style={{ backgroundColor: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
        {[
          { key: 'profile',     label: '👤 Profile' },
          { key: 'security',    label: '🔐 Security' },
          { key: 'permissions', label: `🛡️ Permissions (${permsOn}/${PERMISSIONS.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: activeTab === tab.key ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.key ? 'var(--shadow)' : 'none',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">Personal Information</h2>
            {!editInfo && (
              <button
                onClick={() => {
                  setInfoForm({ name: user?.name || '', phone: user?.phone || '' });
                  setEditInfo(true);
                }}
                className="btn-secondary text-xs px-3 py-1.5">
                ✏️ Edit
              </button>
            )}
          </div>

          {editInfo ? (
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>Full Name *</label>
                <input className="input" value={infoForm.name}
                  onChange={e => setInfoForm({ ...infoForm, name: e.target.value })} required />
              </div>
              {/* Email — read only, cannot change */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>Email (cannot change)</label>
                <input className="input" value={user?.email} disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1"
                  disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : '✓ Save Name'}
                </button>
                <button type="button" className="btn-secondary flex-1"
                  onClick={() => setEditInfo(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-0">
              {[
                { label: 'Full Name', value: user?.name },
                { label: 'Email',     value: user?.email },
                { label: 'Role',      value: user?.role },
              ].map(row => (
                <div key={row.label}
                  className="flex items-center justify-between py-3.5"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                  <span className="text-sm font-semibold capitalize"
                    style={{ color: 'var(--text-primary)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Security Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="card">
          <h2 className="section-title mb-5">Change Password</h2>
          <form onSubmit={handlePassSubmit} className="space-y-4">
            {[
              { key: 'currentPassword', label: 'Current Password',     showKey: 'cur' },
              { key: 'newPassword',     label: 'New Password',         showKey: 'new' },
              { key: 'confirmPassword', label: 'Confirm New Password', showKey: 'con' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>{field.label}</label>
                <div className="relative">
                  <input
                    type={showPass[field.showKey] ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={passForm[field.key]}
                    onChange={e => setPassForm({ ...passForm, [field.key]: e.target.value })}
                    required
                  />
                  <button type="button"
                    onClick={() => setShowPass({ ...showPass, [field.showKey]: !showPass[field.showKey] })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: 'var(--text-muted)' }}>
                    {showPass[field.showKey] ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            ))}

            {/* Strength hints */}
            {passForm.newPassword && (
              <div className="p-3 rounded-xl text-xs space-y-1.5"
                style={{ backgroundColor: 'var(--bg-card2)' }}>
                {[
                  { check: passForm.newPassword.length >= 6,   label: 'At least 6 characters' },
                  { check: /[A-Z]/.test(passForm.newPassword),  label: 'One uppercase letter' },
                  { check: /[0-9]/.test(passForm.newPassword),  label: 'One number' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-2">
                    <span>{r.check ? '✅' : '⬜'}</span>
                    <span style={{ color: r.check ? '#16a34a' : 'var(--text-muted)' }}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-3"
              disabled={passMutation.isPending}>
              {passMutation.isPending ? 'Changing...' : '🔐 Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* ── Permissions Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'permissions' && (
        <div className="card">
          <h2 className="section-title mb-2">My Permissions</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Contact admin to change your permissions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERMISSIONS.map(p => {
              const has = !!user?.permissions?.[p.key];
              return (
                <div key={p.key}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: has ? 'var(--accent-light)' : 'var(--bg-card2)' }}>
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-sm font-medium flex-1"
                    style={{ color: 'var(--text-primary)' }}>{p.label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                    has ? 'text-emerald-700 bg-emerald-100' : 'text-red-500 bg-red-50'
                  }`}>
                    {has ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
