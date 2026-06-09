import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useProcessos } from '../hooks/useData';
import { usePrazos } from '../hooks/useData';
import { Processo } from '../types';
import { TRIBUNAIS, consultarProcesso, buscarPorNome, buscarPorOAB, extrairAndamentosRecentes, formatarNumeroCNJ } from '../lib/escavador';
import { DataJudProcesso } from '../lib/datajud';
import { analisarAndamento } from '../lib/ai';
import { supabase } from '../lib/supabase';
import {
  Scale, Plus, Search, RefreshCw, X, ChevronRight,
  AlertCircle, CheckCircle2, Loader2,
  Building2, User, Calendar, UserSearch, Download, Import
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_CONFIG = {
  ativo: { label: 'Ativo', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  arquivado: { label: 'Arquivado', color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-400' },
  suspenso: { label: 'Suspenso', color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400' },
};

/** Remove tags HTML e decodifica entidades comuns do texto vindo do Escavador */
function stripHtml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]*>/g, ' ')   // remove tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')    // colapsa espaços múltiplos
    .trim();
}

interface ModalProcessoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: any[];
  processoEdit?: Processo | null;
}

function ModalProcesso({ isOpen, onClose, onSuccess, clients, processoEdit }: ModalProcessoProps) {
  const { criarProcesso, atualizarProcesso } = useProcessos();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({
    numero_cnj: '',
    titulo: '',
    nome_cliente: '',
    tribunal: 'TJSE',
    vara: '',
    status: 'ativo',
  });

  // Re-hidrata o formulário toda vez que o modal abre ou o processo muda
  useEffect(() => {
    setForm({
      numero_cnj: processoEdit?.numero_cnj || '',
      titulo: processoEdit?.titulo || '',
      nome_cliente: (processoEdit as any)?.nome_cliente || '',
      tribunal: processoEdit?.tribunal || 'TJSE',
      vara: processoEdit?.vara || '',
      status: processoEdit?.status || 'ativo',
    });
  }, [isOpen, processoEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        tribunal_alias: TRIBUNAIS[form.tribunal] || form.tribunal.toLowerCase(),
        cliente_id: null, // Removed dependency on external client ID
        nome_cliente: form.nome_cliente || null,
        vara: form.vara || null,
        ultima_consulta_datajud: null,
        updated_at: new Date().toISOString(),
      } as any;

      if (processoEdit) {
        await atualizarProcesso(processoEdit.id, payload);
      } else {
        await criarProcesso(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
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
          className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">{processoEdit ? 'Editar Processo' : 'Novo Processo'}</h2>
              <p className="text-slate-500 text-xs mt-0.5">Preencha os dados do processo judicial</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Número CNJ *
              </label>
              <input
                type="text"
                placeholder="0000000-00.0000.0.00.0000"
                value={form.numero_cnj}
                onChange={e => setForm(f => ({ ...f, numero_cnj: e.target.value }))}
                required
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Título / Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Silva x Banco do Brasil — Revisão Contratual"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                required
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tribunal *
                </label>
                <select
                  value={form.tribunal}
                  onChange={e => setForm(f => ({ ...f, tribunal: e.target.value }))}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50 appearance-none"
                >
                  {Object.keys(TRIBUNAIS).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50 appearance-none"
                >
                  <option value="ativo">Ativo</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Vara / Juízo
              </label>
              <input
                type="text"
                placeholder="Ex: 2ª Vara Cível de Aracaju"
                value={form.vara}
                onChange={e => setForm(f => ({ ...f, vara: e.target.value }))}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome do Cliente
              </label>
              <input
                type="text"
                placeholder="Ex: João da Silva"
                value={form.nome_cliente || ''}
                onChange={e => setForm(f => ({ ...f, nome_cliente: e.target.value }))}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {processoEdit ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Modal: Buscar no DataJud (por Nome ou OAB) ────────────────────────

const ESTADOS_OAB = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG',
  'MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

type ModoBusca = 'nome' | 'oab';

interface ModalBuscarNomeProps {
  isOpen: boolean;
  onClose: () => void;
  onImportar: (resultado: DataJudProcesso, tribunal: string, silencioso?: boolean) => Promise<void>;
  onImportarLote: (resultados: DataJudProcesso[], tribunal: string) => Promise<void>;
  profile: any;
  processosCnjs: Set<string>; // CNJs já cadastrados no banco
}

function ModalBuscarNome({ isOpen, onClose, onImportar, onImportarLote, profile, processosCnjs }: ModalBuscarNomeProps) {
  const navigate = useNavigate();
  const [modo, setModo] = useState<ModoBusca>('oab');
  const [nome, setNome] = useState('');
  const [oabNumero, setOabNumero] = useState('');
  const [oabEstado, setOabEstado] = useState('SE');
  const [tribunal, setTribunal] = useState('TJSE');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<DataJudProcesso[]>([]);
  const [buscou, setBuscou] = useState(false);

  // Seleção múltipla
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  // Estado de importação por processo
  const [statusImport, setStatusImport] = useState<Record<string, 'importing' | 'success' | 'error' | 'duplicate'>>({});
  const [importandoLote, setImportandoLote] = useState(false);

  // Progresso do lote
  const [totalParaImportar, setTotalParaImportar] = useState(0);
  const [importadosCount, setImportadosCount] = useState(0);

  useEffect(() => {
    if (profile?.oab_numero) setOabNumero(profile.oab_numero);
    if (profile?.oab_uf) setOabEstado(profile.oab_uf);
  }, [profile]);

  // Ao buscar, limpa seleções e status anteriores
  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuscando(true);
    setBuscou(false);
    setResultados([]);
    setSelecionados(new Set());
    setStatusImport({});
    try {
      const alias = TRIBUNAIS[tribunal];
      let res: DataJudProcesso[];
      if (modo === 'oab') {
        res = await buscarPorOAB(oabNumero.trim(), oabEstado, alias, 30);
      } else {
        res = await buscarPorNome(nome.trim(), alias, 30);
      }
      setResultados(res);
      setBuscou(true);
    } catch (err: any) {
      alert('Erro na busca: ' + err.message);
    } finally {
      setBuscando(false);
    }
  };

  const toggleSelecionado = (cnj: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(cnj)) next.delete(cnj);
      else next.add(cnj);
      return next;
    });
  };

  const toggleSelecionarTodos = () => {
    const disponiveis = resultados
      .filter(p => !processosCnjs.has(p.numeroProcesso) && statusImport[p.numeroProcesso] !== 'success')
      .map(p => p.numeroProcesso);
    if (selecionados.size === disponiveis.length && disponiveis.length > 0) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(disponiveis));
    }
  };

  const importarLista = async (lista: DataJudProcesso[]) => {
    setImportandoLote(true);
    setTotalParaImportar(lista.length);
    setImportadosCount(0);

    for (let i = 0; i < lista.length; i++) {
      const proc = lista[i];
      setStatusImport(prev => ({ ...prev, [proc.numeroProcesso]: 'importing' }));
      try {
        await onImportar(proc, tribunal, true);
        setStatusImport(prev => ({ ...prev, [proc.numeroProcesso]: 'success' }));
        setSelecionados(prev => { const n = new Set(prev); n.delete(proc.numeroProcesso); return n; });
      } catch (err: any) {
        const isDuplicate = err.message?.includes('duplicate') || err.message?.includes('unique') || err.message?.includes('já está cadastrado');
        setStatusImport(prev => ({ ...prev, [proc.numeroProcesso]: isDuplicate ? 'duplicate' : 'error' }));
      }
      setImportadosCount(i + 1);
    }
    setImportandoLote(false);
  };

  const handleImportarSelecionados = () => {
    const lista = resultados.filter(p => selecionados.has(p.numeroProcesso));
    importarLista(lista);
  };

  const handleImportarTodos = () => {
    const lista = resultados.filter(p =>
      !processosCnjs.has(p.numeroProcesso) &&
      statusImport[p.numeroProcesso] !== 'success' &&
      statusImport[p.numeroProcesso] !== 'duplicate'
    );
    importarLista(lista);
  };

  const handleClose = () => {
    if (importandoLote) return;
    const temSucesso = Object.values(statusImport).some(s => s === 'success');
    onClose();
    if (temSucesso) navigate('/andamentos');
  };

  const nSelecionados = selecionados.size;
  const nDisponiveis = resultados.filter(p =>
    !processosCnjs.has(p.numeroProcesso) &&
    statusImport[p.numeroProcesso] !== 'success' &&
    statusImport[p.numeroProcesso] !== 'duplicate'
  ).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {importandoLote && (
            <div className="absolute inset-0 bg-[#0F172A]/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 rounded-2xl">
              <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-4">
                <Loader2 size={36} className="animate-spin text-indigo-400" />
                <div>
                  <h3 className="text-white font-bold text-base">Importando Processos</h3>
                  <p className="text-slate-400 text-xs mt-1">Buscando andamentos no Escavador...</p>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importadosCount / totalParaImportar) * 100}%` }}
                  />
                </div>
                
                <span className="text-xs font-mono text-indigo-300 font-semibold">
                  {importadosCount} de {totalParaImportar} concluído{totalParaImportar !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <UserSearch size={18} className="text-indigo-400" />
                Buscar Processos no Escavador
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Base de dados unificada · Busca por OAB ou nome da parte</p>
            </div>
            <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Tabs modo de busca */}
          <div className="px-5 pt-4 pb-0 flex gap-2 flex-shrink-0">
            {(['oab', 'nome'] as ModoBusca[]).map(m => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-semibold border-b-2 transition-all',
                  modo === m
                    ? 'text-indigo-300 border-indigo-500 bg-indigo-500/5'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                )}
              >
                {m === 'oab' ? <Scale size={14} /> : <User size={14} />}
                {m === 'oab' ? 'Número OAB' : 'Nome da Parte'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleBuscar} className="p-5 border-b border-white/5 flex-shrink-0 border-t border-white/5">
            {modo === 'oab' ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Sua OAB</label>
                    <input
                      type="text" placeholder="Nenhuma OAB configurada"
                      value={oabNumero} onChange={e => setOabNumero(e.target.value)}
                      required disabled
                      className="w-full bg-slate-800/30 border border-white/5 rounded-lg px-4 py-2.5 text-slate-400 placeholder-slate-600 text-sm cursor-not-allowed font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Seccional</label>
                    <select value={oabEstado} onChange={e => setOabEstado(e.target.value)} disabled
                      className="bg-slate-800/30 border border-white/5 rounded-lg px-3 py-2.5 text-slate-400 text-sm cursor-not-allowed appearance-none min-w-[80px]">
                      {ESTADOS_OAB.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tribunal</label>
                    <select value={tribunal} onChange={e => setTribunal(e.target.value)}
                      className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none appearance-none min-w-[90px]">
                      {Object.keys(TRIBUNAIS).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-xs font-semibold text-transparent mb-1.5">.</label>
                    <button type="submit" disabled={buscando || !oabNumero}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                      {buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      Buscar
                    </button>
                  </div>
                </div>
                {!oabNumero && (
                  <p className="text-rose-400 text-xs font-semibold">
                    ⚠️ Configure sua OAB e Seccional na página de Publicações antes de realizar a busca de processos.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nome da Parte</label>
                  <input type="text" placeholder="Ex: João da Silva Santos"
                    value={nome} onChange={e => setNome(e.target.value)} required
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tribunal</label>
                  <select value={tribunal} onChange={e => setTribunal(e.target.value)}
                    className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none appearance-none min-w-[90px]">
                    {Object.keys(TRIBUNAIS).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-transparent mb-1.5">.</label>
                  <button type="submit" disabled={buscando}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2">
                    {buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Buscar
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-600 mt-2">
              {modo === 'oab'
                ? '💡 Busca todos os processos onde o advogado é representante, usando o número da OAB.'
                : '💡 Busca pelo nome exato da parte (autor, réu ou advogado). Use nome completo.'}
            </p>
          </form>

          {/* Barra de ação em lote — aparece quando há resultados */}
          {resultados.length > 0 && (
            <div className="px-4 py-3 border-b border-white/5 flex-shrink-0 flex items-center justify-between gap-3 bg-slate-900/60">
              <div className="flex items-center gap-3">
                {/* Checkbox selecionar todos */}
                <button
                  onClick={toggleSelecionarTodos}
                  disabled={importandoLote}
                  title="Selecionar / desmarcar todos"
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    selecionados.size > 0 && selecionados.size === nDisponiveis
                      ? 'bg-indigo-500 border-indigo-500'
                      : selecionados.size > 0
                        ? 'bg-indigo-500/30 border-indigo-500'
                        : 'bg-transparent border-slate-600 hover:border-indigo-400'
                  )}
                >
                  {selecionados.size > 0 && (
                    <CheckCircle2 size={12} className="text-white" />
                  )}
                </button>
                <span className="text-xs text-slate-400">
                  {nSelecionados > 0
                    ? <span className="text-indigo-300 font-semibold">{nSelecionados} selecionado{nSelecionados !== 1 ? 's' : ''}</span>
                    : <span>Selecionar para importar em lote</span>
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                {nSelecionados > 0 && (
                  <button
                    onClick={handleImportarSelecionados}
                    disabled={importandoLote}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {importandoLote ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                    Importar selecionados ({nSelecionados})
                  </button>
                )}
                {nDisponiveis > 0 && (
                  <button
                    onClick={handleImportarTodos}
                    disabled={importandoLote}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {importandoLote ? <Loader2 size={11} className="animate-spin" /> : <Import size={11} />}
                    Importar todos ({nDisponiveis})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Resultados */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {buscando && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 size={28} className="animate-spin text-indigo-500 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Consultando API do Escavador...</p>
                </div>
              </div>
            )}

            {!buscando && buscou && resultados.length === 0 && (
              <div className="text-center py-12">
                <Search size={32} className="mx-auto text-slate-700 mb-3" />
                <p className="text-slate-500">Nenhum processo encontrado</p>
                <p className="text-slate-600 text-sm mt-1">
                  {modo === 'oab'
                    ? 'Verifique o número da OAB e a seccional. Tente também outro tribunal.'
                    : 'Tente o nome completo ou verifique o tribunal selecionado.'}
                </p>
              </div>
            )}

            {resultados.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-mono mb-3">{resultados.length} PROCESSO(S) · {tribunal}</p>
                {resultados.map(proc => {
                  const cnj = proc.numeroProcesso;
                  const jaImportado = processosCnjs.has(cnj);
                  const status = statusImport[cnj];
                  const isSelecionado = selecionados.has(cnj);
                  const isDisabled = jaImportado || status === 'success' || status === 'duplicate' || importandoLote;

                  const partes = proc.partes?.map(p => p.nome).join(' × ') || cnj;
                  const ultimoMov = proc.movimentos?.[0]?.nome || '—';
                  const advs = proc.partes?.filter(p =>
                    p.tipo?.toLowerCase().includes('adv')
                  ).map(p => p.nome).join(', ');

                  return (
                    <div
                      key={cnj}
                      onClick={() => !isDisabled && toggleSelecionado(cnj)}
                      className={cn(
                        'border rounded-xl p-4 transition-all cursor-pointer select-none',
                        isDisabled ? 'opacity-60 cursor-default' : 'hover:border-white/20',
                        isSelecionado && !isDisabled
                          ? 'bg-indigo-500/10 border-indigo-500/40'
                          : status === 'success' || (jaImportado && !status)
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : status === 'error'
                              ? 'bg-rose-500/5 border-rose-500/20'
                              : 'bg-slate-800/50 border-white/5'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className={cn(
                          'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                          isDisabled
                            ? 'bg-transparent border-slate-700 cursor-default'
                            : isSelecionado
                              ? 'bg-indigo-500 border-indigo-500'
                              : 'bg-transparent border-slate-600'
                        )}>
                          {isSelecionado && !isDisabled && <CheckCircle2 size={12} className="text-white" />}
                          {(status === 'success') && <CheckCircle2 size={12} className="text-emerald-400" />}
                          {(status === 'duplicate' || jaImportado) && <CheckCircle2 size={12} className="text-slate-500" />}
                          {status === 'error' && <AlertCircle size={12} className="text-rose-400" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-white font-medium text-sm line-clamp-2">{partes}</p>
                            {/* Badge de status */}
                            {(jaImportado || status) && (
                              <span className={cn(
                                'flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                                status === 'importing' ? 'bg-indigo-500/20 text-indigo-300' :
                                status === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                                status === 'error' ? 'bg-rose-500/20 text-rose-300' :
                                status === 'duplicate' || jaImportado ? 'bg-slate-700 text-slate-400' : ''
                              )}>
                                {status === 'importing' ? '⏳ Importando...' :
                                 status === 'success' ? '✅ Importado' :
                                 status === 'error' ? '⚠️ Erro' :
                                 (status === 'duplicate' || jaImportado) ? 'Já cadastrado' : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-indigo-400 text-xs font-mono mt-1">{formatarNumeroCNJ(cnj)}</p>
                          {advs && (
                            <p className="text-xs text-slate-400 mt-1">
                              <span className="text-slate-600">Adv.:</span> {advs}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <Building2 size={10} />
                              {proc.orgaoJulgador?.nome || tribunal}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <Calendar size={10} />
                              {proc.dataAjuizamento ? new Date(proc.dataAjuizamento).toLocaleDateString('pt-BR') : '—'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1.5 line-clamp-1">Último: {ultimoMov}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!buscou && !buscando && (
              <div className="text-center py-12">
                <Scale size={36} className="mx-auto text-slate-700 mb-3" />
                <p className="text-slate-600 text-sm">
                  {modo === 'oab'
                    ? 'Digite o número da OAB e selecione a seccional para buscar todos os processos do advogado'
                    : 'Digite o nome da parte para buscar processos no tribunal selecionado'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function Processos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { processos, loading, error, refresh, deletarProcesso, criarProcesso } = useProcessos();
  const { clients } = usePrazos();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [modalBuscarNome, setModalBuscarNome] = useState(false);
  const [processoEdit, setProcessoEdit] = useState<Processo | null>(null);
  const [consultando, setConsultando] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  // Conjunto de CNJs já cadastrados — usado pelo modal de busca para marcar duplicatas
  const processosCnjs = new Set(processos.map(p => p.numero_cnj));

  const handleImportarDoEscavador = async (proc: DataJudProcesso, tribunal: string, silencioso = false) => {
    const partes = proc.partes?.map(p => p.nome).join(' × ') || proc.numeroProcesso;

    // Verifica duplicata antes de tentar inserir
    if (processosCnjs.has(proc.numeroProcesso)) {
      throw new Error('já está cadastrado');
    }

    const novoProcesso = await criarProcesso({
      numero_cnj: proc.numeroProcesso,
      titulo: partes,
      tribunal,
      tribunal_alias: TRIBUNAIS[tribunal] || tribunal.toLowerCase(),
      vara: proc.orgaoJulgador?.nome || null,
      status: 'ativo',
      cliente_id: null,
      ultima_consulta_datajud: null,
      updated_at: new Date().toISOString(),
    } as any);

    if (novoProcesso) {
      // Sincroniza andamentos
      await handleConsultarEscavador(novoProcesso, silencioso);
      refresh();
    }
  };

  const filtrados = processos.filter(p => {
    const matchBusca = busca === '' ||
      p.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      p.numero_cnj.includes(busca) ||
      p.cliente?.nome?.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const handleConsultarEscavador = async (processo: Processo, silencioso = false) => {
    setConsultando(processo.id);
    try {
      const resultado = await consultarProcesso(processo.numero_cnj);
      if (!resultado) {
        if (!silencioso) alert('Processo não encontrado no Escavador.');
        return;
      }

      const movimentos = extrairAndamentosRecentes(resultado, 10);

      // Salva andamentos novos no banco
      for (const mov of movimentos) {
        const dataMovimento = new Date(mov.dataHora).toISOString();
        const novaDesc = stripHtml(mov.nome + (mov.complemento ? ` — ${mov.complemento}` : ''));

        // Verifica se já existe esse andamento
        const { data: existing } = await supabase
          .from('andamentos')
          .select('id, descricao')
          .eq('processo_id', processo.id)
          .eq('data_andamento', dataMovimento)
          .maybeSingle();

        if (existing) {
          // Cura andamentos que foram salvos truncados (terminados em "...") anteriormente
          const descSalva = existing.descricao || '';
          const isTruncated = descSalva.endsWith('...') || descSalva.endsWith('... ');
          const isNewFuller = novaDesc.length > descSalva.length && !novaDesc.endsWith('...');
          
          if (isTruncated || isNewFuller) {
            const sugestao = await analisarAndamento(mov.nome, processo.titulo);
            await supabase
              .from('andamentos')
              .update({
                descricao: novaDesc,
                sugestao_ia: sugestao,
              })
              .eq('id', existing.id);
          }
          continue;
        }

        // Analisa com IA
        const sugestao = await analisarAndamento(mov.nome, processo.titulo);

        await supabase.from('andamentos').insert({
          processo_id: processo.id,
          data_andamento: dataMovimento,
          descricao: novaDesc,
          codigo_movimento: String(mov.codigo),
          tratado: false,
          sugestao_ia: sugestao,
        });
      }

      // Atualiza última consulta
      await supabase
        .from('processos')
        .update({ ultima_consulta_datajud: new Date().toISOString() })
        .eq('id', processo.id);

      if (!silencioso) {
        alert(`✅ ${movimentos.length} andamento(s) consultado(s) no Escavador!`);
      }
      refresh();
    } catch (err: any) {
      if (!silencioso) {
        alert('Erro na consulta: ' + err.message);
      } else {
        console.error('Erro na consulta silenciosa:', err);
      }
    } finally {
      setConsultando(null);
    }
  };

  if (loading && processos.length === 0) {
    return (
      <MainLayout title="Processos" subtitle="Carregando...">
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Processos e Casos"
      subtitle={`${processos.filter(p => p.status === 'ativo').length} processos ativos monitorados`}
    >
      <ModalProcesso
        isOpen={modalAberto}
        onClose={() => { setModalAberto(false); setProcessoEdit(null); }}
        onSuccess={refresh}
        clients={clients}
        processoEdit={processoEdit}
      />
      <ModalBuscarNome
        isOpen={modalBuscarNome}
        onClose={() => setModalBuscarNome(false)}
        onImportar={handleImportarDoEscavador}
        onImportarLote={async (lista, tribunal) => {
          for (const proc of lista) await handleImportarDoEscavador(proc, tribunal, true);
        }}
        profile={profile}
        processosCnjs={processosCnjs}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: processos.length, color: 'text-white' },
          { label: 'Ativos', value: processos.filter(p => p.status === 'ativo').length, color: 'text-emerald-400' },
          { label: 'Suspensos', value: processos.filter(p => p.status === 'suspenso').length, color: 'text-amber-400' },
          { label: 'Arquivados', value: processos.filter(p => p.status === 'arquivado').length, color: 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="glass-panel rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">{s.label}</p>
            <p className={cn('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-1 w-full sm:max-w-sm">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar processo, cliente, número..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(['todos', 'ativo', 'suspenso', 'arquivado'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all',
                  filtroStatus === s
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                )}
              >
                {s === 'todos' ? 'Todos' : STATUS_CONFIG[s]?.label}
              </button>
            ))}
            <button
              onClick={() => setModalBuscarNome(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-all border border-white/10"
            >
              <UserSearch size={14} />
              Buscar por Nome
            </button>
            <button
              onClick={() => { setProcessoEdit(null); setModalAberto(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all"
            >
              <Plus size={14} />
              Novo Processo
            </button>
          </div>
        </div>

        {/* Table */}
        {filtrados.length === 0 ? (
          <div className="p-16 text-center">
            <Scale size={40} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500 font-medium">Nenhum processo encontrado</p>
            <p className="text-slate-600 text-sm mt-1">Cadastre seu primeiro processo clicando em "Novo Processo"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] text-slate-400 uppercase tracking-widest font-mono bg-slate-900/40 border-b border-white/5">
                <tr>
                  <th className="px-6 py-3">Processo</th>
                  <th className="px-6 py-3">Tribunal</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Última Consulta</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtrados.map(processo => {
                  const statusCfg = STATUS_CONFIG[processo.status] || STATUS_CONFIG.ativo;
                  const isConsultando = consultando === processo.id;
                  return (
                    <tr key={processo.id} className="hover:bg-slate-800/30 transition-all group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white text-sm">{processo.titulo}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {formatarNumeroCNJ(processo.numero_cnj)}
                        </div>
                        {processo.vara && (
                          <div className="text-xs text-slate-600 mt-0.5">{processo.vara}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded-md text-xs text-slate-300 font-mono">
                          <Building2 size={10} />
                          {processo.tribunal}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {processo.cliente ? (
                          <span className="flex items-center gap-1.5 text-sm text-slate-300">
                            <User size={12} className="text-slate-500" />
                            {processo.cliente.nome}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', statusCfg.bg, statusCfg.color)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {processo.ultima_consulta_datajud ? (
                          <span className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar size={11} />
                            {format(parseISO(processo.ultima_consulta_datajud), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">Nunca consultado</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleConsultarEscavador(processo)}
                            disabled={isConsultando}
                            title="Consultar Escavador"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                          >
                            {isConsultando ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            Escavador
                          </button>
                          <button
                            onClick={() => { setProcessoEdit(processo); setModalAberto(true); }}
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
