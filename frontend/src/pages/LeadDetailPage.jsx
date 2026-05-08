import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsAPI, followupsAPI } from '../api';
import useAuthStore from '../store/authStore';
import {
  statusColors, statusLabels, formatDateTime, timeAgo,
  getWhatsAppLink, getCallLink, getMailLink, communicationIcons,
} from '../utils/helpers';
import toast from 'react-hot-toast';

export default function LeadDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showFUForm, setShowFUForm] = useState(false);
  const [fuForm, setFuForm] = useState({
    followUpTypeId: '', communicationMethod: 'call', remark: '', nextFollowUpDate: '',
  });

  const { data: leadData, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsAPI.getOne(id).then(r => r.data),
  });
  const { data: followUpsData } = useQuery({
    queryKey: ['followups', id],
    queryFn: () => followupsAPI.getAll({ leadId: id }).then(r => r.data),
  });
  const { data: typesData } = useQuery({
    queryKey: ['followup-types'],
    queryFn: () => followupsAPI.getTypes().then(r => r.data),
  });

  const createFUMutation = useMutation({
    mutationFn: (data) => followupsAPI.create(data),
    onSuccess: () => {
      toast.success('Follow-up saved!');
      qc.invalidateQueries(['followups', id]);
      qc.invalidateQueries(['lead', id]);
      setShowFUForm(false);
      setFuForm({ followUpTypeId: '', communicationMethod: 'call', remark: '', nextFollowUpDate: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const lead     = leadData?.lead;
  const followUps = followUpsData?.followUps || [];
  const types    = typesData?.types || [];

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );
  if (!lead) return (
    <div className="card text-center py-12">
      <p className="text-4xl mb-3">🔍</p>
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Lead not found</p>
    </div>
  );

  const handleFUSubmit = (e) => {
    e.preventDefault();
    if (!fuForm.followUpTypeId) return toast.error('Select a follow-up type');
    createFUMutation.mutate({ leadId: id, ...fuForm });
  };

  const InfoRow = ({ label, value }) => value ? (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  ) : null;

  return (
    <div className="space-y-4 page-enter">
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors"
        style={{ color: 'var(--text-muted)' }}>
        ← Back to Leads
      </button>

      {/* Lead Header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
              {lead.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{lead.name}</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{lead.email || 'No email'}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--accent)' }}>{lead.phone}</p>
            </div>
          </div>
          <span className={`badge text-sm px-3 py-1 ${statusColors[lead.status]}`}>
            {statusLabels[lead.status]}
          </span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5 pt-4"
          style={{ borderTop: '1px solid var(--border)' }}>
          <InfoRow label="Source"      value={lead.source?.replace('_', ' ')} />
          <InfoRow label="Assigned To" value={lead.assignedTo?.name || 'Unassigned'} />
          <InfoRow label="City"        value={lead.city} />
          <InfoRow label="Product"     value={lead.product} />
          <InfoRow label="Budget"      value={lead.budget} />
          <InfoRow label="Created By"  value={lead.createdBy?.name} />
          {lead.notes && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Notes</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lead.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Actions */}
      <div className="card">
        <h2 className="section-title mb-4">Contact</h2>
        <div className="flex flex-wrap gap-3">
          <a href={getCallLink(lead.phone)}
            className="btn text-white shadow-md flex-1 sm:flex-none"
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 14px rgba(22,163,74,0.3)' }}>
            📞 Call
          </a>
          <a href={getWhatsAppLink(lead.phone, `Hi ${lead.name}, `)}
            target="_blank" rel="noopener noreferrer"
            className="btn text-white shadow-md flex-1 sm:flex-none"
            style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)', boxShadow: '0 4px 14px rgba(37,211,102,0.3)' }}>
            💬 WhatsApp
          </a>
          {lead.email && (
            <a href={getMailLink(lead.email)}
              className="btn text-white shadow-md flex-1 sm:flex-none"
              style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
              📧 Email
            </a>
          )}
          <button onClick={() => setShowFUForm(!showFUForm)}
            className="btn-primary flex-1 sm:flex-none">
            {showFUForm ? '✕ Cancel' : '+ Add Follow-up'}
          </button>
        </div>
      </div>

      {/* Follow-up Form */}
      {showFUForm && (
        <div className="card" style={{ border: '2px solid var(--accent)', borderColor: 'var(--accent)' }}>
          <h2 className="section-title mb-4">Add Follow-up</h2>
          <form onSubmit={handleFUSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>Follow-up Type *</label>
                <select className="input" value={fuForm.followUpTypeId}
                  onChange={e => setFuForm({ ...fuForm, followUpTypeId: e.target.value })} required>
                  <option value="">Select type...</option>
                  {types.map(t => (
                    <option key={t._id} value={t._id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>Communication Method *</label>
                <select className="input" value={fuForm.communicationMethod}
                  onChange={e => setFuForm({ ...fuForm, communicationMethod: e.target.value })}>
                  <option value="call">📞 Call</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="email">📧 Email</option>
                  <option value="message">✉️ Message</option>
                  <option value="in_person">🤝 In Person</option>
                  <option value="other">📝 Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Remark</label>
              <textarea className="input resize-none" rows={3}
                placeholder="Add your notes here..."
                value={fuForm.remark}
                onChange={e => setFuForm({ ...fuForm, remark: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Next Follow-up Date & Time</label>
              <input type="datetime-local" className="input"
                value={fuForm.nextFollowUpDate}
                onChange={e => setFuForm({ ...fuForm, nextFollowUpDate: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1"
                disabled={createFUMutation.isPending}>
                {createFUMutation.isPending ? 'Saving...' : '✓ Save Follow-up'}
              </button>
              <button type="button" className="btn-secondary"
                onClick={() => setShowFUForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Follow-up Timeline */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Follow-up History</h2>
          <span className="badge text-xs px-2.5 py-1"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            {followUps.length} entries
          </span>
        </div>

        {followUps.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No follow-ups yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Add the first one above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {followUps.map((fu, i) => (
              <div key={fu._id} className="flex gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-card2)', border: '2px solid var(--border)' }}>
                    {communicationIcons[fu.communicationMethod]}
                  </div>
                  {i < followUps.length - 1 && (
                    <div className="w-0.5 flex-1 mt-2 mb-0" style={{ backgroundColor: 'var(--border)' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-card2)' }}>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="badge text-xs font-semibold px-2 py-0.5 rounded-lg"
                        style={{
                          backgroundColor: (fu.followUpType?.color || '#7c3aed') + '20',
                          color: fu.followUpType?.color || '#7c3aed',
                        }}>
                        {fu.followUpType?.label}
                      </span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {fu.doneBy?.name}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        · {timeAgo(fu.createdAt)}
                      </span>
                    </div>
                    {fu.remark && (
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{fu.remark}</p>
                    )}
                    {fu.nextFollowUpDate && (
                      <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--accent)' }}>
                        📅 Next: {formatDateTime(fu.nextFollowUpDate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
