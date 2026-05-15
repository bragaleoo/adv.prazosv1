import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Prazo, Client, Processo, Andamento, TarefaKanban } from '../types';
import { useAuth } from '../contexts/AuthContext';

// ─── PRAZOS (existente) ────────────────────────────────────────────────────

export function usePrazos() {
  const [prazos, setPrazos] = useState<Prazo[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchData = async () => {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const { data: prazosData, error: prazosError } = await supabase.rpc('get_my_prazos');
      if (prazosError) throw prazosError;
      const { data: clientsData, error: clientsError } = await supabase.rpc('get_my_clients');
      if (clientsError) throw clientsError;
      setPrazos((prazosData || []) as Prazo[]);
      setClients((clientsData || []) as Client[]);
    } catch (err: any) {
      console.error('Error fetching prazos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);
  return { prazos, clients, loading, error, refresh: fetchData };
}

// ─── PROCESSOS ─────────────────────────────────────────────────────────────

export function useProcessos() {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProcessos = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase.rpc('get_my_processos');
      if (err) throw err;
      setProcessos((data || []) as Processo[]);
    } catch (err: any) {
      console.error('Error fetching processos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const criarProcesso = async (payload: Omit<Processo, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'cliente' | 'andamentos'>) => {
    const { data, error } = await supabase
      .from('processos')
      .insert({ ...payload, user_id: user!.id })
      .select()
      .single();
    if (error) throw error;
    await fetchProcessos();
    return data;
  };

  const atualizarProcesso = async (id: string, updates: Partial<Processo>) => {
    const { error } = await supabase
      .from('processos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    await fetchProcessos();
  };

  const deletarProcesso = async (id: string) => {
    const { error } = await supabase.from('processos').delete().eq('id', id);
    if (error) throw error;
    await fetchProcessos();
  };

  useEffect(() => { if (user) fetchProcessos(); }, [user]);
  return { processos, loading, error, refresh: fetchProcessos, criarProcesso, atualizarProcesso, deletarProcesso };
}

// ─── ANDAMENTOS ─────────────────────────────────────────────────────────────

export function useAndamentos() {
  const [andamentos, setAndamentos] = useState<Andamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAndamentos = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase.rpc('get_my_andamentos');
      if (err) throw err;
      setAndamentos((data || []) as Andamento[]);
    } catch (err: any) {
      console.error('Error fetching andamentos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const marcarTratado = async (id: string) => {
    const { error } = await supabase
      .from('andamentos')
      .update({ tratado: true })
      .eq('id', id);
    if (error) throw error;
    setAndamentos(prev => prev.map(a => a.id === id ? { ...a, tratado: true } : a));
  };

  const inserirAndamento = async (payload: Omit<Andamento, 'id' | 'created_at' | 'processo'>) => {
    const { data, error } = await supabase
      .from('andamentos')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    await fetchAndamentos();
    return data;
  };

  useEffect(() => { if (user) fetchAndamentos(); }, [user]);
  return { andamentos, loading, error, refresh: fetchAndamentos, marcarTratado, inserirAndamento };
}

// ─── KANBAN ─────────────────────────────────────────────────────────────────

export function useKanban() {
  const [tarefas, setTarefas] = useState<TarefaKanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchKanban = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase.rpc('get_my_kanban');
      if (err) throw err;
      setTarefas((data || []) as TarefaKanban[]);
    } catch (err: any) {
      console.error('Error fetching kanban:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const criarTarefa = async (payload: Omit<TarefaKanban, 'id' | 'user_id' | 'created_at' | 'processo' | 'cliente'>) => {
    const { data, error } = await supabase
      .from('tarefas_kanban')
      .insert({ ...payload, user_id: user!.id })
      .select()
      .single();
    if (error) throw error;
    await fetchKanban();
    return data;
  };

  const moverTarefa = async (id: string, novoStatus: TarefaKanban['status']) => {
    const { error } = await supabase
      .from('tarefas_kanban')
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, status: novoStatus } : t));
  };

  const deletarTarefa = async (id: string) => {
    const { error } = await supabase.from('tarefas_kanban').delete().eq('id', id);
    if (error) throw error;
    setTarefas(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => { if (user) fetchKanban(); }, [user]);
  return { tarefas, loading, error, refresh: fetchKanban, criarTarefa, moverTarefa, deletarTarefa };
}
