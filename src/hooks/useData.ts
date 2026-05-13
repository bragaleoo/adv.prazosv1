import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Prazo, Client } from '../types';
import { useAuth } from '../contexts/AuthContext';





export function usePrazos() {
  const [prazos, setPrazos] = useState<Prazo[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch prazos via RPC
      const { data: prazosData, error: prazosError } = await supabase.rpc('get_my_prazos');
      if (prazosError) throw prazosError;

      // Fetch clients via RPC
      const { data: clientsData, error: clientsError } = await supabase.rpc('get_my_clients');
      if (clientsError) throw clientsError;

      setPrazos((prazosData || []) as Prazo[]);
      setClients((clientsData || []) as Client[]);
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  return { prazos, clients, loading, error, refresh: fetchData };
}

