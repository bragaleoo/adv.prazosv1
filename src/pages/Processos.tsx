import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
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
    numero_cnj: processoEdit?.numero_cnj || '',
    titulo: processoEdit?.titulo || '',
    nome_cliente: (processoEdit as any)?.nome_cliente || '',
    tribunal: processoEdit?.tribunal || 'TJSE',
    vara: processoEdit?.vara || '',
    status: processoEdit?.status || 'ativo',
  });

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
  onImportar: (resultado: DataJudProcesso, tribunal: string) => Promise<void>;
}

function ModalBuscarNome({ isOpen, onClose, onImportar }: ModalBuscarNomeProps) {
  const [modo, setModo] = useState<ModoBusca>('oab');
  const [nome, setNome] = useState('');
  const [oabNumero, setOabNumero] = useState('');
  const [oabEstado, setOabEstado] = useState('SE');
  const [tribunal, setTribunal] = useState('TJSE');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<DataJudProcesso[]>([]);
  const [importando, setImportando] = useState<string | null>(null);
  const [buscou, setBuscou] = useState(false);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuscando(true);
    setBuscou(false);
    setResultados([]);
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

  const handleImportar = async (proc: DataJudProcesso) => {
    setImportando(proc.numeroProcesso);
    try {
      await onImportar(proc, tribunal);
    } finally {
      setImportando(null);
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
          className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <UserSearch size={18} className="text-indigo-400" />
                Buscar Processos no Escavador
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Base de dados unificada · Busca por OAB ou nome da parte</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Tabs modo de busca */}
          <div className="px-5 pt-4 pb-0 flex gap-2 flex-shrink-0">
            <button
              onClick={() => setModo('oab')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-semibold border-b-2 transition-all',
                modo === 'oab'
                  ? 'text-indigo-300 border-indigo-500 bg-indigo-500/5'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              )}
            >
              <Scale size={14} />
              Número OAB
            </button>
            <button
              onClick={() => setModo('nome')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-semibold border-b-2 transition-all',
                modo === 'nome'
                  ? 'text-indigo-300 border-indigo-500 bg-indigo-500/5'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              )}
            >
              <User size={14} />
              Nome da Parte
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleBuscar} className="p-5 border-b border-white/5 flex-shrink-0 border-t border-white/5">
            {modo === 'oab' ? (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Número OAB</label>
                  <input
                    type="text"
                    placeholder="Ex: 12345"
                    value={oabNumero}
                    onChange={e => setOabNumero(e.target.value)}
                    required
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Seccional</label>
                  <select
                    value={oabEstado}
                    onChange={e => setOabEstado(e.target.value)}
                    className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none appearance-none min-w-[80px]"
                  >
                    {ESTADOS_OAB.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tribunal</label>
                  <select
                    value={tribunal}
                    onChange={e => setTribunal(e.target.value)}
                    className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none appearance-none min-w-[90px]"
                  >
                    {Object.keys(TRIBUNAIS).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-transparent mb-1.5">.</label>
                  <button
                    type="submit" disabled={buscando}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Buscar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nome da Parte</label>
                  <input
                    type="text"
                    placeholder="Ex: João da Silva Santos"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    required
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tribunal</label>
                  <select
                    value={tribunal}
                    onChange={e => setTribunal(e.target.value)}
                    className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none appearance-none min-w-[90px]"
                  >
                    {Object.keys(TRIBUNAIS).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-transparent mb-1.5">.</label>
                  <button
                    type="submit" disabled={buscando}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                  >
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
                  const partes = proc.partes?.map(p => p.nome).join(' × ') || proc.numeroProcesso;
                  const ultimoMov = proc.movimentos?.[0]?.nome || '—';
                  const advs = proc.partes?.filter(p =>
                    p.tipo?.toLowerCase().includes('adv')
                  ).map(p => p.nome).join(', ');
                  const isImportando = importando === proc.numeroProcesso;
                  return (
                    <div key={proc.numeroProcesso}
                      className="bg-slate-800/50 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm line-clamp-2">{partes}</p>
                          <p className="text-indigo-400 text-xs font-mono mt-1">{formatarNumeroCNJ(proc.numeroProcesso)}</p>
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
                        <button
                          onClick={() => handleImportar(proc)}
                          disabled={isImportando}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                        >
                          {isImportando ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                          Importar
                        </button>
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
  const { processos, loading, error, refresh, deletarProcesso, criarProcesso } = useProcessos();
  const { clients } = usePrazos();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [modalBuscarNome, setModalBuscarNome] = useState(false);
  const [processoEdit, setProcessoEdit] = useState<Processo | null>(null);
  const [consultando, setConsultando] = useState<string | null>(null);

  const handleImportarDoEscavador = async (proc: DataJudProcesso, tribunal: string) => {
    const partes = proc.partes?.map(p => p.nome).join(' × ') || proc.numeroProcesso;
    try {
      await criarProcesso({
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
      alert(`✅ Processo importado: ${formatarNumeroCNJ(proc.numeroProcesso)}`);
    } catch (err: any) {
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        alert('Este processo já está cadastrado.');
      } else {
        alert('Erro ao importar: ' + err.message);
      }
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

  const handleConsultarEscavador = async (processo: Processo) => {
    setConsultando(processo.id);
    try {
      const resultado = await consultarProcesso(processo.numero_cnj);
      if (!resultado) {
        alert('Processo não encontrado no Escavador.');
        return;
      }

      const movimentos = extrairAndamentosRecentes(resultado, 10);

      // Salva andamentos novos no banco
      for (const mov of movimentos) {
        const dataMovimento = new Date(mov.dataHora).toISOString();

        // Verifica se já existe esse andamento
        const { data: existing } = await supabase
          .from('andamentos')
          .select('id')
          .eq('processo_id', processo.id)
          .eq('data_andamento', dataMovimento)
          .maybeSingle();

        if (existing) continue;

        // Analisa com IA
        const sugestao = await analisarAndamento(mov.nome, processo.titulo);

        await supabase.from('andamentos').insert({
          processo_id: processo.id,
          data_andamento: dataMovimento,
          descricao: mov.nome + (mov.complemento ? ` — ${mov.complemento}` : ''),
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

      alert(`✅ ${movimentos.length} andamento(s) consultado(s) no Escavador!`);
      refresh();
    } catch (err: any) {
      alert('Erro na consulta: ' + err.message);
    } finally {
      setConsultando(null);
    }
  };

  if (loading) {
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
