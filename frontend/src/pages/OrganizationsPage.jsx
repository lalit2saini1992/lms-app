import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgsAPI, plansAPI } from '../api';
import { formatDate, statusColors, statusLabels } from '../utils/helpers';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

const DURATIONS = [
  { key: 'quarterly',  label: 'Quarterly',   sub: '3 months'  },
  { key: 'halfYearly', label: 'Half Yearly',  sub: '6 months'  },
  { key: 'yearly',     label: 'Yearly',       sub: '12 months' },
  { key: 'threeYears', label: '3 Years',      sub: '36 months' },
];

const STATUS_COLORS = {
  active:    'bg-emerald-100 text-emerald-700',
  trial:     'bg-blue-100 text-blue-700',
  suspended: 'bg-red-100 text-red-600',
  expired:   'bg-gray-100 text-gray-500',
};

const initialForm = {
  name: '', email: '', phone: '', address: '',
  planId: '', planDuration: 'yearly',
  adminName: '', adminEmail: '', adminPassword: '', notes: '',
};

export default function OrganizationsPage() {
  const [showModal, setShowModal]   = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [detailTab, setDetailTab]   = useState('overview');
  const [form, setForm]             = useState(initialForm);
  const [editId, setEditId]         = useState(null);
  const [activeTab, setActiveTab]   = useState('info');
  const [confirmDeleteOrg, setConfirmDeleteOrg] = useState(false);
  const qc = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: statsData } = useQuery({
    queryKey: ['org-stats'],
    queryFn: () => orgsAPI.getStats().then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => orgsAPI.getAll().then(r => r.data),
  });

  const { data: detailData } = useQuery({
    queryKey: ['org-detail', showDetail],
    queryFn: () => orgsAPI.getOne(showDetail).then(r => r.data),
    enabled: !!showDetail,
  });

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plansAPI.getAll().then(r => r.data),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (d) => orgsAPI.create(d),
    onSuccess: (res) => {
      toast.success(`"${res.data.organization.name}" created!`);
      qc.invalidateQueries(['organizations']);
      qc.invalidateQueries(['org-stats']);
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => orgsAPI.update(id, data),
    onSuccess: () => {
      toast.success('Updated!');
      qc.invalidateQueries(['organizations']);
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => orgsAPI.updateStatus(id, { status }),
    onSuccess: (_, vars) => {
      toast.success(`Organization ${vars.status}`);
      qc.invalidateQueries(['organizations']);
      qc.invalidateQueries(['org-detail', vars.id]);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => orgsAPI.delete(id),
    onSuccess: () => {
      toast.success('Organization deleted');
      qc.invalidateQueries(['organizations']);
      qc.invalidateQueries(['org-stats']);
      setShowDetail(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const orgs          = data?.organizations || [];
  const stats         = statsData?.stats    || {};
  const availablePlans = plansData?.plans   || [];

  const openCreate = () => {
    setEditId(null);
    setForm(initialForm);
    setActiveTab('info');
    setShowModal(true);
  };

  const openEdit = (org) => {
    setEditId(org._id);
    setForm({
      name: org.name || '', email: org.email || '',
      phone: org.phone || '', address: org.address || '',
      planId: org.plan?._id || org.plan || '',
      planDuration: org.planDuration || 'yearly',
      adminName: org.adminName || '', adminEmail: org.adminEmail || '',
      adminPassword: '', notes: org.notes || '',
    });
    setActiveTab('info');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(initialForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      if (!form.adminName || !form.adminEmail || !form.adminPassword) {
        return toast.error('Admin details are required');
      }
      createMutation.mutate(form);
    }
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  useBodyScrollLock(showModal || !!(showDetail && detailData));

  const selectedPlan = availablePlans.find(p => p._id === form.planId);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Organizations</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage all client organizations</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ New Organization</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Orgs',   value: stats.totalOrgs,    icon: '🏢', bg: 'bg-violet-50' },
          { label: 'Active',       value: stats.activeOrgs,   icon: '✅', bg: 'bg-emerald-50' },
          { label: 'Trial',        value: stats.trialOrgs,    icon: '⏳', bg: 'bg-blue-50' },
          { label: 'Expiring Soon',value: stats.expiringSoon, icon: '⚠️', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="card">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${s.bg}`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{s.value ?? '—'}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Org List */}
      {isLoading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : orgs.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">🏢</p>
          <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>No organizations yet</p>
          <button className="btn-primary mt-4 mx-auto" onClick={openCreate}>+ Create First Organization</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orgs.map(org => {
            const empPct  = Math.min(((org.currentEmployees || 0) / (org.maxEmployees || 1)) * 100, 100);
            const leadPct = Math.min(((org.currentLeads || 0) / (org.maxLeads || 1)) * 100, 100);
            const isExpired = org.expiresAt && new Date(org.expiresAt) < new Date();

            return (
              <div key={org._id} className="card hover:shadow-md transition-all cursor-pointer"
                onClick={() => { setDetailTab('overview'); setShowDetail(org._id); }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                      {org.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{org.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{org.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`badge text-xs ${STATUS_COLORS[org.status] || 'bg-gray-100 text-gray-500'}`}>
                      {org.status}
                    </span>
                    {org.planName && (
                      <span className="badge text-xs bg-violet-100 text-violet-700">{org.planName}</span>
                    )}
                  </div>
                </div>

                {/* Usage bars */}
                <div className="space-y-2 mb-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      <span>👤 Employees</span>
                      <span className="font-semibold">{org.currentEmployees || 0}/{org.maxEmployees}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-card2)' }}>
                      <div className="h-1.5 rounded-full"
                        style={{ width: `${empPct}%`, backgroundColor: empPct > 80 ? '#ef4444' : '#7c3aed' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      <span>👥 Leads</span>
                      <span className="font-semibold">{org.currentLeads || 0}/{org.maxLeads}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-card2)' }}>
                      <div className="h-1.5 rounded-full"
                        style={{ width: `${leadPct}%`, backgroundColor: leadPct > 80 ? '#ef4444' : '#6366f1' }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-xs" style={{ color: isExpired ? '#ef4444' : 'var(--text-muted)' }}>
                    {isExpired ? '⚠️ Expired' : `Expires: ${formatDate(org.expiresAt)}`}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(org); }}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
      {showDetail && detailData && (
        <div className="modal-overlay">
          <div className="modal-box" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '640px' }}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 sm:hidden" style={{ backgroundColor: 'var(--border)' }} />

            {/* Header */}
            <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {detailData.organization?.name}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{detailData.organization?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${STATUS_COLORS[detailData.organization?.status] || ''}`}>
                    {detailData.organization?.status}
                  </span>
                  <button onClick={() => setShowDetail(null)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)' }}>✕</button>
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="flex gap-1 mt-3">
                {['overview', 'employees', 'leads'].map(tab => (
                  <button key={tab} onClick={() => setDetailTab(tab)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                    style={{
                      backgroundColor: detailTab === tab ? 'var(--accent-light)' : 'transparent',
                      color: detailTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                    {tab === 'overview' ? '📊 Overview' : tab === 'employees' ? `👤 Employees (${detailData.employees?.length || 0})` : `👥 Leads (${detailData.leads?.length || 0})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 max-h-80 overflow-y-auto">

              {/* Overview Tab */}
              {detailTab === 'overview' && (
                <div className="space-y-4">
                  {/* Admins */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Org Admins</p>
                    {(detailData.admins || []).map(a => (
                      <div key={a._id} className="flex items-center gap-3 p-2.5 rounded-xl mb-1"
                        style={{ backgroundColor: 'var(--bg-card2)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                          {a.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Plan',      value: detailData.organization?.planName || '—' },
                      { label: 'Duration',  value: detailData.organization?.planDuration || '—' },
                      { label: 'Expires',   value: formatDate(detailData.organization?.expiresAt) },
                      { label: 'Employees', value: `${detailData.employees?.length || 0}/${detailData.organization?.maxEmployees}` },
                      { label: 'Leads',     value: `${detailData.leads?.length || 0}/${detailData.organization?.maxLeads}` },
                      { label: 'Status',    value: detailData.organization?.status },
                    ].map(r => (
                      <div key={r.label} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-card2)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.label}</p>
                        <p className="font-bold text-sm mt-0.5 capitalize" style={{ color: 'var(--text-primary)' }}>{r.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Employees Tab */}
              {detailTab === 'employees' && (
                <div className="space-y-2">
                  {(detailData.employees || []).length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No employees yet</p>
                  ) : (detailData.employees || []).map(emp => (
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

              {/* Leads Tab */}
              {detailTab === 'leads' && (
                <div className="space-y-2">
                  {(detailData.leads || []).length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No leads yet</p>
                  ) : (detailData.leads || []).map(lead => (
                    <div key={lead._id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-card2)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{lead.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{lead.phone} · {lead.assignedTo?.name || 'Unassigned'}</p>
                      </div>
                      <span className={`badge text-xs ${statusColors[lead.status]}`}>{statusLabels[lead.status]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 space-y-2">
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 text-sm"
                  onClick={() => { setShowDetail(null); openEdit(detailData.organization); }}>
                  ✏️ Edit
                </button>
                {detailData.organization?.status !== 'active' ? (
                  <button className="btn-success flex-1 text-sm"
                    onClick={() => statusMutation.mutate({ id: showDetail, status: 'active' })}>
                    ✅ Activate
                  </button>
                ) : (
                  <button className="btn-danger flex-1 text-sm"
                    onClick={() => statusMutation.mutate({ id: showDetail, status: 'suspended' })}>
                    🚫 Suspend
                  </button>
                )}
              </div>
              <button className="btn-danger w-full text-sm"
                onClick={() => setConfirmDeleteOrg(true)}>
                🗑️ Delete Organization & All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 sm:hidden" style={{ backgroundColor: 'var(--border)' }} />
            <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {editId ? 'Edit Organization' : 'Create New Organization'}
                </h3>
                <button onClick={closeModal}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4">
              {[
                { key: 'info',  label: '🏢 Info' },
                { key: 'plan',  label: '💳 Plan' },
                ...(!editId ? [{ key: 'admin', label: '👤 Admin' }] : []),
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: activeTab === tab.key ? 'var(--accent-light)' : 'transparent',
                    color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">

                {/* ── Info Tab ── */}
                {activeTab === 'info' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Organization Name *</label>
                      <input className="input" placeholder="ABC Realty Pvt Ltd" value={form.name} onChange={f('name')} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Business Email *</label>
                      <input type="email" className="input" placeholder="contact@abcrealty.com" value={form.email} onChange={f('email')} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Phone</label>
                      <input className="input" placeholder="9876543210" value={form.phone} onChange={f('phone')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Address</label>
                      <input className="input" placeholder="City, State" value={form.address} onChange={f('address')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Notes</label>
                      <textarea className="input resize-none" rows={2} value={form.notes} onChange={f('notes')} />
                    </div>
                  </>
                )}

                {/* ── Plan Tab ── */}
                {activeTab === 'plan' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Select Plan</label>
                      {availablePlans.length === 0 ? (
                        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--bg-card2)' }}>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No plans yet. Create plans first from Plans page.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {availablePlans.map(p => (
                            <label key={p._id}
                              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                              style={{
                                border: `2px solid ${form.planId === p._id ? 'var(--accent)' : 'var(--border)'}`,
                                backgroundColor: form.planId === p._id ? 'var(--accent-light)' : 'var(--bg-card2)',
                              }}>
                              <input type="radio" name="planId" value={p._id}
                                checked={form.planId === p._id}
                                onChange={() => setForm(prev => ({ ...prev, planId: p._id }))}
                                className="accent-violet-600" />
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || '#7c3aed' }} />
                              <div className="flex-1">
                                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {p.maxEmployees >= 999 ? 'Unlimited' : p.maxEmployees} employees · {p.maxLeads >= 99999 ? 'Unlimited' : p.maxLeads?.toLocaleString()} leads
                                </p>
                              </div>
                              {form.planId === p._id && <span style={{ color: 'var(--accent)' }}>✓</span>}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Duration</label>
                      <div className="space-y-2">
                        {DURATIONS.map(d => {
                          const price = selectedPlan?.pricing?.[d.key];
                          return (
                            <label key={d.key}
                              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                              style={{
                                border: `2px solid ${form.planDuration === d.key ? 'var(--accent)' : 'var(--border)'}`,
                                backgroundColor: form.planDuration === d.key ? 'var(--accent-light)' : 'var(--bg-card2)',
                              }}>
                              <input type="radio" name="planDuration" value={d.key}
                                checked={form.planDuration === d.key}
                                onChange={() => setForm(prev => ({ ...prev, planDuration: d.key }))}
                                className="accent-violet-600" />
                              <div className="flex-1">
                                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{d.label}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.sub}</p>
                              </div>
                              {price > 0 && (
                                <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>₹{price.toLocaleString()}</span>
                              )}
                              {form.planDuration === d.key && <span style={{ color: 'var(--accent)' }}>✓</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Admin Tab (create only) ── */}
                {activeTab === 'admin' && !editId && (
                  <>
                    <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                      ℹ️ An admin account will be created with these credentials. Share with the client.
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Admin Name *</label>
                      <input className="input" placeholder="John Doe" value={form.adminName} onChange={f('adminName')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Admin Email *</label>
                      <input type="email" className="input" placeholder="admin@client.com" value={form.adminEmail} onChange={f('adminEmail')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Admin Password *</label>
                      <input type="text" className="input" placeholder="Min 6 characters" value={form.adminPassword} onChange={f('adminPassword')} />
                    </div>
                  </>
                )}
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button type="submit" className="btn-primary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editId ? 'Update' : 'Create Organization'}
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Organization Confirm Modal */}
      <ConfirmModal
        isOpen={confirmDeleteOrg}
        title="Delete Organization?"
        message={`"${detailData?.organization?.name}" and ALL its users, leads, and follow-ups will be permanently deleted. This CANNOT be undone!`}
        confirmLabel="Yes, Delete Everything"
        cancelLabel="Cancel"
        confirmClass="btn-danger"
        icon="🏢"
        loading={deleteMutation.isPending}
        onConfirm={() => { deleteMutation.mutate(showDetail); setConfirmDeleteOrg(false); }}
        onCancel={() => setConfirmDeleteOrg(false)}
      />
    </div>
  );
}
