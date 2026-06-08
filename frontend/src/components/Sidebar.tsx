import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useJira } from '../context/JiraContext';
import { LayoutDashboard, Layout, Sparkles, CalendarDays, Settings, LogOut } from 'lucide-react';

const navItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard',        end: true },
  { to: '/boards',   icon: Layout,          label: "Board'lar",         end: false },
  { to: '/skills',   icon: Sparkles,        label: 'Yetenek Yönetimi',  end: false },
  { to: '/calendar', icon: CalendarDays,    label: 'İzin Takvimi',      end: false },
];

const Sidebar: React.FC = () => {
  const { config, clearConfig } = useJira();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearConfig();
    navigate('/setup');
  };

  return (
    <aside className="w-60 min-h-screen bg-gray-900 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">Jira Hub</span>
        </div>
        {config?.baseUrl && (
          <p className="text-gray-500 text-xs mt-1 truncate">
            {config.baseUrl.replace('https://', '')}
          </p>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        <NavLink
          to="/setup"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`
          }
        >
          <Settings className="w-4 h-4" />
          Bağlantı Ayarları
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Bağlantıyı Kes
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
