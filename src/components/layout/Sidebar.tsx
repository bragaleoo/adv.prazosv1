import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarClock, 
  Users, 
  CalendarDays, 
  LogOut,
  Scale,
  Bell,
  Kanban,
  FileSearch,
  BookOpen
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface NavGroup {
  label: string;
  links: { to: string; icon: ReactNode; label: string; badge?: number }[];
}

export function Sidebar() {
  const { signOut } = useAuth();

  const navGroups: NavGroup[] = [
    {
      label: 'Visão Geral',
      links: [
        { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
        { to: '/semana', icon: <CalendarDays size={18} />, label: 'Semana' },
      ],
    },
    {
      label: 'Jurídico',
      links: [
        { to: '/processos', icon: <Scale size={18} />, label: 'Processos' },
        { to: '/andamentos', icon: <Bell size={18} />, label: 'Andamentos' },
        { to: '/publicacoes', icon: <BookOpen size={18} />, label: 'Diário Oficial' },
        { to: '/prazos', icon: <CalendarClock size={18} />, label: 'Prazos' },
      ],
    },
    {
      label: 'Gestão',
      links: [
        { to: '/kanban', icon: <Kanban size={18} />, label: 'Kanban' },
      ],
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900/60 backdrop-blur-xl border-r border-white/5 flex flex-col z-50">
      <div className="py-10 px-6 flex items-center justify-center">
        <img src="/logo.png" alt="Lex.AI Logo" className="w-full h-auto max-w-[190px] drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]" />
      </div>

      <nav className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar pb-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-4 mb-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest font-mono">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group text-sm font-medium",
                    isActive
                      ? "bg-indigo-600/10 text-white border-l-2 border-indigo-500 rounded-r-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  )}
                >
                  {link.icon}
                  <span>{link.label}</span>
                  {link.badge != null && link.badge > 0 && (
                    <span className="ml-auto bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
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
