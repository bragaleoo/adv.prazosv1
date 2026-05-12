import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkTables() {
  console.log('Checking prazos table...');
  const { count: c1, error: e1 } = await supabase.from('prazos').select('*', { count: 'exact', head: true });
  console.log('prazos count:', c1, e1 ? e1.message : 'OK');

  console.log('Checking prazos_lex.ai table...');
  const { count: c2, error: e2 } = await supabase.from('prazos_lex.ai' as any).select('*', { count: 'exact', head: true });
  console.log('prazos_lex.ai count:', c2, e2 ? e2.message : 'OK');

  console.log('Checking client table...');
  const { count: c3, error: e3 } = await supabase.from('client').select('*', { count: 'exact', head: true });
  console.log('client count:', c3, e3 ? e3.message : 'OK');

  console.log('Checking client_lex.ai table...');
  const { count: c4, error: e4 } = await supabase.from('client_lex.ai' as any).select('*', { count: 'exact', head: true });
  console.log('client_lex.ai count:', c4, e4 ? e4.message : 'OK');
}

checkTables();
