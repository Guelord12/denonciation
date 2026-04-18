import { useAuthStore } from '../../stores/authStore';
import { Bell, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AdminHeader() {
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-xl font-bold text-red-600">
            Dénonciation Admin
          </Link>
          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
            Administration
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-600 hover:text-red-600">
            <Bell className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline text-gray-700">{user?.username}</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1">
                <Link
                  to="/profile"
                  className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="w-4 h-4 mr-2" />
                  Profil
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-gray-100"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}