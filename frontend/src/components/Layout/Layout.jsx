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
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {/* Sidebar Panel */}
      <aside className="w-68 bg-slate-950 text-white flex flex-col justify-between border-r border-slate-900 shadow-premium relative">
        {/* Background glow behind branding */}
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-brand-500/10 to-transparent pointer-events-none"></div>

        <div>
          {/* Brand Header */}
          <div className="p-6 pb-4 flex items-center space-x-3 relative z-10">
            <div className="bg-brand-600 p-2.5 rounded-2xl shadow-glow-blue/40 border border-brand-500/30 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white font-display flex items-center gap-1">
                AdaptIQ
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              </span>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Study Assistant</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-6 space-y-1.5 relative z-10">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={clsx(
                    "flex items-center space-x-3.5 px-4 py-3 rounded-2xl transition-all duration-200 font-semibold text-sm",
                    isActive
                      ? "bg-brand-600 text-white shadow-md shadow-brand-950/20 border border-brand-500/20"
                      : "text-slate-400 hover:bg-slate-900/60 hover:text-white"
                  )}
                >
                  <Icon className={clsx("w-5 h-5 transition-colors", isActive ? "text-white" : "text-slate-500")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card Profile & Logout */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md relative z-10">
          <div className="flex items-center space-x-3 mb-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-900/60">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-base font-extrabold shadow-md shadow-brand-950/30">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{user?.username}</p>
              <p className="text-[10px] text-slate-500 font-semibold truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 text-slate-400 hover:text-rose-400 px-4 py-3 w-full transition-all duration-200 rounded-2xl hover:bg-rose-950/20 font-bold text-sm"
          >
            <LogOut className="w-5 h-5 text-slate-500 hover:text-rose-400" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-1 md:p-2">
        <div className="h-full rounded-3xl bg-slate-50 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
