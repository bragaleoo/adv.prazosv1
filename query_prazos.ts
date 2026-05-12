import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getOpenPrazos() {
  console.log('Consultando prazos em aberto (status = "pendente")...');
  
  const { data, error } = await supabase
    .from('prazos')
    .select('*, client(nome)')
    .eq('status', 'pendente')
    .order('data_vencimento', { ascending: true });

  if (error) {
    console.error("Erro ao consultar prazos:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("Nenhum prazo em aberto encontrado.");
    return;
  }

  console.log(`Encontrados ${data.length} prazo(s) em aberto:\n`);
  
  data.forEach((prazo, index) => {
    // Format date
    let dateStr = prazo.data_vencimento;
    try {
      const d = new Date(prazo.data_vencimento);
      dateStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch(e) {}
    
    // Extract client name
    let clientName = 'Cliente desconhecido';
    if (prazo.client) {
        if (Array.isArray(prazo.client)) {
            clientName = prazo.client[0]?.nome || clientName;
        } else {
            clientName = (prazo.client as any).nome || clientName;
        }
    }

    console.log(`${index + 1}. [${dateStr}] - ${clientName}`);
    console.log(`   Tipo: ${prazo.tipo} | Prioridade: ${prazo.prioridade}`);
    console.log(`   Descrição: ${prazo.descricao}`);
    console.log(`   ID: ${prazo.id}\n`);
  });
}

getOpenPrazos();
