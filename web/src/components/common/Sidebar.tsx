import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Video,
  User,
  Settings,
  Bell,
  Shield,
  Users,
  Flag,
  BarChart3,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  isAdmin?: boolean;
}

export default function Sidebar({ isAdmin = false }: SidebarProps) {
  const userLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/my-reports', icon: FileText, label: 'Mes signalements' },
    { to: '/live', icon: Video, label: 'Lives' },
    { to: '/profile', icon: User, label: 'Profil' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
    { to: '/admin/reports', icon: Flag, label: 'Signalements' },
    { to: '/admin/moderation', icon: Shield, label: 'Modération' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytique' },
    { to: '/admin/logs', icon: Activity, label: 'Logs' },
    { to: '/admin/settings', icon: Settings, label: 'Paramètres' },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <aside className="w-64 bg-white border-r min-h-screen py-6">
      <nav className="px-3 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <link.icon className="w-5 h-5" />
            <span className="font-medium">{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}