import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkUserIds() {
  const { data, error } = await supabase
    .from('prazos')
    .select('id, user_id');

  if (error) {
    console.error(error);
    return;
  }

  const userIds = [...new Set(data.map(d => d.user_id))];
  console.log('Distinct user_ids in prazos table:', userIds);
}

checkUserIds();
