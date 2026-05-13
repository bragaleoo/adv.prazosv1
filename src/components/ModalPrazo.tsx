import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Prazo, Client } from '../types';
import { supabase } from '../lib/supabase';
import { Loader2, Calendar, Gavel, User, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { getTableNames } from '../hooks/useData';

interface ModalPrazoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prazo?: Prazo | null; // If provided, it's edit mode
  clients: Client[];
}

export function ModalPrazo({ isOpen, onClose, onSuccess, prazo, clients }: ModalPrazoProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    client_id: '',
    descricao: '',
    data_vencimento: format(new Date(), 'yyyy-MM-dd'),
    status: 'pendente',
    tipo: '',
    prioridade: 'media',
    lembrete_1_dia: true,
    lembrete_no_dia: true,
    notificado: false
  });

  useEffect(() => {
    if (prazo) {
      setFormData({
        client_id: prazo.client_id,
        descricao: prazo.descricao,
        data_vencimento: prazo.data_vencimento.split('T')[0],
        status: prazo.status,
        tipo: prazo.tipo || '',
        prioridade: prazo.prioridade || 'media',
        lembrete_1_dia: prazo.lembrete_1_dia,
        lembrete_no_dia: prazo.lembrete_no_dia,
        notificado: prazo.notificado
      });
    } else {
      setFormData({
        client_id: '',
        descricao: '',
        data_vencimento: format(new Date(), 'yyyy-MM-dd'),
        status: 'pendente',
        tipo: '',
        prioridade: 'media',
        lembrete_1_dia: true,
        lembrete_no_dia: true,
        notificado: false
      });
    }
  }, [prazo, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.descricao || !formData.data_vencimento) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tables = getTableNames(user?.email);
      
      if (prazo) {
        // Update
        const { error: updateError } = await supabase
          .from(tables.prazos as any)
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', prazo.id);
        
        if (updateError) throw updateError;
      } else {
        // Create
        if (!user) throw new Error('Usuário não autenticado.');

        const { error: insertError } = await supabase
          .from(tables.prazos as any)
          .insert([{
            ...formData,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        if (insertError) throw insertError;
      }


      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar prazo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={prazo ? 'Editar Prazo' : 'Novo Prazo Jurídico'}
      footer={
        <>
          <button 
            onClick={onClose}
            className="px-4 py-2 text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/10 active:scale-95 border border-indigo-500/20"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {prazo ? 'SALVAR_ALTERAÇÕES' : 'EXECUTAR_CRIAÇÃO'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-rose-500/5 border border-rose-500/20 text-rose-500 p-3 rounded-lg text-[10px] font-bold flex items-center gap-2 uppercase tracking-tight">
            <AlertTriangle size={14} />
            Erro na operação: {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1 font-mono">PARÂMETRO: CLIENTE_ID *</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600 group-focus-within:text-indigo-400 transition-colors">
              <User size={16} />
            </div>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="block w-full pl-10 pr-4 py-2.5 bg-[#020617] border border-[#1E293B] rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer font-medium"
            >
              <option value="">Selecione o titular...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nome} [{c.sender}]</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1 font-mono">METADADOS: DESCRICÃO *</label>
          <div className="relative group">
            <div className="absolute top-3 left-3 text-slate-600 group-focus-within:text-indigo-400 transition-colors">
              <Gavel size={16} />
            </div>
            <textarea
              required
              rows={2}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="block w-full pl-10 pr-4 py-2.5 bg-[#020617] border border-[#1E293B] rounded-lg text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none font-medium leading-relaxed"
              placeholder="Digite a descrição operacional do prazo..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1 font-mono">CRON: VENCIMENTO *</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-600 group-focus-within:text-indigo-400 transition-colors">
                <Calendar size={16} />
              </div>
              <input
                type="date"
                required
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                className="block w-full pl-10 pr-4 py-2.5 bg-[#020617] border border-[#1E293B] rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1 font-mono">PRIORIDADE: NIVEL</label>
            <select
              value={formData.prioridade}
              onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
              className="block w-full px-4 py-2.5 bg-[#020617] border border-[#1E293B] rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer uppercase font-bold"
            >
              <option value="baixa">01 — BAIXA</option>
              <option value="media">02 — MÉDIA</option>
              <option value="alta">03 — ALTA</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1 font-mono">CLASSIFICACÃO</label>
            <input
              type="text"
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="block w-full px-4 py-2.5 bg-[#020617] border border-[#1E293B] rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all uppercase placeholder:text-slate-700 font-bold"
              placeholder="Ex: CONTESTAÇÃO"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1 font-mono">ESTADO: ATUAL</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="block w-full px-4 py-2.5 bg-[#020617] border border-[#1E293B] rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer uppercase font-bold"
            >
              <option value="pendente">Pendente</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900/30 rounded-lg p-5 border border-[#1E293B] space-y-4">
          <h4 className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-4 font-mono">Trigger Settings (n8n Engine)</h4>
          
          <div className="flex items-center justify-between group">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight group-hover:text-slate-200 transition-colors">Alert: T-minus 24h</p>
              <p className="text-[9px] text-slate-600 font-mono tracking-tighter">PUSH_NOTIFICATION_WHATSAPP (PREVENTIVE)</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={formData.lembrete_1_dia}
                onChange={(e) => setFormData({ ...formData, lembrete_1_dia: e.target.checked })}
              />
              <div className="w-10 h-5 bg-[#020617] border border-[#1E293B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-700 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-checked:border-indigo-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between group">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight group-hover:text-slate-200 transition-colors">Alert: Final Deadline</p>
              <p className="text-[9px] text-slate-600 font-mono tracking-tighter">PUSH_NOTIFICATION_WHATSAPP (URGENT)</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={formData.lembrete_no_dia}
                onChange={(e) => setFormData({ ...formData, lembrete_no_dia: e.target.checked })}
              />
              <div className="w-10 h-5 bg-[#020617] border border-[#1E293B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-700 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-checked:border-indigo-500"></div>
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}
