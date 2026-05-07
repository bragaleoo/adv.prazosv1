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
      
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('client')
        .select('*');

      if (clientsError) throw clientsError;
      const allClients = clientsData || [];
      setClients(allClients);

      // Fetch prazos
      const { data: prazosData, error: prazosError } = await supabase
        .from('prazos')
        .select('*');

      if (prazosError) throw prazosError;
      
      const joinedPrazos = (prazosData || []).map(prazo => ({
        ...prazo,
        client: allClients.find(c => c.id === prazo.client_id)
      }));

      setPrazos(joinedPrazos as Prazo[]);
      
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
