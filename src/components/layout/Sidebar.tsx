import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarClock, 
  Users, 
  CalendarDays, 
  LogOut,
  Scale
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export function Sidebar() {
  const { signOut } = useAuth();

  const links = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/prazos', icon: <CalendarClock size={18} />, label: 'Prazos' },
    { to: '/clientes', icon: <Users size={18} />, label: 'Clientes' },
    { to: '/semana', icon: <CalendarDays size={18} />, label: 'Semana' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900/60 backdrop-blur-xl border-r border-white/5 flex flex-col z-50">
      <div className="py-10 px-6 flex items-center justify-center">
        <img src="/logo.png" alt="Lex.AI Logo" className="w-full h-auto max-w-[190px] drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]" />
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-sm font-medium",
              isActive 
                ? "bg-indigo-600/10 text-white border-l-2 border-indigo-500 rounded-r-lg" 
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            )}
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[#1E293B]">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 text-sm font-medium"
        >
          <LogOut size={18} />
          <span>Sair da Sessão</span>
        </button>
      </div>
    </aside>
  );
}
