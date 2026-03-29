import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getLoggedInUser } from '../utils/auth';
import api from '../services/api';
import type { User, Role } from '../types';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Refs for click-outside detection
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const currentUser = getLoggedInUser();
    setUser(currentUser);

    // Fetch roles to determine admin status
    const fetchRoles = async () => {
      try {
        const res = await api.get('/users/roles'); // Ensure this endpoint exists for authenticated users
        setRoles(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setRoles([]); // Ensure state is set even on failure
        console.error("Layout Role Fetch Failed:", err);
      }
    };
    fetchRoles();

    // Fetch users to find the descriptive name for the current account
    // NOTE: This fetches ALL users just to find the current user's name.
    // For better performance, consider implementing a /users/me endpoint on the backend
    // that returns the current user's full details, or ensure getLoggedInUser() returns the name.
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        const usersList = Array.isArray(res.data) ? res.data : [];
        setUsers(usersList);

        // If the current user isn't in the list (common for Admins), fetch them specifically
        if (currentUser && !usersList.find(u => String(u.id).toLowerCase() === String(currentUser.id).toLowerCase())) {
          try {
            const singleRes = await api.get(`/users/${currentUser.id}`);
            if (singleRes.data) {
              setUsers(prev => [...prev, singleRes.data]);
            }
          } catch (e) {
            console.warn("Header identity fetch failed");
          }
        }
      } catch (err) {
        setUsers([]);
        console.error("Layout User Fetch Failed (consider /users/me endpoint):", err);
      }
    };
    fetchUsers();

    // Fetch latest 5 notifications
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications?limit=5');
        setNotifications(Array.isArray(res.data) ? res.data : (res.data.notifications || []));
      } catch (err) {
        console.error("Notification Fetch Failed:", err);
      }
    };

    if (currentUser) fetchNotifications();
  }, []); // Removed 'navigate' from dependencies as it's a stable function

  // Resolve the full user object (including name) from the users list
  const currentUserDetails = useMemo(() => {
    if (!user) return null;
    const userId = String(user.id).toLowerCase();
    const userEmail = String((user as any).email || "").toLowerCase();
    
    const found = users.find(u => 
      String(u.id).toLowerCase() === userId ||
      (userEmail && String(u.email || "").toLowerCase() === userEmail)
    );

    if (found) return found;

    // Last resort fallback using email prefix only if name is missing everywhere
    const emailPrefix = userEmail ? userEmail.split("@")[0].replace(/[._]/g, " ") : "Administrator";
    
    return {
      ...user,
      name: ((user as any).name && String((user as any).name).length > 0) 
        ? (user as any).name 
        : (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1))
    } as User;
  }, [user, users]);

  const isAdmin = useMemo(() => {
    if (!user || roles.length === 0) return false;
    const userRoleId = String(user.roleId).toLowerCase();
    const adminRoles = roles.filter(r => 
      ['admin', 'administrator', 'superadmin', 'super admin'].includes(r.name.toLowerCase())
    ).map(r => String(r.id).toLowerCase());
    
    return adminRoles.includes(userRoleId);
  }, [user, roles]);

  const handleNotificationClick = async (notification: any) => {
    setIsNotificationsOpen(false);
    
    if (notification.ticketId) {
      navigate(`/dashboard?ticketId=${notification.ticketId}`);
    }
  };

  const menuItems = useMemo(() => {
    const items = [{ name: 'Dashboard', path: '/dashboard', icon: '📊' }];
    if (isAdmin) {
      items.push({ name: 'User Management', path: '/users', icon: '👥' });
    }
    return items;
  }, [isAdmin]);

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
          {/* Notification Bell */}
          <div className="relative mr-4" ref={notificationsRef}>
            <button 
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfileOpen(false);
              }}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition relative group"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-500">No recent notifications</p>
                  ) : (
                    notifications.slice(0, 5).map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => handleNotificationClick(n)}
                        className="p-4 border-b border-slate-800 hover:bg-slate-800/50 transition cursor-pointer"
                      >
                        <p className="text-xs leading-relaxed text-slate-300">{n.message}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
                <button 
                  onClick={() => { navigate('/notifications'); setIsNotificationsOpen(false); }}
                  className="w-full p-4 text-xs text-indigo-400 font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>

          {/* Profile Dropdown Container */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-3 hover:bg-slate-900 p-2 rounded-xl transition"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white tracking-tight">
                  {currentUserDetails?.name || 'Administrator'}
                </p>
                <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">
                  {roles.find(r => String(r.id).toLowerCase() === String(user?.roleId).toLowerCase())?.name || 'Member'}
                </p>
              </div>
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-black">
                {(currentUserDetails?.name || currentUserDetails?.email || 'A')[0].toUpperCase()}
              </div>
            </button>

            {/* The Clickable Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <button 
                  onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
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