import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { BookOpen, LogOut, LayoutDashboard, FileText, Users, ShieldCheck, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Quizzes', path: '/quizzes', icon: BookOpen },
    { name: 'Notes', path: '/notes', icon: FileText },
    { name: 'Collaboration', path: '/collab', icon: Users },
  ];

  if (user?.is_admin) {
    navItems.push({ name: 'Admin Panel', path: '/admin', icon: ShieldCheck });
  }

  return (
    <div className="flex h-screen bg-theme-bg font-sans overflow-hidden">
      {/* Sidebar Panel */}
      <aside className="w-68 bg-theme-sidebar text-theme-dark flex flex-col justify-between rounded-r-[40px] shadow-sm relative z-20">
        <div>
          {/* Brand Header */}
          <div className="p-8 pb-6 flex items-center space-x-3 relative z-10">
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-theme-dark font-display flex items-center gap-1">
                AdaptIQ
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="py-6 space-y-1.5 relative z-10">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={clsx(
                    "flex items-center space-x-3.5 px-6 py-4 rounded-r-full mr-6 transition-all duration-200 font-bold text-sm",
                    isActive
                      ? "bg-theme-card text-theme-dark shadow-sm"
                      : "text-theme-dark/60 hover:bg-theme-card/50 hover:text-theme-dark"
                  )}
                >
                  <Icon className={clsx("w-5 h-5 transition-colors", isActive ? "text-theme-accent" : "text-theme-dark/60")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card Profile & Logout */}
        <div className="p-6 relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-theme-yellow flex items-center justify-center text-white text-lg font-extrabold shadow-sm">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-theme-dark truncate">{user?.username}</p>
              <p className="text-xs text-theme-dark/60 font-semibold truncate">Student</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 text-theme-dark/60 hover:text-theme-dark px-2 py-3 w-full transition-all duration-200 font-bold text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-theme-bg">
        <div className="h-full bg-theme-bg p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
