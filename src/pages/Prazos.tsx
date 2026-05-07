import { 
  CalendarClock, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Edit2, 
  Calendar, 
  CheckCircle, 
  Eye,
  ChevronDown,
  User,
  Inbox,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { StatusBadge } from '../components/StatusBadge';
import { usePrazos } from '../hooks/useData';
import { format, parseISO, isPast, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { ModalPrazo } from '../components/ModalPrazo';
import { Prazo } from '../types';
import { supabase } from '../lib/supabase';

export default function Prazos() {
  const { prazos, clients, loading, error, refresh } = usePrazos();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPrazo, setEditingPrazo] = useState<Prazo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleComplete = async (id: string) => {
    if (!confirm('Deseja marcar este prazo como concluído?')) return;
    
    try {
      const { error } = await supabase
        .from('prazos')
        .update({ status: 'concluido', updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      refresh();
    } catch (err) {
      alert('Erro ao concluir prazo.');
    }
  };

  const filteredPrazos = prazos.filter(p => {
    const matchesSearch = 
      p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tipo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Sort: atrasados, hoje, pendentes (by date), concluidos
  const sortedPrazos = [...filteredPrazos].sort((a, b) => {
    if (a.status === 'concluido' && b.status !== 'concluido') return 1;
    if (a.status !== 'concluido' && b.status === 'concluido') return -1;
    
    const dateA = parseISO(a.data_vencimento);
    const dateB = parseISO(b.data_vencimento);
    
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <MainLayout 
      title="Prazos" 
      subtitle="Gerencie seus compromissos e datas fatais."
      refreshData={refresh}
    >
      <ModalPrazo 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPrazo(null);
        }}
        onSuccess={refresh}
        prazo={editingPrazo}
        clients={clients}
      />

      <div className="mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 focus-within:border-indigo-500/50 transition-colors shadow-lg">
            <Search size={20} className="text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por descrição, cliente ou tipo..." 
              className="bg-transparent border-none outline-none w-full text-slate-200 placeholder:text-slate-500 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 px-4 py-3 rounded-2xl hover:bg-slate-700 transition-all font-semibold text-sm shadow-lg">
              <Filter size={18} />
              Filtros
            </button>
            
            <button 
              onClick={() => {
                setEditingPrazo(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
            >
              <Plus size={20} />
              Novo Prazo
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Sincronizando base de dados...</p>
        </div>
      ) : sortedPrazos.length > 0 ? (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#1E293B] flex items-center justify-between bg-slate-900/50">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Listagem de Prazos</h2>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Status: Filtrado</span>
              <span className="text-[10px] font-mono text-slate-500 uppercase">Total: {sortedPrazos.length}</span>
            </div>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase border-b border-[#1E293B] font-mono bg-slate-900/30">
                  <th className="px-6 py-4 font-semibold tracking-wider">Descrição do Prazo</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Cliente</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Vencimento</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Prioridade</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {sortedPrazos.map((prazo) => {
                  const date = parseISO(prazo.data_vencimento);
                  const isAtrasado = isPast(date) && !isToday(date) && prazo.status === 'pendente';
                  const isParaHoje = isToday(date) && prazo.status === 'pendente';

                  return (
                    <tr key={prazo.id} className={cn(
                      "hover:bg-slate-800/30 transition-colors group text-sm",
                      isAtrasado ? "bg-rose-500/[0.02]" : ""
                    )}>
                      <td className="px-6 py-4">
                        <div>
                          <p className={cn(
                            "font-medium",
                            prazo.status === 'concluido' ? "text-slate-500 line-through" : "text-slate-200"
                          )}>
                            {prazo.descricao}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{prazo.tipo || 'GERAL'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-[#1E293B] flex items-center justify-center text-[10px] font-bold text-slate-400">
                            {prazo.client?.nome?.charAt(0) || '?'}
                          </div>
                          <p className="text-slate-300">{(prazo.client?.nome || 'Não definido').replace(/^=/, '')}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className={cn(
                            "font-mono text-xs",
                            isAtrasado ? "text-rose-500" : isParaHoje ? "text-amber-500" : "text-slate-400"
                          )}>
                            {format(date, 'dd/MM/yyyy')}
                          </p>
                          {isAtrasado && <p className="text-[9px] font-bold text-rose-600 uppercase tracking-tighter">Atrasado</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge variant={prazo.prioridade?.toLowerCase() as any}>
                          {prazo.prioridade || 'Normal'}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <StatusBadge variant={isAtrasado ? 'atrasado' : prazo.status as any}>
                            {prazo.status === 'pendente' && isAtrasado ? 'Atrasado' : prazo.status}
                          </StatusBadge>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingPrazo(prazo);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors" title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleComplete(prazo.id)}
                            className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors" title="Concluir"
                          >
                            <CheckCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-[#1E293B]">
            {sortedPrazos.map((prazo) => {
              const date = parseISO(prazo.data_vencimento);
              const isAtrasado = isPast(date) && !isToday(date) && prazo.status === 'pendente';
              
              return (
                <div key={prazo.id} className="p-5 space-y-4 bg-slate-900/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={cn(
                        "text-sm font-bold text-slate-200",
                        prazo.status === 'concluido' && "text-slate-600 line-through"
                      )}>{prazo.descricao}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <StatusBadge variant={isAtrasado ? 'atrasado' : (prazo.status as any)}>
                          {prazo.status}
                        </StatusBadge>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">{prazo.tipo}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1E293B]">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Cliente</p>
                      <p className="text-xs font-semibold text-slate-400">{prazo.client?.nome || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Vencimento</p>
                      <p className={cn(
                        "text-xs font-mono",
                        isAtrasado ? "text-rose-500" : "text-slate-400"
                      )}>{format(date, 'dd/MM/yyyy')}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => {
                        setEditingPrazo(prazo);
                        setIsModalOpen(true);
                      }}
                      className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-700 transition-colors"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleComplete(prazo.id)}
                      className="flex-1 bg-emerald-600/10 text-emerald-500 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600/20 transition-colors"
                    >
                      Concluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 flex flex-col items-center text-center shadow-xl">
          <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-600 mb-6 border border-slate-700/50">
            <Inbox size={40} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nenhum prazo encontrado</h3>
          <p className="text-slate-500 max-w-sm font-medium">
            Tente ajustar seus filtros ou cadastre um novo compromisso para começar a gerenciar sua pauta.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
          >
            <Plus size={20} />
            Cadastrar Primeiro Prazo
          </button>
        </div>
      )}
    </MainLayout>
  );
}
