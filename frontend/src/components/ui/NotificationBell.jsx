import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../../api';
import { timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

const typeIcons = {
  lead_assigned:  '👤',
  followup_due:   '📅',
  lead_converted: '✅',
  new_lead:       '🆕',
  general:        '🔔',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref             = useRef();
  const navigate        = useNavigate();
  const qc              = useQueryClient();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll({ limit: 15 }).then(r => r.data),
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsAPI.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All marked as read');
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => notificationsAPI.clearAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notifications cleared');
    },
  });

  const notifications = data?.notifications || [];
  const unread        = data?.unreadCount   || 0;

  const handleClick = (n) => {
    if (!n.isRead) markReadMutation.mutate(n._id);
    if (n.link) { navigate(n.link); setOpen(false); }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl transition-all"
        style={{
          backgroundColor: open ? 'var(--accent-light)' : 'var(--bg-card2)',
          border: '1px solid var(--border)',
          color: open ? 'var(--accent)' : 'var(--text-secondary)',
        }}
        title="Notifications"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-12 w-80 rounded-2xl z-50 overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Notifications
              </span>
              {unread > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {unread > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="text-xs font-semibold"
                  style={{ color: 'var(--accent)' }}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => clearAllMutation.mutate()}
                  className="text-xs font-semibold text-red-500">
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  All caught up!
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleClick(n)}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    backgroundColor: !n.isRead ? 'var(--accent-light)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = !n.isRead ? 'var(--accent-light)' : 'transparent'}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-card2)' }}>
                    {typeIcons[n.type] || '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {n.title}
                    </p>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {n.message}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: 'var(--accent)' }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
