import { 
  CalendarClock, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Bell, 
  BellOff,
  ChevronRight,
  User,
  ExternalLink
} from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { CardResumo } from '../components/CardResumo';
import { StatusBadge } from '../components/StatusBadge';
import { usePrazos } from '../hooks/useData';
import { 
  format, 
  isToday, 
  isTomorrow, 
  isBefore, 
  startOfDay, 
  endOfDay, 
  addDays, 
  startOfWeek, 
  endOfWeek,
  parseISO,
  differenceInDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from 'recharts';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { prazos, loading, error } = usePrazos();

  if (loading) {
    return <MainLayout title="Dashboard" subtitle="Carregando estatísticas..."><div /></MainLayout>;
  }

  const today = startOfDay(new Date());
  
  const pendentes = prazos.filter(p => p.status === 'pendente');
  const vencemHoje = pendentes.filter(p => isToday(parseISO(p.data_vencimento)));
  const vencemAmanha = pendentes.filter(p => isTomorrow(parseISO(p.data_vencimento)));
  
  const startOfThisWeek = startOfWeek(new Date(), { weekStartsOn: 0 });
  const endOfThisWeek = endOfWeek(new Date(), { weekStartsOn: 0 });
  const prazosSemana = pendentes.filter(p => {
    const d = parseISO(p.data_vencimento);
    return d >= startOfThisWeek && d <= endOfThisWeek;
  });

  const atrasados = pendentes.filter(p => isBefore(parseISO(p.data_vencimento), today));
  
  const totalConcluidos = prazos.filter(p => p.status === 'concluido');

  const notificados = prazos.filter(p => p.notificado);
  const naoNotificados = prazos.filter(p => !p.notificado);

  const statsCards = [
    { title: 'Prazos Pendentes', value: pendentes.length, icon: <CalendarClock size={20} />, description: 'Total em aberto', colorClass: "text-amber-500", iconColorClass: "bg-amber-500/10 text-amber-500" },
    { title: 'Vencem Hoje', value: vencemHoje.length, icon: <Clock size={20} />, description: 'Ação imediata', colorClass: "text-rose-500", iconColorClass: "bg-rose-500/10 text-rose-500" },
    { title: 'Vencem Amanhã', value: vencemAmanha.length, icon: <AlertCircle size={20} />, description: 'Preparar agora', colorClass: "text-indigo-500", iconColorClass: "bg-indigo-500/10 text-indigo-500" },
    { title: 'Prazos da Semana', value: prazosSemana.length, icon: <Calendar size={20} />, description: 'Próximos 7 dias', colorClass: "text-blue-500", iconColorClass: "bg-blue-500/10 text-blue-500" },
    { title: 'Total Concluídos', value: totalConcluidos.length, icon: <CheckCircle2 size={20} />, description: 'Total finalizado', colorClass: "text-emerald-500", iconColorClass: "bg-emerald-500/10 text-emerald-500" },
    { title: 'Atrasados', value: atrasados.length, icon: <AlertCircle size={20} />, description: 'Crítico', colorClass: "text-rose-600", iconColorClass: "bg-rose-600/10 text-rose-600" },
    { title: 'Notificados', value: notificados.length, icon: <Bell size={20} />, description: 'Total enviados', colorClass: "text-cyan-500", iconColorClass: "bg-cyan-500/10 text-cyan-500" },
    { title: 'Não Notificados', value: naoNotificados.length, icon: <BellOff size={20} />, description: 'Aguardando', colorClass: "text-slate-400", iconColorClass: "bg-slate-500/10 text-slate-400" },
  ];

  // Chart data
  const statusData = [
    { name: 'Pendentes', value: pendentes.length, color: '#f59e0b' },
    { name: 'Concluídos', value: prazos.length - pendentes.length, color: '#10b981' },
    { name: 'Atrasados', value: atrasados.length, color: '#e11d48' },
  ];

  const priorityData = [
    { name: 'Alta', value: prazos.filter(p => p.prioridade?.toLowerCase() === 'alta').length, color: '#e11d48' },
    { name: 'Média', value: prazos.filter(p => ['media', 'média'].includes(p.prioridade?.toLowerCase())).length, color: '#f59e0b' },
    { name: 'Baixa', value: prazos.filter(p => p.prioridade?.toLowerCase() === 'baixa').length, color: '#3b82f6' },
  ];

  const nextDeadlines = [...pendentes]
    .sort((a, b) => parseISO(a.data_vencimento).getTime() - parseISO(b.data_vencimento).getTime())
    .slice(0, 5);

  return (
    <MainLayout 
      title="Dashboard Operacional" 
      subtitle={`Bom dia. Você tem ${vencemHoje.length} prazos urgentes para hoje.`}
    >
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <CardResumo title="Pendentes" value={pendentes.length} icon={<Clock size={16} />} description="+4 novos esta semana" colorClass="text-white" iconColorClass="bg-amber-500/10 text-amber-500" />
        <CardResumo title="Vencem Hoje" value={vencemHoje.length} icon={<AlertCircle size={16} />} description="Atenção necessária" colorClass="text-rose-400" iconColorClass="bg-rose-500/10 text-rose-500" />
        <CardResumo title="Atrasados" value={atrasados.length} icon={<AlertCircle size={16} />} description="Ver pendências" colorClass="text-red-500" iconColorClass="bg-red-500/10 text-red-500" />
        <CardResumo title="Total Concluídos" value={totalConcluidos.length} icon={<CheckCircle2 size={16} />} description="Total finalizado" colorClass="text-emerald-400" iconColorClass="bg-emerald-500/10 text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 min-h-0">
        <div className="lg:col-span-2 flex flex-col min-h-0">
          {/* Próximos Vencimentos */}
          <section className="glass-panel rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-300">Próximos Vencimentos</h2>
              <span className="text-xs font-mono text-slate-500">ORDEM: DATA CRESCENTE</span>
            </div>
            
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-white/5 font-mono bg-slate-900/40">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Descrição do Prazo</th>
                    <th className="px-6 py-3 font-semibold">Cliente</th>
                    <th className="px-6 py-3 font-semibold">Vencimento</th>
                    <th className="px-6 py-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {nextDeadlines.length > 0 ? (
                    nextDeadlines.map((prazo) => {
                      const date = parseISO(prazo.data_vencimento);
                      return (
                        <tr key={prazo.id} className="hover:bg-slate-800/50 transition-all group cursor-pointer text-sm">
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{prazo.descricao}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{prazo.tipo || 'Geral'}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {prazo.client?.nome || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className={cn(
                              "text-sm font-mono",
                              isToday(date) ? "text-rose-400" : "text-slate-400"
                            )}>
                              {isToday(date) ? 'HOJE' : format(date, 'dd/MM/yyyy')}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={cn(
                              "inline-block w-2 h-2 rounded-full shadow-sm",
                              isToday(date) ? "bg-rose-500 shadow-rose-500/50" : "bg-amber-500"
                            )}></span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-500 font-medium">Nenhum prazo pendente.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            </section>
          </div>


        <div className="space-y-6">
          {/* Distribuição */}
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-300 mb-6">Distribuição de Status</h2>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {statusData.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                    <span className="text-slate-400 font-medium">{s.name}</span>
                  </div>
                  <span className="font-mono text-slate-200">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

import { Gavel as GavelIcon } from 'lucide-react';
const Gavel = GavelIcon;
