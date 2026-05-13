import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Prazo, Client } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function getTableNames(email?: string | null) {
  const normalizedEmail = email?.toLowerCase() || '';
  
  // Bragaleo access - Lex.ai tables
  if (normalizedEmail.includes('braga')) {
    return {
      prazos: 'prazos_lex.ai',
      clients: 'client_lex.ai'
    };
  }
  
  // Alice & Melquisedec access (adv.brigido@gmail.com) - Melquisedec tables
  return {
    prazos: 'prazos_advmelqui',
    clients: 'client_advmelqui'
  };
}



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
      
      const tables = getTableNames(user.email);
      
      // Fetch prazos with client join
      const { data: prazosData, error: prazosError } = await supabase
        .from(tables.prazos as any)
        .select(`*, client:"${tables.clients}"(*)`);

      if (prazosError) throw prazosError;
      
      const joinedPrazos = (prazosData || []).map(prazo => ({
        ...prazo,
        client: Array.isArray(prazo.client) ? prazo.client[0] : prazo.client // handle potential array from join
      }));

      setPrazos(joinedPrazos as Prazo[]);
      setClients(Array.from(new Set(joinedPrazos.map(p => p.client))).filter(Boolean) as Client[]);
      
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

