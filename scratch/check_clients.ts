import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkClients() {
  console.log('Checking client table...');
  const { data, error } = await supabase.from('client').select('*').limit(1);
  if (error) {
    console.error('client table error:', error.message);
  } else {
    console.log('client table data:', data);
  }

  console.log('Checking client_lex.ai table...');
  const { data: d2, error: e2 } = await supabase.from('client_lex.ai' as any).select('*').limit(1);
  if (e2) {
    console.error('client_lex.ai table error:', e2.message);
  } else {
    console.log('client_lex.ai table data:', d2);
  }
}

checkClients();
