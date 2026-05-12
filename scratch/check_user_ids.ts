import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkUser() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers(); // Likely won't work with anon key
  if (error) {
    console.log('Cannot list users with anon key. Checking prazos again...');
    const { data, error: e2 } = await supabase.from('prazos_lex.ai' as any).select('user_id');
    if (e2) console.error(e2.message);
    else console.log('User IDs in prazos_lex.ai:', [...new Set(data.map(d => d.user_id))]);
  } else {
    console.log('Users:', users.map(u => ({ id: u.id, email: u.email })));
  }
}

checkUser();
