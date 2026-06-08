import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen, Search, Filter, Calendar as CalendarIcon, 
  ChevronRight, CheckCircle2, Clock, AlertCircle, FileText, 
  Scale, FileSignature, Save, ShieldAlert, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FilterType = 'todas' | 'nao_lidas' | 'lidas';

const ESTADOS_OAB = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG',
  'MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
];

interface Profile {
  id: string;
  nome: string;
  oab_numero: string | null;
  oab_uf: string | null;
}

interface DBPublicacao {
  id: string;
  user_id: string;
  data_publicacao: string;
  created_at: string;
  conteudo: string;
  processo_numero: string;
  lido: boolean;
  tipo: string;
  tribunal: string;
}

export default function Publicacoes() {
  const { user } = useAuth();
  const [publicacoes, setPublicacoes] = useState<DBPublicacao[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FilterType>('nao_lidas');
  const [busca, setBusca] = useState('');

  // Form states
  const [oabNumero, setOabNumero] = useState('');
  const [oabUf, setOabUf] = useState('SE');
  const [savingOab, setSavingOab] = useState(false);
  const [activatingMonitor, setActivatingMonitor] = useState(false);

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
        setOabNumero(data.oab_numero || '');
        setOabUf(data.oab_uf || 'SE');
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  }, [user]);

  const fetchPublicacoes = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('publicacoes')
        .select('*')
        .order('data_publicacao', { ascending: false });

      if (error) throw error;
      setPublicacoes(data || []);
    } catch (err) {
      console.error('Erro ao buscar publicações:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchPublicacoes();
    }
  }, [user, fetchProfile, fetchPublicacoes]);

  const filteredPublicacoes = publicacoes.filter(pub => {
    // Filtro de status
    if (filtro === 'nao_lidas' && pub.lido) return false;
    if (filtro === 'lidas' && !pub.lido) return false;
    
    // Filtro de busca
    if (busca) {
      const searchLower = busca.toLowerCase();
      return (
        pub.processo_numero.toLowerCase().includes(searchLower) ||
        pub.conteudo.toLowerCase().includes(searchLower) ||
        pub.tribunal.toLowerCase().includes(searchLower) ||
        pub.tipo.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const handleUpdateOab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingOab(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          oab_numero: oabNumero.trim(),
          oab_uf: oabUf.toUpperCase()
        })
        .eq('id', user.id);

      if (error) throw error;
      await fetchProfile();
      alert('Configurações de OAB atualizadas com sucesso!');
    } catch (err: any) {
      alert('Erro ao salvar OAB: ' + err.message);
    } finally {
      setSavingOab(false);
    }
  };

  const handleActivarMonitor = async () => {
    if (!oabNumero) {
      alert('Por favor, configure e salve seu número de OAB antes de ativar o monitoramento.');
      return;
    }
    setActivatingMonitor(true);
    try {
      const { data, error } = await supabase.functions.invoke('escavador-webhook/monitorar', {
        body: {
          oab_numero: oabNumero.trim(),
          oab_uf: oabUf
        }
      });

      if (error) throw error;
      
      alert('Monitoramento via Escavador ativado com sucesso! As publicações encontradas estão sendo importadas para o seu painel.');
      await fetchPublicacoes();
    } catch (err: any) {
      alert('Erro ao ativar monitoramento no Escavador: ' + (err.message || err.error || err));
    } finally {
      setActivatingMonitor(false);
    }
  };

  const marcarComoLida = async (id: string) => {
    try {
      const { error } = await supabase
        .from('publicacoes')
        .update({ lido: true })
        .eq('id', id);

      if (error) throw error;
      
      setPublicacoes(prev => prev.map(pub => 
        pub.id === id ? { ...pub, lido: true } : pub
      ));
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    }
  };

  const isOabConfigurada = profile?.oab_numero && profile?.oab_uf;

  return (
    <MainLayout title="Diário Oficial" subtitle="Monitoramento automático de publicações vinculadas à sua OAB.">
      <div className="space-y-6">
        {/* Header Premium */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3 font-serif tracking-tight">
              <BookOpen className="h-8 w-8 text-indigo-400" />
              Diário Oficial
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Monitore intimações judiciais e movimentações em Diários de Justiça de todo o país vinculadas ao seu registro profissional.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3.5 py-2 border rounded-full transition-all text-xs font-semibold backdrop-blur-md shadow-sm",
              isOabConfigurada 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/5" 
                : "bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-amber-500/5"
            )}>
              <span className="relative flex h-2.5 w-2.5">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  isOabConfigurada ? "bg-emerald-400" : "bg-amber-400"
                )}></span>
                <span className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  isOabConfigurada ? "bg-emerald-500" : "bg-amber-500"
                )}></span>
              </span>
              <span>
                {isOabConfigurada ? 'Escaneamento OAB Ativo' : 'Aguardando Configuração OAB'}
              </span>
            </div>
          </div>
        </div>

        {/* Painel de Configuração de OAB e Monitoramento */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card de Configuração da OAB */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <h2 className="text-white font-bold text-base flex items-center gap-2.5 mb-5 font-serif">
              <FileSignature className="h-5 w-5 text-indigo-400" />
              Configurar Registro OAB do Advogado
            </h2>
            
            <form onSubmit={handleUpdateOab} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Número OAB
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 14699"
                    value={oabNumero}
                    onChange={e => setOabNumero(e.target.value)}
                    className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-slate-650 text-sm focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Seccional / UF
                  </label>
                  <div className="relative">
                    <select
                      value={oabUf}
                      onChange={e => setOabUf(e.target.value)}
                      className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all appearance-none min-h-[44px]"
                    >
                      {ESTADOS_OAB.map(uf => (
                        <option key={uf} value={uf} className="bg-slate-900 text-white">{uf}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
                <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                  💡 A OAB cadastrada será usada para a busca de processos ativos e também vinculará novas intimações enviadas automaticamente por webhook.
                </p>
                <button
                  type="submit"
                  disabled={savingOab}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-indigo-400/20 shadow-md shadow-indigo-500/5 cursor-pointer"
                >
                  {savingOab ? <Loader2 className="h-4 w-4 animate-spin text-slate-950" /> : <Save className="h-4 w-4" />}
                  Salvar OAB
                </button>
              </div>
            </form>
          </div>

          {/* Card de Monitoramento do Escavador */}
          <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div>
              <h2 className="text-white font-bold text-base flex items-center gap-2.5 mb-3.5 font-serif">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                API do Escavador
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-5">
                O Escavador monitora os Diários Oficiais de todo o Brasil e encaminha as novas publicações para o seu sistema em tempo real via webhook.
              </p>
              
              {isOabConfigurada ? (
                <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs text-emerald-400 font-sans flex items-start gap-2.5 mb-5 shadow-inner">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">OAB Configurada</span>
                    <span className="text-slate-400 text-[11px] font-mono">{profile?.oab_numero}/{profile?.oab_uf}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs text-amber-400 font-sans flex items-start gap-2.5 mb-5 shadow-inner">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Ação Necessária</span>
                    <span className="text-slate-400 text-[11px]">Salve a OAB ao lado para liberar o monitoramento automático.</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleActivarMonitor}
              disabled={activatingMonitor || !isOabConfigurada}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 active:scale-[0.98] disabled:from-slate-900 disabled:to-slate-900 disabled:text-slate-600 disabled:opacity-55 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all border border-indigo-400/20 shadow-lg shadow-indigo-500/10 cursor-pointer"
            >
              {activatingMonitor ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
              ) : (
                <FileSignature className="h-4 w-4" />
              )}
              Ativar Monitoramento da OAB
            </button>
          </div>
        </div>

        {/* Dashboard Cards (Estética de Contadores) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Não Lidas</p>
                <p className="text-4xl font-extrabold text-white mt-2 font-serif">
                  {publicacoes.filter(p => !p.lido).length}
                </p>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/10">
                <AlertCircle className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Lidas</p>
                <p className="text-4xl font-extrabold text-white mt-2 font-serif">
                  {publicacoes.filter(p => p.lido).length}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-450 text-xs font-semibold uppercase tracking-wider">Total de Publicações</p>
                <p className="text-4xl font-extrabold text-white mt-2 font-serif">
                  {publicacoes.length}
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/10">
                <FileSignature className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="glass-panel rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-slate-950/40 rounded-xl p-1 border border-white/5 w-full sm:w-auto">
            <button
              onClick={() => setFiltro('nao_lidas')}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                filtro === 'nao_lidas' 
                  ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-md font-semibold" 
                  : "text-slate-400 hover:text-slate-250"
              )}
            >
              Não Lidas
              {publicacoes.filter(p => !p.lido).length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-mono">
                  {publicacoes.filter(p => !p.lido).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setFiltro('lidas')}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                filtro === 'lidas' 
                  ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-md font-semibold" 
                  : "text-slate-400 hover:text-slate-250"
              )}
            >
              Lidas
            </button>
            <button
              onClick={() => setFiltro('todas')}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                filtro === 'todas' 
                  ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-md font-semibold" 
                  : "text-slate-400 hover:text-slate-250"
              )}
            >
              Todas
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar nas intimações..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-slate-950/40 border border-white/5 text-xs text-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-slate-650"
            />
          </div>
        </div>

        {/* Lista de Publicações */}
        <div className="space-y-5">
          {loading ? (
            <div className="text-center py-20 glass-panel rounded-2xl">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-450 mx-auto mb-4" />
              <p className="text-slate-450 text-sm font-serif">Carregando publicações do Diário Oficial...</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredPublicacoes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-20 glass-panel rounded-2xl"
                >
                  <div className="mx-auto w-16 h-16 bg-slate-950/50 rounded-full flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                    <CheckCircle2 className="h-8 w-8 text-slate-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 font-serif">Nenhuma publicação encontrada</h3>
                  <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed font-sans">
                    {filtro === 'nao_lidas' 
                      ? "Você já respondeu a todas as suas intimações. O sistema está atualizado e aguardando novas transmissões do Escavador."
                      : "Não foram encontradas publicações correspondentes aos filtros selecionados."}
                  </p>
                </motion.div>
              ) : (
                filteredPublicacoes.map((pub) => (
                  <motion.div
                    key={pub.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "glass-panel rounded-2xl overflow-hidden transition-all duration-300 group border-l-4",
                      pub.lido 
                        ? "opacity-65 border-white/5 border-l-transparent" 
                        : "border-l-indigo-500 border-indigo-500/10 shadow-lg shadow-black/30"
                    )}
                  >
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                        <div className="flex items-start gap-3.5">
                          <div className={cn(
                            "mt-1 p-2.5 rounded-xl shrink-0 border",
                            pub.lido 
                              ? "bg-slate-950/40 text-slate-550 border-white/5" 
                              : "bg-indigo-500/10 text-indigo-400 border-indigo-500/10 shadow-inner"
                          )}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-sans tracking-wider uppercase">
                                {pub.tribunal}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950/60 text-slate-400 border border-white/5 font-sans tracking-wider uppercase">
                                {pub.tipo}
                              </span>
                            </div>
                            <h3 className={cn(
                              "text-base font-bold font-mono tracking-tight",
                              pub.lido ? "text-slate-350" : "text-white"
                            )}>
                              {pub.processo_numero ? pub.processo_numero : 'Processo não especificado'}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-sans">
                              <Clock className="h-3.5 w-3.5" />
                              Publicado em {format(new Date(pub.data_publicacao), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        
                        {!pub.lido && (
                          <button 
                            onClick={() => marcarComoLida(pub.id)}
                            className="shrink-0 self-end sm:self-start p-2.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-all border border-transparent hover:border-emerald-500/20 cursor-pointer"
                            title="Marcar como lida"
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>

                      {/* Conteúdo da Intimação estilo Documento Físico (Fonte Serifada Lora) */}
                      <div className="bg-slate-950/40 rounded-xl p-5 border border-white/5 font-serif text-[15px] leading-relaxed tracking-wide shadow-inner select-text select-all">
                        <div 
                          className={cn(
                            "whitespace-pre-wrap break-words",
                            pub.lido ? "text-slate-400" : "text-slate-200"
                          )}
                          dangerouslySetInnerHTML={{ __html: pub.conteudo }}
                        />
                      </div>

                      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <Scale className="h-4 w-4 text-indigo-400/70" />
                          Visualização Oficial Integrada
                        </span>
                        
                        {!pub.lido && (
                          <button 
                            onClick={() => marcarComoLida(pub.id)}
                            className="flex items-center gap-2 px-4.5 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Marcar como Lida
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
