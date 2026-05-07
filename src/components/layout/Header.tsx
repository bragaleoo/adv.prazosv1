import { Bell, Search, Plus, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenMobileMenu?: () => void;
  onNewPrazo?: () => void;
}

export function Header({ title, subtitle, onOpenMobileMenu, onNewPrazo }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-slate-900/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-400 hover:text-white"
        >
          <Menu size={24} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={onNewPrazo}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2 active:scale-95"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo Prazo</span>
        </button>
      </div>
    </header>
  );
}
