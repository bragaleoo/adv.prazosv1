import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  MessageSquare, 
  CalendarClock, 
  ExternalLink,
  ChevronRight,
  Shield,
  Clock,
  Briefcase
} from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { usePrazos } from '../hooks/useData';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { StatusBadge } from '../components/StatusBadge';

export default function Clientes() {
  const { clients, prazos, loading } = usePrazos();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.sender.includes(searchTerm) ||
    c.origem?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout title="Gestão de Clientes" subtitle="Contatos e histórico operacional de atendimentos.">
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 flex relative group">
          <input 
            type="text" 
            placeholder="Buscar por nome ou documento..." 
            className="bg-[#0F172A] border border-[#1E293B] rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} className="text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors" />
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-[#0F172A] border border-[#1E293B] text-slate-400 px-4 py-2.5 rounded-lg hover:text-white hover:bg-slate-800 transition-all font-medium text-xs uppercase tracking-widest shadow-sm">
            <Filter size={14} />
            Filtros
          </button>
          
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/10 active:scale-95">
            <Plus size={16} />
            Novo Cliente
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-panel rounded-xl p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
          {filteredClients.map((client) => {
            const clientPrazos = prazos.filter(p => p.client_id === client.id);
            const pendentes = clientPrazos.filter(p => p.status === 'pendente').length;
            
            return (
              <div key={client.id} className="glass-panel rounded-xl p-5 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 transition-all shadow-sm group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg">
                    {client.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors truncate">{client.nome}</h3>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {client.sender.includes('@s.whatsapp.net') ? client.sender.split('@')[0] : client.sender}
                    </p>
                  </div>
                  <button className="text-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-slate-900/40 rounded-lg p-2.5 border border-white/5 backdrop-blur-sm">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pendentes</p>
                    <p className="text-lg font-bold text-slate-200">{pendentes}</p>
                  </div>
                  <div className="bg-slate-900/40 rounded-lg p-2.5 border border-white/5 backdrop-blur-sm">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                    <StatusBadge variant="default" className="text-[8px] px-1 py-0">{client.status || 'ATIVO'}</StatusBadge>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/5 relative">
                  <div className="flex items-center justify-between text-[10px] font-medium tracking-tight">
                    <span className="text-slate-500 flex items-center gap-1.5 uppercase">
                      <Clock size={12} /> Última Atualização
                    </span>
                    <span className="text-slate-300 font-mono">
                      {client.ultimo_contato ? format(parseISO(client.ultimo_contato), 'dd/MM/yy') : 'N/A'}
                    </span>
                  </div>
                </div>

                <button className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all border border-[#1E293B]">
                  Acessar Prontuário
                  <ChevronRight size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </MainLayout>
  );
}
