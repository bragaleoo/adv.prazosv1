import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useKanban } from '../hooks/useData';
import { useProcessos, usePrazos } from '../hooks/useData';
import { TarefaKanban, KanbanStatus } from '../types';
import {
  Kanban as KanbanIcon, Plus, X, Loader2, Calendar,
  Scale, User, GripVertical, CheckCircle2, Circle, Zap
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const COLUNAS: { key: KanbanStatus; label: string; color: string; bg: string }[] = [
  { key: 'a_fazer', label: 'A Fazer', color: 'text-slate-300', bg: 'bg-slate-700/50' },
  { key: 'fazendo', label: 'Em Andamento', color: 'text-indigo-300', bg: 'bg-indigo-600/10' },
  { key: 'concluido', label: 'Concluído', color: 'text-emerald-300', bg: 'bg-emerald-600/10' },
];

interface ModalTarefaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  processos: any[];
  clientes: any[];
  status?: KanbanStatus;
}

function ModalTarefa({ isOpen, onClose, onSuccess, processos, clientes, status = 'a_fazer' }: ModalTarefaProps) {
  const { criarTarefa } = useKanban();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    status,
    processo_id: '',
    cliente_id: '',
    data_vencimento: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await criarTarefa({
        ...form,
        processo_id: form.processo_id || null,
        cliente_id: form.cliente_id || null,
        data_vencimento: form.data_vencimento || null,
      });
      onSuccess();
      onClose();
      setForm({ titulo: '', descricao: '', status, processo_id: '', cliente_id: '', data_vencimento: '' });
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-white font-bold">Nova Tarefa</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Título *</label>
              <input
                required
                placeholder="Ex: Preparar recurso de apelação"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Descrição</label>
              <textarea
                placeholder="Detalhes da tarefa..."
                value={form.descricao || ''}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={2}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Coluna</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as KanbanStatus }))}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none appearance-none"
                >
                  {COLUNAS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Vencimento</label>
                <input
                  type="date"
                  value={form.data_vencimento}
                  onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none appearance-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Processo</label>
              <select
                value={form.processo_id}
                onChange={e => setForm(f => ({ ...f, processo_id: e.target.value }))}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none appearance-none"
              >
                <option value="">— Sem processo —</option>
                {processos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-white/10 rounded-lg text-slate-400 hover:text-white text-sm font-medium transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 size={13} className="animate-spin" />}
                Criar Tarefa
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CardTarefa({ tarefa, onMover, onDeletar }: {
  tarefa: TarefaKanban;
  onMover: (id: string, status: KanbanStatus) => Promise<void>;
  onDeletar: (id: string) => Promise<void>;
}): React.JSX.Element {
  const [movendo, setMovendo] = useState(false);
  const vencida = tarefa.data_vencimento && isPast(parseISO(tarefa.data_vencimento)) && tarefa.status !== 'concluido';
  const venceHoje = tarefa.data_vencimento && isToday(parseISO(tarefa.data_vencimento));

  const proximaColuna = (): KanbanStatus | null => {
    if (tarefa.status === 'a_fazer') return 'fazendo';
    if (tarefa.status === 'fazendo') return 'concluido';
    return null;
  };

  const handleAvancar = async () => {
    const prox = proximaColuna();
    if (!prox) return;
    setMovendo(true);
    try { await onMover(tarefa.id, prox); } finally { setMovendo(false); }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'bg-slate-900/80 border rounded-xl p-4 cursor-grab active:cursor-grabbing group transition-all',
        vencida ? 'border-rose-500/30' : 'border-white/5 hover:border-white/10'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-white leading-snug flex-1">{tarefa.titulo}</h3>
        <button
          onClick={() => onDeletar(tarefa.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all p-0.5"
        >
          <X size={13} />
        </button>
      </div>

      {tarefa.descricao && (
        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{tarefa.descricao}</p>
      )}

      <div className="mt-3 space-y-1.5">
        {tarefa.processo && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-400">
            <Scale size={10} />
            <span className="truncate">{tarefa.processo.titulo}</span>
          </div>
        )}
        {tarefa.cliente && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <User size={10} />
            <span>{tarefa.cliente.nome}</span>
          </div>
        )}
        {tarefa.data_vencimento && (
          <div className={cn('flex items-center gap-1.5 text-xs font-medium', vencida ? 'text-rose-400' : venceHoje ? 'text-amber-400' : 'text-slate-500')}>
            <Calendar size={10} />
            {vencida ? 'Vencida · ' : venceHoje ? 'Hoje · ' : ''}
            {format(parseISO(tarefa.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
          </div>
        )}
      </div>

      {proximaColuna() && (
        <button
          onClick={handleAvancar}
          disabled={movendo}
          className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/30 text-slate-500 hover:text-indigo-300 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
        >
          {movendo ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
          {proximaColuna() === 'fazendo' ? 'Iniciar' : 'Concluir'}
        </button>
      )}
    </motion.div>
  );
}

export default function Kanban() {
  const { tarefas, loading, refresh, criarTarefa, moverTarefa, deletarTarefa } = useKanban();
  const { processos } = useProcessos();
  const { clients } = usePrazos();
  const [modalAberto, setModalAberto] = useState(false);
  const [colunaModal, setColunaModal] = useState<KanbanStatus>('a_fazer');

  const abrirModal = (coluna: KanbanStatus) => {
    setColunaModal(coluna);
    setModalAberto(true);
  };

  if (loading && tarefas.length === 0) {
    return (
      <MainLayout title="Kanban" subtitle="Carregando...">
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      </MainLayout>
    );
  }

  const totalAtivas = tarefas.filter(t => t.status !== 'concluido').length;

  return (
    <MainLayout
      title="Gestão de Tarefas"
      subtitle={`${totalAtivas} tarefa${totalAtivas !== 1 ? 's' : ''} ativa${totalAtivas !== 1 ? 's' : ''}`}
    >
      <ModalTarefa
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onSuccess={refresh}
        processos={processos}
        clientes={clients}
        status={colunaModal}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
        {COLUNAS.map(coluna => {
          const tarefasColuna = tarefas.filter(t => t.status === coluna.key);
          return (
            <div key={coluna.key} className="flex flex-col min-h-[500px]">
              {/* Header da coluna */}
              <div className={cn('flex items-center justify-between px-4 py-3 rounded-t-xl border border-b-0 border-white/5', coluna.bg)}>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-bold uppercase tracking-widest', coluna.color)}>
                    {coluna.label}
                  </span>
                  <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {tarefasColuna.length}
                  </span>
                </div>
                <button
                  onClick={() => abrirModal(coluna.key)}
                  className="text-slate-500 hover:text-white transition-colors"
                  title="Adicionar tarefa"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Cards */}
              <div className="flex-1 bg-slate-900/30 border border-white/5 rounded-b-xl p-3 space-y-3 overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {tarefasColuna.map(tarefa => (
                    <CardTarefa
                      key={tarefa.id}
                      tarefa={tarefa}
                      onMover={moverTarefa}
                      onDeletar={deletarTarefa}
                    />
                  ))}
                </AnimatePresence>

                {tarefasColuna.length === 0 && (
                  <div className="text-center py-10">
                    <Circle size={24} className="mx-auto text-slate-700 mb-2" />
                    <p className="text-slate-600 text-xs">Nenhuma tarefa</p>
                  </div>
                )}

                <button
                  onClick={() => abrirModal(coluna.key)}
                  className="w-full py-2 border border-dashed border-white/10 hover:border-white/20 text-slate-600 hover:text-slate-400 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus size={12} />
                  Adicionar tarefa
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
}
