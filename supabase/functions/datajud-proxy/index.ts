// Supabase Edge Function — proxy para a API pública do DataJud (CNJ)
// Deploy: npx supabase functions deploy datajud-proxy

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const DATAJUD_BASE = 'https://api-publica.datajud.cnj.jus.br';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { tribunal, body } = await req.json();

    if (!tribunal || !body) {
      return new Response(
        JSON.stringify({ error: 'tribunal e body são obrigatórios' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('DATAJUD_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'DATAJUD_API_KEY não configurada no servidor' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const url = `${DATAJUD_BASE}/${tribunal}/_search`;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[datajud-proxy] erro:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
