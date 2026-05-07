import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  AlertCircle,
  Gavel,
  User,
  MoreVertical
} from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { usePrazos } from '../hooks/useData';
import { 
  format, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  parseISO, 
  isToday, 
  isPast,
  addWeeks,
  subWeeks
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { StatusBadge } from '../components/StatusBadge';

export default function Semana() {
  const { prazos, loading } = usePrazos();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const nextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const prevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const resetToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getPrazosForDay = (day: Date) => {
    return prazos.filter(p => isSameDay(parseISO(p.data_vencimento), day));
  };

  const atrasados = prazos.filter(p => p.status === 'pendente' && isPast(parseISO(p.data_vencimento)) && !isToday(parseISO(p.data_vencimento)));

  return (
    <MainLayout 
      title="Agenda Semanal" 
      subtitle={`Estratégia e pauta para a semana de ${format(currentWeekStart, "d 'de' MMMM", { locale: ptBR })}.`}
    >
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 glass-panel rounded-lg p-0.5">
          <button 
            onClick={prevWeek}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={resetToToday}
            className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
          >
            Corrente
          </button>
          <button 
            onClick={nextWeek}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="glass-panel px-6 py-2 rounded-lg flex items-center gap-3">
          <Calendar size={14} className="text-indigo-500" />
          <p className="text-[10px] font-mono font-bold text-slate-200 uppercase tracking-[0.2em]">
            {format(currentWeekStart, "dd/MM")} — {format(addDays(currentWeekStart, 6), "dd/MM")}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {daysOfWeek.map((day, idx) => {
          const dayPrazos = getPrazosForDay(day);
          const isTodayDay = isToday(day);

          return (
            <div 
              key={idx} 
              className={cn(
                "flex-1 min-w-[280px] flex flex-col rounded-xl overflow-hidden shadow-xl border h-[calc(100vh-320px)]",
                isTodayDay ? "bg-slate-900/80 border-indigo-500/50 backdrop-blur-xl" : "glass-panel"
              )}
            >
              <div className={cn(
                "p-4 border-b",
                isTodayDay ? "bg-indigo-600/10 border-indigo-500/30" : "bg-slate-900/30 border-white/5"
              )}>
                <p className={cn(
                  "text-[9px] font-bold uppercase tracking-[0.2em] mb-1 font-mono",
                  isTodayDay ? "text-indigo-400" : "text-slate-500"
                )}>
                  {format(day, 'EEEE', { locale: ptBR })}
                </p>
                <div className="flex items-center justify-between">
                  <h4 className={cn(
                    "text-xl font-bold tracking-tight",
                    isTodayDay ? "text-white" : "text-slate-200"
                  )}>{format(day, 'dd')}</h4>
                  {dayPrazos.length > 0 && (
                    <span className={cn(
                      "flex items-center justify-center h-5 w-5 rounded text-[10px] font-mono font-bold",
                      isTodayDay ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
                    )}>
                      {dayPrazos.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-transparent custom-scrollbar">
                {dayPrazos.length > 0 ? (
                  dayPrazos.map((prazo) => (
                    <div 
                      key={prazo.id} 
                      className="bg-slate-900/50 border border-white/5 rounded-lg p-3 hover:-translate-y-0.5 hover:shadow-lg transition-all group relative"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge variant={prazo.prioridade?.toLowerCase() as any} className="text-[7px] px-1 py-0">
                          {prazo.prioridade || 'Normal'}
                        </StatusBadge>
                        <span className="text-[8px] font-mono text-slate-600 uppercase">
                          {prazo.tipo || 'GERAL'}
                        </span>
                      </div>
                      
                      <h5 className={cn(
                        "text-[11px] font-semibold text-slate-200 leading-tight mb-2",
                        prazo.status === 'concluido' && "line-through text-slate-600"
                      )}>
                        {prazo.descricao}
                      </h5>

                      <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500">
                        <User size={10} className="text-slate-700" />
                        <span className="truncate uppercase font-mono tracking-tighter">{prazo.client?.nome || 'N/A'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-10">
                    <Gavel size={24} className="mb-2" />
                    <p className="text-[8px] font-bold uppercase tracking-widest text-center">Empty Stage</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {atrasados.length > 0 && (
        <div className="mt-6">
          <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 text-rose-500 rounded-lg">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-400 uppercase tracking-tight">Anomalias: {atrasados.length} Prazos Pendentes</h4>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Atenção: Existem compromissos críticos aguardando resolução imediata.</p>
              </div>
            </div>
            <button className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] uppercase tracking-widest px-6 py-2.5 rounded-lg transition-all active:scale-95">
              Resolver Pendências
            </button>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
