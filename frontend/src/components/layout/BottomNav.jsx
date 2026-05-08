import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/dashboard',      icon: '⚡', label: 'Home' },
  { to: '/leads',          icon: '👥', label: 'Leads' },
  { to: '/reports',        icon: '📊', label: 'Reports',  permission: 'canViewReports' },
  { to: '/users',          icon: '👤', label: 'Users',     permission: 'canManageUsers' },
  { to: '/followup-types', icon: '🏷️', label: 'Types',    permission: 'canManageFollowupTypes' },
];

export default function BottomNav() {
  const { user } = useAuthStore();
  const canShow = (item) => {
    if (item.permission && !user?.permissions?.[item.permission]) return false;
    return true;
  };
  const visible = navItems.filter(canShow).slice(0, 5);

  return (
    <nav className="bottom-nav lg:hidden">
      {visible.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="text-xl leading-none">{item.icon}</span>
          <span className="text-[10px] font-semibold">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
