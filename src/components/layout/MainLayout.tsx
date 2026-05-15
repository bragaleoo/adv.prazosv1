import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, LayoutDashboard, CalendarClock, Users, CalendarDays, LogOut, Scale, Bell, Kanban, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import { NavLink } from 'react-router-dom';
import { ModalPrazo } from '../ModalPrazo';
import { usePrazos } from '../../hooks/useData';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  refreshData?: () => void;
}

export function MainLayout({ children, title, subtitle, refreshData }: MainLayoutProps) {
  const { user, loading, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewPrazoOpen, setIsNewPrazoOpen] = useState(false);
  const { clients } = usePrazos();

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse uppercase tracking-[0.2em] text-[10px]">AUTH_SYNC_IN_PROGRESS</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const menuLinks = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/processos', icon: <Scale size={18} />, label: 'Processos' },
    { to: '/andamentos', icon: <Bell size={18} />, label: 'Andamentos' },
    { to: '/publicacoes', icon: <BookOpen size={18} />, label: 'Diário Oficial' },
    { to: '/prazos', icon: <CalendarClock size={18} />, label: 'Prazos' },
    { to: '/semana', icon: <CalendarDays size={18} />, label: 'Semana' },
    { to: '/kanban', icon: <Kanban size={18} />, label: 'Kanban' },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-indigo-500/30">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <ModalPrazo 
        isOpen={isNewPrazoOpen} 
        onClose={() => setIsNewPrazoOpen(false)} 
        onSuccess={() => {
          if (refreshData) refreshData();
          setIsNewPrazoOpen(false);
        }}
        clients={clients}
      />

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-80 bg-[#0F172A] border-r border-[#1E293B] z-[70] lg:hidden flex flex-col shadow-2xl shadow-indigo-500/5"
            >
              <div className="p-6 flex items-center justify-between border-b border-[#1E293B]">
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="Lex.AI Logo" className="h-10 w-auto" />
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-slate-500 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 border-b border-[#1E293B] bg-slate-900/50">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">USUÁRIO ATIVO</p>
                <p className="text-xs font-semibold text-slate-200 truncate">{user.email}</p>
              </div>

              <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                <p className="px-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-4 font-mono">Navegação Principal</p>
                {menuLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-xs font-bold uppercase tracking-widest",
                      isActive 
                        ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-sm" 
                        : "text-slate-500 border border-transparent hover:bg-slate-800 hover:text-slate-300"
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
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all text-xs font-bold uppercase tracking-widest"
                >
                  <LogOut size={18} />
                  <span>Sair do Terminal</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header 
          title={title} 
          subtitle={subtitle} 
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNewPrazo={() => setIsNewPrazoOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-6 bg-[#020617]">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-[1600px] mx-auto w-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
