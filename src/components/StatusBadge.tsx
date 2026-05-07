import { cn } from '../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'pendente' | 'concluido' | 'atrasado' | 'hoje' | 'amanha' | 'default' | 'alta' | 'media' | 'baixa';
  className?: string;
}

export function StatusBadge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    pendente: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    concluido: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    atrasado: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    hoje: 'bg-rose-500/10 text-rose-500 border-rose-500/40 font-bold',
    amanha: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    alta: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    media: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    baixa: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    urgente: 'bg-rose-500/20 text-rose-500 border-rose-500/40 font-bold',
    default: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
  };

  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border transition-colors",
      variants[variant as keyof typeof variants] || variants.default,
      className
    )}>
      {children}
    </span>
  );
}
