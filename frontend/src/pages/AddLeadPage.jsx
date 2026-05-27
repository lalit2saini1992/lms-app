import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsAPI, usersAPI } from '../api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const initialForm = {
  name: '', phone: '', email: '', source: 'manual',
  notes: '', address: '', city: '', product: '', budget: '', assignedTo: '',
};

// Defined OUTSIDE component — prevents remount on every render
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
      style={{ color: 'var(--text-muted)' }}>{label}</label>
    {children}
  </div>
);

export default function AddLeadPage() {
  const [form, setForm] = useState(initialForm);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: usersData } = useQuery({
    queryKey: ['users-employees'],
    queryFn: () => usersAPI.getAll({ isActive: true }).then(r => r.data),
    enabled: !!user?.permissions?.canAssignLead,
  });

  const mutation = useMutation({
    mutationFn: (data) => leadsAPI.create(data),
    onSuccess: (res) => {
      toast.success('Lead added!');
      qc.invalidateQueries(['leads']);
      navigate(`/leads/${res.data.lead._id}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add lead'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return toast.error('Name and phone are required');
    mutation.mutate(form);
  };

  const set = (field) => (e) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
  };
  const employees = (usersData?.users || []).filter(u => ['employee', 'manager'].includes(u.role));

  return (
    <div className="max-w-2xl page-enter">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          ←
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Add New Lead</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Fill in the lead details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="card">
          <h2 className="section-title mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name *">
              <input className="input" placeholder="John Doe" value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="Phone *">
              <input className="input" placeholder="9876543210" value={form.phone} onChange={set('phone')} required />
            </Field>
            <Field label="Email">
              <input type="email" className="input" placeholder="john@example.com" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Source">
              <select className="input" value={form.source} onChange={set('source')}>
                <option value="manual">Manual Entry</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social_media">Social Media</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Additional Info */}
        <div className="card">
          <h2 className="section-title mb-4">Additional Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="City">
              <input className="input" placeholder="Mumbai" value={form.city} onChange={set('city')} />
            </Field>
            <Field label="Product / Interest">
              <input className="input" placeholder="Home Loan, Insurance..." value={form.product} onChange={set('product')} />
            </Field>
            <Field label="Budget">
              <input className="input" placeholder="₹5-10 Lakh" value={form.budget} onChange={set('budget')} />
            </Field>
            {user?.permissions?.canAssignLead && (
              <Field label="Assign To">
                <select className="input" value={form.assignedTo} onChange={set('assignedTo')}>
                  <option value="">Unassigned</option>
                  {employees.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </Field>
            )}
            <div className="md:col-span-2">
              <Field label="Address">
                <input className="input" placeholder="Full address" value={form.address} onChange={set('address')} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Notes">
                <textarea className="input resize-none" rows={3}
                  placeholder="Any additional notes..."
                  value={form.notes} onChange={set('notes')} />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1 py-3" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Adding...
              </span>
            ) : '+ Add Lead'}
          </button>
          <button type="button" className="btn-secondary px-6" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
