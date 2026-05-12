import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/dashboard',      icon: '⚡', label: 'Dashboard' },
  { to: '/leads',          icon: '👥', label: 'Leads' },           // visible to all
  { to: '/organizations',  icon: '🏢', label: 'Organizations',   superadminOnly: true },
  { to: '/plans',          icon: '💳', label: 'Plans',           superadminOnly: true },
  { to: '/users',          icon: '👤', label: 'Users',           permission: 'canManageUsers' },
  { to: '/reports',        icon: '📊', label: 'Reports',         permission: 'canViewReports' },
  { to: '/roles',          icon: '🛡️', label: 'Roles',           permission: 'canManageUsers', hideForSuperadmin: true },
  { to: '/followup-types', icon: '🏷️', label: 'Follow-up Types', permission: 'canManageFollowupTypes', hideForSuperadmin: true },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const canShow = (item) => {
    if (item.superadminOnly && user?.role !== 'superadmin') return false;
    if (item.hideForSuperadmin && user?.role === 'superadmin') return false;
    if (item.permission && !user?.permissions?.[item.permission]) return false;
    return true;
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-30 w-56 flex flex-col
      transform transition-transform duration-300 ease-in-out
      lg:relative lg:translate-x-0 lg:flex-shrink-0
      ${open ? 'translate-x-0' : '-translate-x-full'}
    `} style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
          <span className="text-white font-black text-lg">L</span>
        </div>
        <div>
          <p className="font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>LMS Pro</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Lead Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-3"
          style={{ color: 'var(--text-muted)' }}>Main Menu</p>

        {navItems.filter(canShow).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'nav-active' : 'nav-default'
              }`
            }
            style={({ isActive }) => isActive
              ? { backgroundColor: 'var(--bg-nav-active)', color: 'var(--text-nav-act)' }
              : { color: 'var(--text-nav)' }
            }
          >
            {({ isActive }) => (
              <>
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--accent)' }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User — clickable to profile */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
          style={{ backgroundColor: 'var(--bg-card2)' }}
          onClick={() => { navigate('/profile'); onClose(); }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-card2)'}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
            <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{user?.role} · View Profile</p>
          </div>
          <div className="w-2 h-2 bg-emerald-400 rounded-full" />
        </div>

        {/* Desktop copyright */}
        <p className="text-center mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} LMS Pro · Developed with{' '}
          <span className="text-red-400">♥</span>{' '}by{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Lalit</span>
        </p>
      </div>    </aside>
  );
}
