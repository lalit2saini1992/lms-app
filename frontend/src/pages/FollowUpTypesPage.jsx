import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followupsAPI } from '../api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';

const PRESET_COLORS = ['#7c3aed','#6366f1','#2563eb','#0891b2','#059669','#16a34a','#d97706','#ea580c','#dc2626','#db2777','#64748b'];

const DEFAULTS = [
  { label: 'Not Pick',        color: '#ef4444' },
  { label: 'Switch Off',      color: '#64748b' },
  { label: 'Busy',            color: '#f59e0b' },
  { label: 'Call Back',       color: '#6366f1' },
  { label: 'Interested',      color: '#10b981' },
  { label: 'Not Interested',  color: '#dc2626' },
  { label: 'Deal Done',       color: '#059669' },
  { label: 'Wrong Number',    color: '#94a3b8' },
  { label: 'Follow Up Later', color: '#8b5cf6' },
];

const initialForm = { label: '', color: '#7c3aed', description: '' };

export default function FollowUpTypesPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(initialForm);
  const [editId, setEditId]       = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // type object
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['followup-types'],
    queryFn: () => followupsAPI.getTypes().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => followupsAPI.createType(d),
    onSuccess: () => { toast.success('Type created'); qc.invalidateQueries(['followup-types']); closeModal(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => followupsAPI.updateType(id, data),
    onSuccess: () => { toast.success('Type updated'); qc.invalidateQueries(['followup-types']); closeModal(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => followupsAPI.deleteType(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['followup-types']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const types = data?.types || [];

  const openModal = (type = null) => {
    if (type) { setEditId(type._id); setForm({ label: type.label, color: type.color, description: type.description || '' }); }
    else { setEditId(null); setForm(initialForm); }
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditId(null); setForm(initialForm); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.label.trim()) return toast.error('Label is required');
    if (editId) updateMutation.mutate({ id: editId, data: form });
    else createMutation.mutate(form);
  };

  const seedDefaults = async () => {
    let count = 0;
    for (const d of DEFAULTS) {
      try { await followupsAPI.createType(d); count++; } catch {}
    }
    qc.invalidateQueries(['followup-types']);
    toast.success(`${count} default types added`);
  };

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Follow-up Types</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage call outcome types for telecallers</p>
        </div>
        <div className="flex gap-2">
          {types.length === 0 && (
            <button className="btn-secondary text-sm" onClick={seedDefaults}>⚡ Add Defaults</button>
          )}
          <button className="btn-primary text-sm" onClick={() => openModal()}>+ Add Type</button>
        </div>
      </div>

      {isLoading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : types.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">🏷️</p>
          <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>No follow-up types yet</p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--text-muted)' }}>
            Add types like "Not Pick", "Busy", "Interested" etc.
          </p>
          <button className="btn-primary mx-auto" onClick={seedDefaults}>⚡ Add Default Types</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {types.map((type) => (
            <div key={type._id} className="card hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: type.color + '20', border: `2px solid ${type.color}30` }}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: type.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{type.label}</p>
                  {type.description && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{type.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button onClick={() => openModal(type)}
                  className="btn-secondary text-xs flex-1 py-1.5">✏️ Edit</button>
                <button
                  onClick={() => setConfirmDelete(type)}
                  className="btn-danger text-xs flex-1 py-1.5">🗑️ Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden" style={{ backgroundColor: 'var(--border)' }} />
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {editId ? 'Edit Type' : 'Add Follow-up Type'}
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              These types appear when telecallers log a follow-up
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>Label *</label>
                <input className="input" placeholder="e.g. Not Pick"
                  value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} required />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-muted)' }}>Color</label>
                {/* Preview */}
                <div className="flex items-center gap-3 mb-3 p-3 rounded-xl"
                  style={{ backgroundColor: form.color + '15', border: `1.5px solid ${form.color}40` }}>
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: form.color }} />
                  <span className="text-sm font-semibold" style={{ color: form.color }}>{form.label || 'Preview'}</span>
                </div>
                {/* Presets */}
                <div className="flex flex-wrap gap-2 mb-3">
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
                <input type="color" className="input h-10 p-1 cursor-pointer"
                  value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>Description (optional)</label>
                <input className="input" placeholder="Brief description..."
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editId ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Follow-up Type Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Delete Follow-up Type?"
        message={`"${confirmDelete?.label}" will be removed from all future follow-ups.`}
        confirmLabel="Delete"
        confirmClass="btn-danger"
        icon="🏷️"
        loading={deleteMutation.isPending}
        onConfirm={() => { deleteMutation.mutate(confirmDelete._id); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
