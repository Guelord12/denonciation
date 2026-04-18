import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Flag,
  AlertTriangle,
  BarChart3,
  Settings,
  Activity
} from 'lucide-react';

const menuItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { path: '/admin/reports', icon: Flag, label: 'Signalements' },
  { path: '/admin/moderation', icon: AlertTriangle, label: 'Modération' },
  { path: '/admin/analytics', icon: BarChart3, label: 'Analytique' },
  { path: '/admin/logs', icon: Activity, label: 'Logs d\'activité' },
  { path: '/admin/settings', icon: Settings, label: 'Paramètres' },
];

export default function AdminSidebar() {
  return (
    <aside className="w-64 bg-white shadow-sm min-h-screen">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}