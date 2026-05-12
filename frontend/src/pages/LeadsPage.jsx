import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { leadsAPI, usersAPI, orgsAPI } from '../api';
import useAuthStore from '../store/authStore';
import { statusColors, statusLabels, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function LeadsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isSuperAdmin = user?.role === 'superadmin';

  const [filters, setFilters]         = useState({ search: '', status: '', assignedTo: '', orgId: '', page: 1 });
  const [selected, setSelected]       = useState(new Set());
  const [assignModal, setAssignModal] = useState(false);
  const [singleLead, setSingleLead]   = useState(null);
  const [assignTo, setAssignTo]       = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // lead object to delete

  // Leads query — superadmin passes orgId filter
  const { data, isLoading } = useQuery({
    queryKey: ['leads', filters],
    queryFn: () => leadsAPI.getAll({
      search: filters.search,
      status: filters.status,
      assignedTo: filters.assignedTo,
      orgId: filters.orgId,
      page: filters.page,
    }).then(r => r.data),
  });

  // Employees for assign
  const { data: usersData } = useQuery({
    queryKey: ['users-employees', filters.orgId],
    queryFn: () => usersAPI.getAll({
      isActive: true,
      ...(filters.orgId ? { orgId: filters.orgId } : {}),
    }).then(r => r.data),
    enabled: !!(user?.permissions?.canAssignLead || isSuperAdmin),
  });

  // Organizations list for superadmin filter
  const { data: orgsData } = useQuery({
    queryKey: ['organizations-list'],
    queryFn: () => orgsAPI.getAll().then(r => r.data),
    enabled: isSuperAdmin,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedTo }) => leadsAPI.assign(id, { assignedTo }),
    onSuccess: () => { qc.invalidateQueries(['leads']); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => leadsAPI.delete(id),
    onSuccess: () => { toast.success('Lead deleted'); qc.invalidateQueries(['leads']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const leads      = data?.leads || [];
  const employees  = (usersData?.users || []).filter(u => ['employee', 'manager', 'orgadmin'].includes(u.role));
  const orgs       = orgsData?.organizations || [];

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleOne = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    if (selected.size === leads.length) setSelected(new Set());
    else setSelected(new Set(leads.map(l => l._id)));
  };

  // ── Bulk Assign ────────────────────────────────────────────────────────────
  const handleBulkAssign = async () => {
    if (!assignTo) return toast.error('Select an employee');
    const ids = singleLead ? [singleLead._id] : [...selected];
    try {
      await Promise.all(ids.map(id => assignMutation.mutateAsync({ id, assignedTo: assignTo })));
      toast.success(`${ids.length} lead(s) assigned`);
      setSelected(new Set());
      setAssignModal(false);
      setSingleLead(null);
      setAssignTo('');
    } catch {
      toast.error('Some assignments failed');
    }
  };

  const openBulkAssign = () => {
    if (selected.size === 0) return toast.error('Select at least one lead');
    setSingleLead(null); setAssignTo(''); setAssignModal(true);
  };
  const openSingleAssign = (lead) => {
    setSingleLead(lead); setAssignTo(lead.assignedTo?._id || ''); setAssignModal(true);
  };

  // Superadmin cannot assign leads
  const canAssign = !isSuperAdmin && (user?.permissions?.canAssignLead);
  const canAdd    = user?.permissions?.canAddLead;
  const canImport = user?.permissions?.canImportLead;
  const canDelete = user?.permissions?.canDeleteLead || isSuperAdmin;

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Leads</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{data?.total ?? 0} total leads</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && canAssign && (
            <button onClick={openBulkAssign} className="btn-primary text-sm">
              👤 Assign {selected.size} Selected
            </button>
          )}
          {canImport && <Link to="/leads/import" className="btn-secondary text-sm">📥 Import Excel</Link>}
          {canAdd    && <Link to="/leads/add"    className="btn-primary text-sm">+ Add Lead</Link>}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input className="input col-span-2 md:col-span-1" placeholder="🔍 Search name, phone..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })} />

          <select className="input" value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}>
            <option value="">All Status</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {/* Org filter — superadmin only */}
          {isSuperAdmin && (
            <select className="input" value={filters.orgId}
              onChange={e => setFilters({ ...filters, orgId: e.target.value, assignedTo: '', page: 1 })}>
              <option value="">All Organizations</option>
              {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
          )}

          {/* Employee filter */}
          {canAssign && (
            <select className="input" value={filters.assignedTo}
              onChange={e => setFilters({ ...filters, assignedTo: e.target.value, page: 1 })}>
              <option value="">All Employees</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          )}

          <button className="btn-secondary text-sm"
            onClick={() => { setFilters({ search: '', status: '', assignedTo: '', orgId: '', page: 1 }); setSelected(new Set()); }}>
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>
            <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-3" />
            Loading leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No leads found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {canAssign && (
                    <th className="table-header w-10 pl-4">
                      <input type="checkbox" className="checkbox"
                        checked={selected.size === leads.length && leads.length > 0}
                        onChange={toggleAll} />
                    </th>
                  )}
                  <th className="table-header">Name</th>
                  <th className="table-header">Phone</th>
                  <th className="table-header hidden md:table-cell">Status</th>
                  {isSuperAdmin && <th className="table-header hidden lg:table-cell">Organization</th>}
                  <th className="table-header hidden lg:table-cell">Assigned To</th>
                  <th className="table-header hidden lg:table-cell">Created</th>
                  <th className="table-header text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead._id} className="table-row"
                    style={{ backgroundColor: selected.has(lead._id) ? 'var(--accent-light)' : undefined }}>
                    {canAssign && (
                      <td className="table-cell w-10 pl-4">
                        <input type="checkbox" className="checkbox"
                          checked={selected.has(lead._id)}
                          onChange={() => toggleOne(lead._id)} />
                      </td>
                    )}
                    <td className="table-cell">
                      <Link to={`/leads/${lead._id}`} className="font-semibold hover:underline"
                        style={{ color: 'var(--text-primary)' }}>{lead.name}</Link>
                      {lead.email && <p className="text-xs truncate max-w-[160px]" style={{ color: 'var(--text-muted)' }}>{lead.email}</p>}
                    </td>
                    <td className="table-cell">
                      <a href={`tel:${lead.phone}`} className="hover:underline" style={{ color: 'var(--accent)' }}>
                        {lead.phone}
                      </a>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      <span className={`badge ${statusColors[lead.status]}`}>{statusLabels[lead.status]}</span>
                    </td>
                    {isSuperAdmin && (
                      <td className="table-cell hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {lead.organization?.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    )}
                    <td className="table-cell hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {lead.assignedTo?.name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                    </td>
                    <td className="table-cell hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="table-cell text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/leads/${lead._id}`}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                          style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}>
                          View
                        </Link>
                        {canAssign && (
                          <button onClick={() => openSingleAssign(lead)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100">
                            Assign
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setConfirmDelete(lead)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Page {filters.page} of {data.pages} · {data.total} leads
            </p>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs px-3 py-1.5"
                disabled={filters.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>← Prev</button>
              <button className="btn-secondary text-xs px-3 py-1.5"
                disabled={filters.page >= data.pages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="modal-overlay">
          <div className="modal-box p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5 sm:hidden" style={{ backgroundColor: 'var(--border)' }} />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {singleLead ? `Assign: ${singleLead.name}` : `Assign ${selected.size} Leads`}
              </h3>
              <button onClick={() => { setAssignModal(false); setSingleLead(null); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
              {employees.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                  No employees found. {isSuperAdmin ? 'Select an organization filter first.' : 'Add employees first.'}
                </p>
              ) : employees.map(emp => (
                <label key={emp._id}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    border: `2px solid ${assignTo === emp._id ? 'var(--accent)' : 'var(--border)'}`,
                    backgroundColor: assignTo === emp._id ? 'var(--accent-light)' : 'var(--bg-card2)',
                  }}>
                  <input type="radio" name="assignTo" value={emp._id}
                    checked={assignTo === emp._id}
                    onChange={() => setAssignTo(emp._id)}
                    className="accent-violet-600" />
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                    {emp.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{emp.name}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{emp.role} · {emp.email}</p>
                  </div>
                  {assignTo === emp._id && <span style={{ color: 'var(--accent)' }}>✓</span>}
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={handleBulkAssign}
                disabled={!assignTo || assignMutation.isPending}>
                {assignMutation.isPending ? 'Assigning...' : `Assign ${singleLead ? 'Lead' : `${selected.size} Leads`}`}
              </button>
              <button className="btn-secondary flex-1"
                onClick={() => { setAssignModal(false); setSingleLead(null); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Delete Lead?"
        message={`"${confirmDelete?.name}" will be soft deleted and removed from the list.`}
        confirmLabel="Delete"
        confirmClass="btn-danger"
        icon="🗑️"
        loading={deleteMutation.isPending}
        onConfirm={() => { deleteMutation.mutate(confirmDelete._id); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
