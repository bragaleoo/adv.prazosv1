import { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import {
  BookOpen, Search, Filter, Calendar as CalendarIcon, 
  ChevronRight, CheckCircle2, Clock, AlertCircle, FileText, 
  Scale, FileSignature
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// MOCK DATA: Diário Oficial / Intimações
// Esta é a base de demonstração para encantar o cliente.
const MOCK_PUBLICACOES = [
  {
    id: '1',
    processo_numero: '0012345-67.2023.8.26.0100',
    tribunal: 'TJSP',
    data_publicacao: new Date().toISOString(),
    tipo: 'Intimação',
    conteudo: 'Fica intimado(a) o(a) advogado(a) Dr(a). Léo Braga (OAB/SE 14.699) a se manifestar sobre a petição e documentos juntados pela parte contrária no prazo de 15 (quinze) dias úteis, sob pena de preclusão.',
    lido: false,
    urgente: true,
  },
  {
    id: '2',
    processo_numero: '0800987-12.2024.8.25.0001',
    tribunal: 'TJSE',
    data_publicacao: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    tipo: 'Sentença',
    conteudo: 'Ante o exposto, JULGO PROCEDENTE o pedido formulado na inicial para condenar a requerida ao pagamento de indenização por danos morais no importe de R$ 10.000,00 (dez mil reais), corrigidos monetariamente...',
    lido: false,
    urgente: false,
  },
  {
    id: '3',
    processo_numero: '1004567-89.2023.4.05.8500',
    tribunal: 'TRF-5',
    data_publicacao: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    tipo: 'Despacho',
    conteudo: 'Designo audiência de conciliação para o dia 25/10/2026 às 14:00h, a ser realizada por videoconferência. Intimem-se as partes.',
    lido: true,
    urgente: false,
  },
  {
    id: '4',
    processo_numero: '0000111-22.2022.5.20.0001',
    tribunal: 'TRT-20',
    data_publicacao: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
    tipo: 'Ata de Audiência',
    conteudo: 'Ata de audiência juntada aos autos. Prazo para impugnação aos cálculos: 8 dias.',
    lido: true,
    urgente: false,
  }
];

type FilterType = 'todas' | 'nao_lidas' | 'lidas';

export default function Publicacoes() {
  const [publicacoes, setPublicacoes] = useState(MOCK_PUBLICACOES);
  const [filtro, setFiltro] = useState<FilterType>('nao_lidas');
  const [busca, setBusca] = useState('');

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
        pub.tribunal.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const marcarComoLida = (id: string) => {
    setPublicacoes(prev => prev.map(pub => 
      pub.id === id ? { ...pub, lido: true } : pub
    ));
  };

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
              Monitoramento automático de publicações vinculadas à sua OAB.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-emerald-400">Escaneamento Ativo</span>
            </div>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-slate-300 border border-slate-800 rounded-lg transition-colors text-sm font-medium">
              <Filter className="h-4 w-4" />
              Fontes
            </button>
          </div>
        </div>

        {/* Dashboard Cards (Estética) */}
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
                <p className="text-slate-400 text-sm font-medium">Lidas Hoje</p>
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
                <p className="text-slate-400 text-sm font-medium">Diários Monitorados</p>
                <p className="text-3xl font-bold text-white mt-1">114</p>
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
                    ? "Você já leu todas as suas publicações. Avisaremos quando novos recortes chegarem do tribunal."
                    : "Nenhuma publicação encontrada com esses filtros."}
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
                    "bg-[#0B1120] border rounded-xl overflow-hidden transition-colors group",
                    pub.lido ? "border-slate-800/40 opacity-75" : "border-slate-700/60 shadow-lg shadow-black/20"
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
                            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                              {pub.tribunal}
                            </span>
                            <span className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-md",
                              pub.urgente && !pub.lido
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-[#020617] text-slate-400 border border-slate-800"
                            )}>
                              {pub.tipo}
                            </span>
                          </div>
                          <h3 className={cn(
                            "text-lg font-semibold",
                            pub.lido ? "text-slate-300" : "text-white"
                          )}>
                            {pub.processo_numero}
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
                          className="shrink-0 p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors group-hover:opacity-100 sm:opacity-0"
                          title="Marcar como lida"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    <div className="bg-[#020617] rounded-lg p-4 border border-slate-800/50">
                      <p className={cn(
                        "text-sm leading-relaxed",
                        pub.lido ? "text-slate-400" : "text-slate-300"
                      )}>
                        {pub.conteudo}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <button className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                        <Scale className="h-3 w-3" />
                        Ver detalhes do processo
                      </button>
                      
                      {!pub.lido && (
                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">
                          <CalendarIcon className="h-4 w-4" />
                          Agendar Prazo
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
}
