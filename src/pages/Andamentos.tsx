import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAndamentos } from '../hooks/useData';
import { Andamento } from '../types';
import {
  Bell, CheckCircle2, AlertTriangle, Clock, Loader2,
  FileText, ChevronRight, Filter, Zap, Calendar, Scale,
  Search, SlidersHorizontal, ChevronDown, ChevronUp, ArrowUpDown
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { formatarNumeroCNJ } from '../lib/escavador';

interface ParsedField {
  label: string;
  value: string;
}

interface ParsedAndamento {
  metadata: ParsedField[];
  mainText: string;
  title: string;
}

/**
 * Analisa o texto de andamento e extrai campos chave-valor formatando-os de forma estruturada.
 */
function parseAndamentoDescricao(text: string): ParsedAndamento {
  if (!text) return { metadata: [], mainText: '', title: '' };

  let decoded = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Regex para capturar pares Chave : Valor jurídicos comuns
  const pattern = /(EXEQUENTE|EXECUTADO|ADVOGADO|ADV\.?|RELATORA?|IMPETRANTE|IMPETRADO|PACIENTE|INTERESSADO|NÚMERO ÚNICO|PROC\.?|AUTOR|RÉU|POLO ATIVO|POLO PASSIVO)\s*:\s*([\s\S]+?)(?=\s*(?:EXEQUENTE|EXECUTADO|ADVOGADO|ADV\.?|RELATORA?|IMPETRANTE|IMPETRADO|PACIENTE|INTERESSADO|DECISÃO\/DESPACHO|DESPACHO|DECISÃO|SENTENÇA|NÚMERO ÚNICO|PROC\.?|AUTOR|RÉU|POLO ATIVO|POLO PASSIVO|\r?\n\r?\n|$))/gi;

  const metadata: ParsedField[] = [];
  let remainingText = decoded;
  let match;

  while ((match = pattern.exec(decoded)) !== null) {
    const label = match[1].toUpperCase();
    const value = match[2].trim();
    
    metadata.push({ label, value });
    remainingText = remainingText.replace(match[0], '');
  }

  // Extrai títulos como DECISÃO, DESPACHO, SENTENÇA do texto
  let title = '';
  const titleMatch = decoded.match(/(DECISÃO\/DESPACHO|DESPACHO|DECISÃO|SENTENÇA|DESPACHO\/DECISÃO)/i);
  if (titleMatch) {
    title = titleMatch[0].toUpperCase();
    remainingText = remainingText.replace(new RegExp(`${title}\\s*:?\\s*`, 'gi'), '');
  }

  remainingText = remainingText
    .replace(/\s+/g, ' ')
    .replace(/^\s*[-.:;,\s]+/g, '')
    .trim();

  return {
    metadata,
    mainText: remainingText,
    title
  };
}

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
  const [expanded, setExpanded] = useState(false);
  
  const parsed = parseAndamentoDescricao(andamento.descricao);
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

  const hasMetadata = parsed.metadata.length > 0;
  const hasMainText = parsed.mainText.trim() !== '';

  const rawText = hasMainText ? parsed.mainText : andamento.descricao;
  const hasLongText = rawText.length > 300;
  
  const displayText = expanded 
    ? rawText 
    : (hasLongText ? rawText.slice(0, 300) + '...' : rawText);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-panel rounded-2xl p-6 border transition-all duration-300 relative overflow-hidden group',
        andamento.tratado
          ? 'opacity-55 border-white/5'
          : sugestao?.urgencia === 'alta'
            ? 'border-rose-500/20 shadow-rose-500/5 shadow-xl bg-gradient-to-b from-rose-500/[0.02] to-transparent'
            : 'border-white/5 hover:border-white/10'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          
          {/* Top Header Row */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {sugestao && (
              <span className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                urgCfg.bg, urgCfg.text, urgCfg.border
              )}>
                {urgCfg.icon}
                {urgCfg.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-950/60 rounded-full text-[10px] text-slate-400 font-mono border border-white/5">
              <Scale size={10} />
              {andamento.processo?.tribunal || '—'}
            </span>
            {parsed.title && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {parsed.title}
              </span>
            )}
            {andamento.tratado && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                <CheckCircle2 size={10} />
                Tratado
              </span>
            )}
          </div>

          {/* Process Title and CNJ */}
          <div className="text-sm font-semibold mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
            <span className="text-white font-serif line-clamp-1">{andamento.processo?.titulo || 'Processo sem título'}</span>
            {andamento.processo?.numero_cnj && (
              <span className="text-xs text-indigo-400/80 font-mono flex-shrink-0 bg-indigo-500/[0.03] border border-indigo-500/10 px-2 py-0.5 rounded">
                {formatarNumeroCNJ(andamento.processo.numero_cnj)}
              </span>
            )}
          </div>

          {/* Structured Metadata Grid */}
          {hasMetadata && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 bg-slate-950/40 border border-white/5 rounded-xl p-4 mb-3 font-sans text-xs">
              {parsed.metadata.map((meta, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-1 gap-2">
                  <span className="text-slate-500 font-mono uppercase font-bold shrink-0">{meta.label}</span>
                  <span className="text-slate-300 font-medium sm:text-right break-all">{meta.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Detailed Decision / Text Body */}
          {(hasMainText || !hasMetadata) && (
            <div className="text-[14px] text-slate-300 leading-relaxed font-sans mb-3 pr-2 bg-slate-950/20 rounded-xl p-4 border border-white/5">
              <p className="whitespace-pre-wrap break-words">{displayText}</p>
              
              {hasLongText && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 mt-2.5 transition-colors cursor-pointer"
                >
                  {expanded ? (
                    <>
                      Ver menos <ChevronUp size={12} />
                    </>
                  ) : (
                    <>
                      Ver mais <ChevronDown size={12} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* AI Suggestion Box */}
          {sugestao && (
            <div className="bg-indigo-500/[0.03] border border-indigo-500/15 rounded-xl p-4 mb-4 relative group/sug">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.02] to-transparent opacity-0 group-hover/sug:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center gap-1.5 mb-2 relative z-10">
                <Zap size={13} className="text-indigo-400 animate-pulse" />
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Sugestão da Inteligência Artificial</span>
              </div>
              <p className="text-xs text-slate-200 font-medium leading-relaxed relative z-10">{sugestao.acao}</p>
              {sugestao.prazo_dias > 0 && (
                <p className="text-xs text-slate-400 mt-2 relative z-10">
                  Prazo sugerido: <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono text-[10px]">{sugestao.prazo_dias} dia{sugestao.prazo_dias !== 1 ? 's' : ''}</span>
                </p>
              )}
              <p className="text-xs text-slate-500 mt-2 italic relative z-10 border-t border-white/5 pt-2">“{sugestao.justificativa}”</p>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="flex items-center gap-3 text-xs text-slate-500 font-sans border-t border-white/5 pt-3">
            <span className="flex items-center gap-1.5">
              <Calendar size={11} className="text-slate-650" />
              {format(parseISO(andamento.data_andamento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-450 font-medium">{formatDistanceToNow(parseISO(andamento.data_andamento), { addSuffix: true, locale: ptBR })}</span>
          </div>
        </div>

        {/* Action Button */}
        {!andamento.tratado && (
          <button
            onClick={handleTratar}
            disabled={tratando}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 cursor-pointer shadow-md shadow-emerald-500/5"
            title="Marcar como tratado"
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
  const [filtroProcesso, setFiltroProcesso] = useState<string>('todos');
  const [filtroTribunal, setFiltroTribunal] = useState<string>('todos');
  const [ordenacao, setOrdenacao] = useState<string>('data_desc');
  const [busca, setBusca] = useState<string>('');

  const naoTratados = andamentos.filter(a => !a.tratado);
  const tratados = andamentos.filter(a => a.tratado);

  // Lista dinâmica de processos e tribunais com andamentos para os filtros dropdown
  const processosMap = andamentos.reduce((acc, a) => {
    if (a.processo?.numero_cnj) {
      acc[a.processo.numero_cnj] = a.processo.titulo || a.processo.numero_cnj;
    }
    return acc;
  }, {} as Record<string, string>);

  const tribunaisUnicos = Array.from(new Set(andamentos.map(a => a.processo?.tribunal).filter(Boolean)));

  // Aplicação dos filtros e ordenação
  const filtrados = andamentos
    .filter(a => {
      // Filtro de tratados
      if (!mostrarTratados && a.tratado) return false;
      
      // Filtro de urgência
      if (filtroUrgencia !== 'todos' && a.sugestao_ia?.urgencia !== filtroUrgencia) return false;
      
      // Filtro de processo
      if (filtroProcesso !== 'todos' && a.processo?.numero_cnj !== filtroProcesso) return false;
      
      // Filtro de tribunal
      if (filtroTribunal !== 'todos' && a.processo?.tribunal !== filtroTribunal) return false;
      
      // Busca textual
      if (busca.trim()) {
        const query = busca.toLowerCase();
        const matchDesc = a.descricao.toLowerCase().includes(query);
        const matchTitle = a.processo?.titulo?.toLowerCase().includes(query) || false;
        const matchCnj = a.processo?.numero_cnj?.toLowerCase().includes(query) || false;
        return matchDesc || matchTitle || matchCnj;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (ordenacao === 'data_desc') {
        return new Date(b.data_andamento).getTime() - new Date(a.data_andamento).getTime();
      }
      if (ordenacao === 'data_asc') {
        return new Date(a.data_andamento).getTime() - new Date(b.data_andamento).getTime();
      }
      if (ordenacao === 'urgencia') {
        const getWeight = (urg?: string) => {
          if (urg === 'alta') return 3;
          if (urg === 'media') return 2;
          return 1;
        };
        return getWeight(b.sugestao_ia?.urgencia) - getWeight(a.sugestao_ia?.urgencia);
      }
      return 0;
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
      subtitle="Movimentações processuais monitoradas automaticamente dos tribunais"
    >
      {/* Contadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold">Não tratados</p>
          <p className="text-3xl font-bold text-white mt-1.5 font-serif">{naoTratados.length}</p>
        </div>
        
        <div className="glass-panel rounded-2xl p-5 border border-rose-500/25 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <p className="text-[10px] text-rose-400 uppercase tracking-widest font-mono font-bold">Urgentes</p>
          <p className="text-3xl font-bold text-rose-400 mt-1.5 font-serif">{urgentesHoje}</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-amber-500/25 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <p className="text-[10px] text-amber-400 uppercase tracking-widest font-mono font-bold">Atenção</p>
          <p className="text-3xl font-bold text-amber-400 mt-1.5 font-serif">{atencaoHoje}</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-emerald-500/25 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono font-bold">Tratados</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1.5 font-serif">{tratados.length}</p>
        </div>
      </div>

      {/* Painel Filtros e Ordenação Avançada */}
      <div className="glass-panel rounded-2xl p-5 border border-white/5 mb-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
            <SlidersHorizontal size={14} className="text-indigo-400" />
            Filtros e Controles de Visualização
          </h2>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/60 hover:bg-slate-900 border border-white/10 hover:text-white rounded-lg text-xs font-semibold text-slate-400 transition-all cursor-pointer"
          >
            <Bell size={12} />
            Atualizar Feed
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Busca por Texto */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por descrição/processo..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-slate-950/45 border border-white/5 text-xs text-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-650"
            />
          </div>

          {/* Filtro por Processo */}
          <div>
            <select
              value={filtroProcesso}
              onChange={e => setFiltroProcesso(e.target.value)}
              className="w-full bg-slate-950/45 border border-white/5 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500/40 transition-all appearance-none cursor-pointer"
            >
              <option value="todos">📁 Todos os Processos</option>
              {Object.entries(processosMap).map(([cnj, titulo]) => (
                <option key={cnj} value={cnj}>
                  {titulo.length > 30 ? titulo.slice(0, 30) + '...' : titulo}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Tribunal */}
          <div>
            <select
              value={filtroTribunal}
              onChange={e => setFiltroTribunal(e.target.value)}
              className="w-full bg-slate-950/45 border border-white/5 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500/40 transition-all appearance-none cursor-pointer"
            >
              <option value="todos">🏛️ Todos os Tribunais</option>
              {tribunaisUnicos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Ordenação */}
          <div>
            <select
              value={ordenacao}
              onChange={e => setOrdenacao(e.target.value)}
              className="w-full bg-slate-950/45 border border-white/5 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500/40 transition-all appearance-none cursor-pointer font-semibold"
            >
              <option value="data_desc">📅 Mais recentes primeiro</option>
              <option value="data_asc">📅 Mais antigos primeiro</option>
              <option value="urgencia">⚡ Por Grau de Urgência</option>
            </select>
          </div>
        </div>

        {/* Filtros de Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            {[
              { key: 'todos', label: 'Todos Níveis' },
              { key: 'alta', label: '🔴 Urgentes' },
              { key: 'media', label: '🟡 Atenção' },
              { key: 'baixa', label: '⚪ Informativos' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFiltroUrgencia(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer',
                  filtroUrgencia === f.key
                    ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/35 shadow-md shadow-indigo-500/5'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div>
            <button
              onClick={() => setMostrarTratados(!mostrarTratados)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                mostrarTratados
                  ? 'bg-slate-800 text-slate-200 border-white/10'
                  : 'text-slate-500 border-transparent hover:border-white/10 hover:text-slate-300'
              )}
            >
              {mostrarTratados ? 'Ocultar tratados' : 'Mostrar tratados'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center border border-white/5">
          <CheckCircle2 size={40} className="mx-auto text-slate-700 mb-4" />
          <p className="text-slate-450 font-medium">Nenhum andamento encontrado</p>
          <p className="text-slate-600 text-xs mt-1 max-w-md mx-auto leading-relaxed">
            Nenhuma movimentação processual corresponde aos critérios de busca ou filtros aplicados. Tente limpar os filtros ou atualize a página de Processos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
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
