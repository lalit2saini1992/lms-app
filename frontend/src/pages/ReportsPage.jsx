import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { followupsAPI, dashboardAPI } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { statusLabels } from '../utils/helpers';

const COLORS = ['#7c3aed','#f59e0b','#10b981','#ef4444','#6366f1','#06b6d4'];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card text-xs px-3 py-2 shadow-lg">
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-bold mt-0.5" style={{ color: 'var(--accent)' }}>{payload[0].value}</p>
    </div>
  );
};

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['followup-summary', dateRange],
    queryFn: () => followupsAPI.getSummary(dateRange).then(r => r.data),
  });
  const { data: chartData }  = useQuery({ queryKey: ['dashboard-chart'],  queryFn: () => dashboardAPI.getChart().then(r => r.data) });
  const { data: statsData }  = useQuery({ queryKey: ['dashboard-stats'],  queryFn: () => dashboardAPI.getStats().then(r => r.data) });

  const summary     = summaryData?.summary || [];
  const stats       = statsData?.stats || {};
  const statusChart = (chartData?.statusData || []).map(d => ({ name: statusLabels[d._id] || d._id, value: d.count }));

  const countMethods = (methods) =>
    methods.reduce((acc, m) => { acc[m] = (acc[m] || 0) + 1; return acc; }, {});

  const StatBox = ({ label, value, icon, color }) => (
    <div className="card text-center hover:shadow-md transition-all">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 ${color}`}>{icon}</div>
      <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Reports</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analytics and performance overview</p>
      </div>

      {/* Date Filter */}
      <div className="card">
        <h2 className="section-title mb-4">Filter by Date</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>From</label>
            <input type="date" className="input"
              value={dateRange.startDate}
              onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>To</label>
            <input type="date" className="input"
              value={dateRange.endDate}
              onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} />
          </div>
          <button className="btn-secondary"
            onClick={() => setDateRange({ startDate: '', endDate: '' })}>Clear</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total Leads"      value={stats.totalLeads}      icon="👥" color="bg-violet-50" />
        <StatBox label="Converted"        value={stats.convertedLeads}  icon="✅" color="bg-emerald-50" />
        <StatBox label="Total Follow-ups" value={stats.totalFollowUps}  icon="📞" color="bg-blue-50" />
        <StatBox label="Today Follow-ups" value={stats.todayFollowUps}  icon="📅" color="bg-amber-50" />
      </div>

      {/* Status Chart */}
      <div className="card">
        <h2 className="section-title mb-4">Lead Status Overview</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={statusChart} layout="vertical" barSize={22}>
            <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={110} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(124,58,237,0.04)' }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {statusChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Employee Summary */}
      <div className="card">
        <h2 className="section-title mb-4">Employee Follow-up Summary</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full" />
          </div>
        ) : summary.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data for selected period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="table-header">Employee</th>
                  <th className="table-header text-center">Total</th>
                  <th className="table-header text-center hidden md:table-cell">📞 Calls</th>
                  <th className="table-header text-center hidden md:table-cell">💬 WhatsApp</th>
                  <th className="table-header text-center hidden md:table-cell">📧 Email</th>
                  <th className="table-header hidden lg:table-cell">Activity</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s, idx) => {
                  const methods = countMethods(s.methods);
                  const max = Math.max(...summary.map(x => x.total));
                  const pct = max > 0 ? (s.total / max) * 100 : 0;
                  return (
                    <tr key={s._id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                            {s.userName?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{s.userName}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-center">
                        <span className="text-lg font-black" style={{ color: 'var(--accent)' }}>{s.total}</span>
                      </td>
                      <td className="table-cell text-center hidden md:table-cell">{methods.call || 0}</td>
                      <td className="table-cell text-center hidden md:table-cell">{methods.whatsapp || 0}</td>
                      <td className="table-cell text-center hidden md:table-cell">{methods.email || 0}</td>
                      <td className="table-cell hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'var(--bg-card2)' }}>
                            <div className="h-2 rounded-full transition-all"
                              style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
                          </div>
                          <span className="text-xs font-semibold w-8 text-right" style={{ color: 'var(--text-muted)' }}>
                            {Math.round(pct)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
