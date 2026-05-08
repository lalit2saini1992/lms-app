import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatDate, timeAgo, statusColors, statusLabels, communicationIcons } from '../utils/helpers';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const COLORS = ['#7c3aed','#f59e0b','#6366f1','#10b981','#ef4444','#06b6d4','#94a3b8'];

const StatCard = ({ label, value, icon, color }) => (
  <div className="card hover:shadow-md transition-all">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-3xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
    </div>
  </div>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card text-xs px-3 py-2 shadow-lg" style={{ minWidth: 100 }}>
      <p style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-bold mt-0.5" style={{ color: 'var(--accent)' }}>{payload[0].value} leads</p>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: statsData } = useQuery({ queryKey: ['dashboard-stats'],    queryFn: () => dashboardAPI.getStats().then(r => r.data) });
  const { data: chartData }  = useQuery({ queryKey: ['dashboard-chart'],   queryFn: () => dashboardAPI.getChart().then(r => r.data) });
  const { data: activityData }= useQuery({ queryKey: ['dashboard-activity'],queryFn: () => dashboardAPI.getActivity().then(r => r.data) });

  const stats       = statsData?.stats || {};
  const statusChart = (chartData?.statusData || []).map(d => ({ name: statusLabels[d._id] || d._id, value: d.count }));
  const trendChart  = chartData?.trendData || [];

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Welcome back, <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{user?.name}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Leads"   value={stats.totalLeads}      icon="👥" color="bg-violet-50 dark:bg-violet-900/20" />
        <StatCard label="New"           value={stats.newLeads}         icon="🆕" color="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard label="In Progress"   value={stats.inProgressLeads}  icon="⚡" color="bg-amber-50 dark:bg-amber-900/20" />
        <StatCard label="Converted"     value={stats.convertedLeads}   icon="✅" color="bg-emerald-50 dark:bg-emerald-900/20" />
        <StatCard label="Due Today"     value={stats.dueToday}         icon="📅" color="bg-red-50 dark:bg-red-900/20" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="card">
          <h2 className="section-title mb-4">Lead Trend — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={trendChart} barSize={30}>
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(124,58,237,0.04)' }} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <Bar dataKey="count" fill="url(#barGrad)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h2 className="section-title mb-4">Status Distribution</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={statusChart} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={65}>
                  {statusChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {statusChart.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent follow-ups */}
        <div className="card">
          <h2 className="section-title mb-4">Recent Follow-ups</h2>
          <div className="space-y-2">
            {!(activityData?.recentFollowUps?.length) && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No follow-ups yet</p>
            )}
            {(activityData?.recentFollowUps || []).map((fu) => (
              <Link to={`/leads/${fu.lead?._id}`} key={fu._id}
                className="flex items-start gap-3 p-3 rounded-xl transition-colors"
                style={{ backgroundColor: 'var(--bg-card2)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-card2)'}
              >
                <span className="text-lg mt-0.5">{communicationIcons[fu.communicationMethod]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{fu.lead?.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--accent)' }}>{fu.followUpType?.label}</span>
                    {' · '}{fu.doneBy?.name}{' · '}{timeAgo(fu.createdAt)}
                  </p>
                  {fu.remark && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{fu.remark}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div className="card">
          <h2 className="section-title mb-4">Upcoming Follow-ups</h2>
          <div className="space-y-2">
            {!(activityData?.upcomingFollowUps?.length) && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No upcoming follow-ups</p>
            )}
            {(activityData?.upcomingFollowUps || []).map((lead) => (
              <Link to={`/leads/${lead._id}`} key={lead._id}
                className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                style={{ backgroundColor: 'var(--bg-card2)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-card2)'}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-amber-50">📅</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{lead.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{lead.phone} · {formatDate(lead.nextFollowUpDate)}</p>
                </div>
                <span className={`badge text-xs ${statusColors[lead.status]}`}>{statusLabels[lead.status]}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
