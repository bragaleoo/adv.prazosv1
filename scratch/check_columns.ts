import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkColumns() {
  console.log('Checking prazos_lex.ai columns...');
  const { data, error } = await supabase.from('prazos_lex.ai' as any).select('*').limit(1);
  if (error) {
    console.error(error.message);
  } else if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Sample data:', data[0]);
  } else {
    console.log('No data found in prazos_lex.ai');
  }
}

checkColumns();
