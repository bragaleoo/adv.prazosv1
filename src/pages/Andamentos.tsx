import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAndamentos } from '../hooks/useData';
import { Andamento } from '../types';
import {
  Bell, CheckCircle2, AlertTriangle, Clock, Loader2,
  FileText, ChevronRight, Filter, Zap, Calendar, Scale
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const URGENCIA_CONFIG = {
  alta: {
    label: 'Urgente',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    dot: 'bg-rose-400',
    icon: <AlertTriangle size={12} />,
  },
  media: {
    label: 'Atenção',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    icon: <Clock size={12} />,
  },
  baixa: {
    label: 'Informativo',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    dot: 'bg-slate-400',
    icon: <FileText size={12} />,
  },
};

function CardAndamento({ andamento, onMarcarTratado }: {
  andamento: Andamento;
  onMarcarTratado: (id: string) => Promise<void>;
}): React.JSX.Element {
  const [tratando, setTratando] = useState(false);
  const sugestao = andamento.sugestao_ia;
  const urgCfg = sugestao
    ? URGENCIA_CONFIG[sugestao.urgencia] || URGENCIA_CONFIG.baixa
    : URGENCIA_CONFIG.baixa;

  const handleTratar = async () => {
    setTratando(true);
    try {
      await onMarcarTratado(andamento.id);
    } finally {
      setTratando(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-panel rounded-xl p-5 border transition-all',
        andamento.tratado
          ? 'opacity-50 border-white/5'
          : sugestao?.urgencia === 'alta'
            ? 'border-rose-500/20 shadow-rose-500/5 shadow-lg'
            : 'border-white/5'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {sugestao && (
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                urgCfg.bg, urgCfg.text, urgCfg.border
              )}>
                {urgCfg.icon}
                {urgCfg.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 rounded-full text-[10px] text-slate-400 font-mono">
              <Scale size={10} />
              {andamento.processo?.tribunal || '—'}
            </span>
            {andamento.tratado && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 rounded-full text-[10px] text-emerald-400 font-semibold">
                <CheckCircle2 size={10} />
                Tratado
              </span>
            )}
          </div>

          {/* Processo */}
          <div className="text-xs text-indigo-400 font-medium mb-1.5">
            {andamento.processo?.titulo || 'Processo sem título'}
          </div>

          {/* Descrição do andamento */}
          <p className="text-sm text-slate-200 font-medium leading-snug mb-3">
            {andamento.descricao}
          </p>

          {/* Sugestão IA */}
          {sugestao && (
            <div className="bg-slate-800/60 border border-white/5 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Zap size={11} className="text-indigo-400" />
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Sugestão IA</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">{sugestao.acao}</p>
              {sugestao.prazo_dias > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  Prazo estimado: <span className="text-amber-400 font-semibold">{sugestao.prazo_dias} dia{sugestao.prazo_dias !== 1 ? 's' : ''}</span>
                </p>
              )}
              <p className="text-xs text-slate-600 mt-1 italic">{sugestao.justificativa}</p>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {format(parseISO(andamento.data_andamento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <span>·</span>
            <span>{formatDistanceToNow(parseISO(andamento.data_andamento), { addSuffix: true, locale: ptBR })}</span>
          </div>
        </div>

        {/* Actions */}
        {!andamento.tratado && (
          <button
            onClick={handleTratar}
            disabled={tratando}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          >
            {tratando ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Tratado
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function Andamentos() {
  const { andamentos, loading, refresh, marcarTratado } = useAndamentos();
  const [mostrarTratados, setMostrarTratados] = useState(false);
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>('todos');

  const naoTratados = andamentos.filter(a => !a.tratado);
  const tratados = andamentos.filter(a => a.tratado);

  const filtrados = (mostrarTratados ? andamentos : naoTratados).filter(a => {
    if (filtroUrgencia === 'todos') return true;
    return a.sugestao_ia?.urgencia === filtroUrgencia;
  });

  const urgentesHoje = naoTratados.filter(a => a.sugestao_ia?.urgencia === 'alta').length;
  const atencaoHoje = naoTratados.filter(a => a.sugestao_ia?.urgencia === 'media').length;

  if (loading) {
    return (
      <MainLayout title="Andamentos" subtitle="Carregando...">
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Andamentos"
      subtitle="Movimentações processuais monitoradas automaticamente"
    >
      {/* Contadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel rounded-xl p-4 border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Não tratados</p>
          <p className="text-3xl font-bold text-white mt-1">{naoTratados.length}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-rose-500/20">
          <p className="text-[10px] text-rose-400 uppercase tracking-widest font-mono">Urgentes</p>
          <p className="text-3xl font-bold text-rose-400 mt-1">{urgentesHoje}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-amber-500/20">
          <p className="text-[10px] text-amber-400 uppercase tracking-widest font-mono">Atenção</p>
          <p className="text-3xl font-bold text-amber-400 mt-1">{atencaoHoje}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-emerald-500/20">
          <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono">Tratados</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{tratados.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'alta', label: '🔴 Urgente' },
            { key: 'media', label: '🟡 Atenção' },
            { key: 'baixa', label: '⚪ Informativo' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroUrgencia(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                filtroUrgencia === f.key
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarTratados(!mostrarTratados)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
              mostrarTratados
                ? 'bg-slate-700 text-slate-200 border-white/10'
                : 'text-slate-500 border-transparent hover:border-white/10 hover:text-slate-300'
            )}
          >
            {mostrarTratados ? 'Ocultar tratados' : 'Mostrar tratados'}
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-white border border-white/10 hover:bg-slate-800 rounded-lg text-xs font-semibold transition-all"
          >
            <Bell size={12} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="glass-panel rounded-xl p-16 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-700 mb-4" />
          <p className="text-slate-500 font-medium">Nenhum andamento pendente</p>
          <p className="text-slate-600 text-sm mt-1">
            Consulte o DataJud na página de Processos para capturar novos andamentos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtrados.map(andamento => (
              <CardAndamento
                key={andamento.id}
                andamento={andamento}
                onMarcarTratado={marcarTratado}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </MainLayout>
  );
}
