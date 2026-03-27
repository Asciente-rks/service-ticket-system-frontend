import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getLoggedInUser } from '../utils/auth';
import type { User } from '../types';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setUser(getLoggedInUser());
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'User Management', path: '/users', icon: '👥' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className={`bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-6 flex items-center justify-between">
          {!isCollapsed && <h2 className="text-xl font-bold text-indigo-400">TICKETING</h2>}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 mx-auto"
          >
            {/* Burger Icon (3 Lines) */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2 mt-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {!isCollapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-end px-8 relative bg-slate-950">
          
          {/* Profile Dropdown Container */}
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 hover:bg-slate-900 p-2 rounded-xl transition"
            >
              <div className="text-right hidden sm:block">
              <p className="text-[10px] text-indigo-400 uppercase tracking-tighter">
                Role ID: {user?.roleId || 'N/A'}
              </p>
              </div>
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-black">
                {(user?.name || 'S')[0]}
              </div>
            </button>

            {/* The Clickable Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <button 
                  onClick={() => navigate(`/users/edit/${user?.id}`)}
                  className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  👤 My Profile / Edit
                </button>
                <button className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2">
                  ⚙️ Settings
                </button>
                <hr className="border-slate-800" />
                <button 
                  onClick={() => { localStorage.clear(); window.location.reload(); }}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 flex items-center gap-2"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="p-8">{children}</main>
      </div>
    </div>
  );
};

export default Layout;