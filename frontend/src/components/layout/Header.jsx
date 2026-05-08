import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import NotificationBell from '../ui/NotificationBell';
import toast from 'react-hot-toast';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <header className="px-4 py-3 flex items-center justify-between sticky top-0 z-10 border-b"
      style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border)' }}>

      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            <span className="text-white font-black text-xs">L</span>
          </div>
          <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>LMS Pro</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* User chip */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
          style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          <div className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span style={{ color: 'var(--text-primary)' }} className="font-semibold">{user?.name}</span>
          <span className="capitalize px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            {user?.role}
          </span>
        </div>

        {/* Notification Bell */}
        <NotificationBell />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl transition-all"
          style={{ backgroundColor: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          title={theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
        >
          {theme === 'light' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>

        {/* Logout */}
        <button onClick={handleLogout} className="btn-secondary text-xs px-3 py-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
