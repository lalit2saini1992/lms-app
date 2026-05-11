import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plansAPI } from '../api';
import toast from 'react-hot-toast';

const DURATIONS = [
  { key: 'quarterly',  label: 'Quarterly',   months: 3,  icon: '📅' },
  { key: 'halfYearly', label: 'Half Yearly',  months: 6,  icon: '📆' },
  { key: 'yearly',     label: 'Yearly',       months: 12, icon: '🗓️' },
  { key: 'threeYears', label: '3 Years',      months: 36, icon: '🏆' },
];

const PRESET_COLORS = ['#7c3aed','#6366f1','#2563eb','#0891b2','#059669','#d97706','#dc2626','#db2777'];

const initialForm = {
  name: '', description: '', maxEmployees: 5, maxLeads: 500,
  pricing: { quarterly: '', halfYearly: '', yearly: '', threeYears: '' },
  color: '#7c3aed', isDefault: false,
};

export default function PlansPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(initialForm);
  const [editId, setEditId]       = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plansAPI.getAll().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => plansAPI.create(d),
    onSuccess: () => { toast.success('Plan created!'); qc.invalidateQueries(['plans']); closeModal(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => plansAPI.update(id, data),
    onSuccess: () => { toast.success('Plan updated!'); qc.invalidateQueries(['plans']); closeModal(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => plansAPI.delete(id),
    onSuccess: () => { toast.success('Plan deleted'); qc.invalidateQueries(['plans']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const plans = data?.plans || [];

  const openModal = (plan = null) => {
    if (plan) {
      setEditId(plan._id);
      setForm({
        name: plan.name, description: plan.description || '',
        maxEmployees: plan.maxEmployees, maxLeads: plan.maxLeads,
        pricing: { ...initialForm.pricing, ...plan.pricing },
        color: plan.color || '#7c3aed', isDefault: plan.isDefault || false,
      });
    } else {
      setEditId(null);
      setForm(initialForm);
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditId(null); setForm(initialForm); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Plan name is required');
    const payload = {
      ...form,
      maxEmployees: parseInt(form.maxEmployees),
      maxLeads: parseInt(form.maxLeads),
      pricing: {
        quarterly:  parseFloat(form.pricing.quarterly)  || 0,
        halfYearly: parseFloat(form.pricing.halfYearly) || 0,
        yearly:     parseFloat(form.pricing.yearly)     || 0,
        threeYears: parseFloat(form.pricing.threeYears) || 0,
      },
    };
    if (editId) updateMutation.mutate({ id: editId, data: payload });
    else createMutation.mutate(payload);
  };

  const setPricing = (key, val) => setForm(f => ({ ...f, pricing: { ...f.pricing, [key]: val } }));

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Subscription Plans</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Create and manage plans for organizations</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>+ New Plan</button>
      </div>

      {isLoading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : plans.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">💳</p>
          <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>No plans yet</p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--text-muted)' }}>Create plans to assign to organizations</p>
          <button className="btn-primary mx-auto" onClick={() => openModal()}>+ Create First Plan</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan._id} className="card hover:shadow-md transition-all overflow-hidden">
              {/* Color bar */}
              <div className="h-1.5 rounded-full mb-4" style={{ backgroundColor: plan.color }} />

              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
                    {plan.isDefault && (
                      <span className="badge text-xs bg-amber-100 text-amber-700">⭐ Default</span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{plan.description}</p>
                  )}
                </div>
              </div>

              {/* Limits */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 p-2.5 rounded-xl text-center"
                  style={{ backgroundColor: 'var(--bg-card2)' }}>
                  <p className="text-lg font-black" style={{ color: plan.color }}>
                    {plan.maxEmployees >= 999 ? '∞' : plan.maxEmployees}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Employees</p>
                </div>
                <div className="flex-1 p-2.5 rounded-xl text-center"
                  style={{ backgroundColor: 'var(--bg-card2)' }}>
                  <p className="text-lg font-black" style={{ color: plan.color }}>
                    {plan.maxLeads >= 99999 ? '∞' : plan.maxLeads >= 1000 ? `${plan.maxLeads/1000}K` : plan.maxLeads}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Leads</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-1.5 mb-4">
                {DURATIONS.map(d => (
                  plan.pricing?.[d.key] > 0 && (
                    <div key={d.key} className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-card2)' }}>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {d.icon} {d.label}
                      </span>
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        ₹{plan.pricing[d.key].toLocaleString()}
                      </span>
                    </div>
                  )
                ))}
              </div>

              <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button onClick={() => openModal(plan)} className="btn-secondary text-xs flex-1 py-1.5">✏️ Edit</button>
                <button
                  onClick={() => { if (window.confirm(`Delete plan "${plan.name}"?`)) deleteMutation.mutate(plan._id); }}
                  className="btn-danger text-xs flex-1 py-1.5">🗑️ Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 sm:hidden" style={{ backgroundColor: 'var(--border)' }} />

            <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {editId ? 'Edit Plan' : 'Create New Plan'}
                </h3>
                <button onClick={closeModal}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)' }}>✕</button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">

                {/* Name & Description */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Plan Name *</label>
                  <input className="input" placeholder="e.g. Starter, Growth, Pro"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
                  <input className="input" placeholder="Brief description..."
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Max Employees *</label>
                    <input type="number" className="input" min="1" placeholder="5"
                      value={form.maxEmployees} onChange={e => setForm({ ...form, maxEmployees: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Max Leads *</label>
                    <input type="number" className="input" min="1" placeholder="500"
                      value={form.maxLeads} onChange={e => setForm({ ...form, maxLeads: e.target.value })} required />
                  </div>
                </div>

                {/* Pricing per duration */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    Pricing (₹) — Leave 0 to hide
                  </label>
                  <div className="space-y-2">
                    {DURATIONS.map(d => (
                      <div key={d.key} className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ backgroundColor: 'var(--bg-card2)' }}>
                        <span className="text-lg w-6">{d.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{d.label}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.months} months</p>
                        </div>
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                            style={{ color: 'var(--text-muted)' }}>₹</span>
                          <input type="number" min="0" placeholder="0"
                            className="input pl-7 text-right"
                            value={form.pricing[d.key]}
                            onChange={e => setPricing(d.key, e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Color</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {PRESET_COLORS.map(c => (
                      <button key={c} type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className="w-8 h-8 rounded-lg transition-transform"
                        style={{
                          backgroundColor: c,
                          transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                          outline: form.color === c ? `3px solid ${c}` : 'none',
                          outlineOffset: '2px',
                        }} />
                    ))}
                  </div>
                </div>

                {/* Default */}
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-card2)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Set as Default Plan</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Auto-selected when creating organizations</p>
                  </div>
                  <button type="button"
                    onClick={() => setForm({ ...form, isDefault: !form.isDefault })}
                    className="toggle-track"
                    style={{ backgroundColor: form.isDefault ? 'var(--accent)' : 'var(--border-input)' }}>
                    <span className="toggle-thumb" style={{ transform: form.isDefault ? 'translateX(20px)' : 'translateX(2px)' }} />
                  </button>
                </div>
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button type="submit" className="btn-primary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editId ? 'Update Plan' : 'Create Plan'}
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
