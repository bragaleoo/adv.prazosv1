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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-indigo-400" />
              Diário Oficial
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Gerencie o monitoramento de intimações e publicações por meio da API do Escavador.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 border rounded-full transition-all",
              isOabConfigurada 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            )}>
              <span className="relative flex h-2 w-2">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  isOabConfigurada ? "bg-emerald-400" : "bg-amber-400"
                )}></span>
                <span className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  isOabConfigurada ? "bg-emerald-500" : "bg-amber-500"
                )}></span>
              </span>
              <span className="text-xs font-medium">
                {isOabConfigurada ? 'Escaneamento OAB Ativo' : 'Aguardando Configuração OAB'}
              </span>
            </div>
          </div>
        </div>

        {/* Painel de Configuração de OAB e Monitoramento */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card de Configuração da OAB */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h2 className="text-white font-bold text-base flex items-center gap-2 mb-4">
              <FileSignature className="h-5 w-5 text-indigo-400" />
              Configurar Registro OAB do Advogado
            </h2>
            
            <form onSubmit={handleUpdateOab} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Número OAB
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 14699"
                    value={oabNumero}
                    onChange={e => setOabNumero(e.target.value)}
                    className="w-full bg-slate-800/30 border border-white/5 rounded-lg px-4 py-2 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Seccional / UF
                  </label>
                  <select
                    value={oabUf}
                    onChange={e => setOabUf(e.target.value)}
                    className="w-full bg-slate-800/30 border border-white/5 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50 appearance-none min-h-[38px]"
                  >
                    {ESTADOS_OAB.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-500 max-w-md">
                  💡 A OAB cadastrada será usada para a busca instantânea e também vinculará as publicações recebidas automaticamente por webhook.
                </p>
                <button
                  type="submit"
                  disabled={savingOab}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all border border-indigo-500/20"
                >
                  {savingOab ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar OAB
                </button>
              </div>
            </form>
          </div>

          {/* Card de Monitoramento do Escavador */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group">
            <div>
              <h2 className="text-white font-bold text-base flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                API do Escavador
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                O Escavador realiza o escaneamento diário nos Diários Oficiais de todo o Brasil e envia novas intimações por meio de Webhooks em tempo real.
              </p>
              
              {isOabConfigurada ? (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-[11px] text-emerald-400 font-mono flex items-start gap-2 mb-4">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <div>
                    <span>Status: OAB cadastrada ({profile?.oab_numero}/{profile?.oab_uf}). Monitoramento pronto para ativação/atualização histórica.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[11px] text-amber-400 font-mono flex items-start gap-2 mb-4">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
                  <div>
                    <span>Atenção: Configure sua OAB ao lado para liberar o monitoramento nos diários oficiais.</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleActivarMonitor}
              disabled={activatingMonitor || !isOabConfigurada}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-white/5"
            >
              {activatingMonitor ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSignature className="h-4 w-4" />
              )}
              Ativar Monitoramento da OAB
            </button>
          </div>
        </div>

        {/* Dashboard Cards (Estética de Contadores) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0B1120] border border-slate-800/60 rounded-xl p-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm font-medium">Não Lidas</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {publicacoes.filter(p => !p.lido).length}
                </p>
              </div>
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#0B1120] border border-slate-800/60 rounded-xl p-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm font-medium">Lidas</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {publicacoes.filter(p => p.lido).length}
                </p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#0B1120] border border-slate-800/60 rounded-xl p-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total de Publicações</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {publicacoes.length}
                </p>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <FileSignature className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-[#0B1120] border border-slate-800/60 rounded-xl p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-[#020617] rounded-lg p-1 border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setFiltro('nao_lidas')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                filtro === 'nao_lidas' 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-300"
              )}
            >
              Não Lidas
              {publicacoes.filter(p => !p.lido).length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px]">
                  {publicacoes.filter(p => !p.lido).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setFiltro('lidas')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                filtro === 'lidas' 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-300"
              )}
            >
              Lidas
            </button>
            <button
              onClick={() => setFiltro('todas')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                filtro === 'todas' 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-300"
              )}
            >
              Todas
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar em publicações..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#020617] border border-slate-800 text-sm text-slate-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Lista de Publicações */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Carregando intimações do Diário Oficial...</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredPublicacoes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-16 bg-[#0B1120] border border-slate-800/60 rounded-xl"
                >
                  <div className="mx-auto w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">Tudo limpo por aqui!</h3>
                  <p className="text-slate-400 text-sm max-w-md mx-auto">
                    {filtro === 'nao_lidas' 
                      ? "Você já leu todas as suas publicações recentes. Avisaremos assim que o Escavador receber novas intimações."
                      : "Nenhuma publicação encontrada para o filtro selecionado."}
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
                      "bg-[#0B1120] border rounded-xl overflow-hidden transition-all group",
                      pub.lido ? "border-slate-800/40 opacity-70" : "border-slate-700/60 shadow-lg shadow-black/20"
                    )}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-1 p-2 rounded-lg shrink-0",
                            pub.lido ? "bg-slate-800/50 text-slate-500" : "bg-indigo-500/10 text-indigo-400"
                          )}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                                {pub.tribunal}
                              </span>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[#020617] text-slate-400 border border-slate-850">
                                {pub.tipo}
                              </span>
                            </div>
                            <h3 className={cn(
                              "text-lg font-semibold",
                              pub.lido ? "text-slate-300" : "text-white"
                            )}>
                              {pub.processo_numero ? pub.processo_numero : 'Processo não especificado'}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(pub.data_publicacao), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        
                        {!pub.lido && (
                          <button 
                            onClick={() => marcarComoLida(pub.id)}
                            className="shrink-0 p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors group-hover:opacity-100 sm:opacity-0"
                            title="Marcar como lida"
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>

                      <div className="bg-[#020617] rounded-lg p-4 border border-slate-850/50 font-sans">
                        <div 
                          className={cn(
                            "text-sm leading-relaxed whitespace-pre-wrap break-words",
                            pub.lido ? "text-slate-400" : "text-slate-300"
                          )}
                          dangerouslySetInnerHTML={{ __html: pub.conteudo }}
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <Scale className="h-3 w-3" />
                          Visualização integrada
                        </span>
                        
                        {!pub.lido && (
                          <button 
                            onClick={() => marcarComoLida(pub.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
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
