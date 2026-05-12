import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixNullUserIds() {
  const userId = '127893fb-65db-48b4-b0f6-2b8fac702ad9';
  console.log(`Atualizando prazos com user_id nulo para: ${userId}...`);

  const { data, error } = await supabase
    .from('prazos')
    .update({ user_id: userId })
    .is('user_id', null)
    .select();

  if (error) {
    console.error('Erro ao atualizar prazos:', error.message);
    return;
  }

  console.log(`Atualização concluída! ${data ? data.length : 0} prazos corrigidos.`);
}

fixNullUserIds();
