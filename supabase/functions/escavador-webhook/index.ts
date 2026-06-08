// Supabase Edge Function — Escavador Proxy & Webhook Handler
// Deploy: npx supabase functions deploy escavador-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function validarUsuario(req: Request, supabaseClient: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Cabeçalho de autorização ausente');
  }
  const token = authHeader.replace('Bearer ', '').trim();
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  if (error || !user) {
    throw new Error(error?.message || 'Token inválido ou sessão expirada');
  }
  return user;
}

serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    const escavadorKey = Deno.env.get('ESCAVADOR_API_KEY');
    if (!escavadorKey) {
      throw new Error('ESCAVADOR_API_KEY não configurada no servidor');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // ─── 1. WEBHOOK CALLBACK (POST /webhook) ─────────────────────────────────
    // Este endpoint recebe as atualizações públicas do Escavador.
    if (path.endsWith('/webhook')) {
      if (req.method !== 'POST') {
        return new Response('Método não permitido', { status: 405, headers: CORS_HEADERS });
      }

      // Validação opcional de segurança SEC-02
      const callbackToken = Deno.env.get('ESCAVADOR_CALLBACK_TOKEN');
      if (callbackToken) {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || authHeader !== `Bearer ${callbackToken}`) {
          console.warn('[Webhook Escavador] Tentativa de chamada não autorizada ao webhook.');
          return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: CORS_HEADERS });
        }
      }

      const payload = await req.json();
      console.log('[Webhook Escavador] Recebido:', JSON.stringify(payload));

      const res = payload.resultado;
      if (!res) {
        return new Response(JSON.stringify({ message: 'Nenhum resultado no payload' }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Processa evento de novas publicações em diários oficiais
      if (res.event === 'diario_movimentacao_nova' || res.evento === 'diario_movimentacao_nova') {
        const monitoramento = res.monitoramento?.[0];
        const term = monitoramento?.termo || '';
        const mov = res.movimentacao;

        if (!term || !mov) {
          console.warn('[Webhook Escavador] Termo ou movimentação ausente');
          return new Response(JSON.stringify({ message: 'Dados inválidos' }), { status: 400 });
        }

        // Tenta mapear o termo (OAB ou Nome) para um perfil de usuário
        let userId: string | null = null;
        
        // Match no formato "14699/SE" ou "14.699/SE"
        const oabMatch = term.match(/(\d+(?:\.\d+)?)\/([a-zA-Z]{2})/i);
        if (oabMatch) {
          const oabNumero = oabMatch[1].replace(/\./g, '');
          const oabUf = oabMatch[2].toUpperCase();

          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('oab_numero', oabNumero)
            .eq('oab_uf', oabUf)
            .maybeSingle();

          if (profile) userId = profile.id;
        }

        // Se não mapeou por OAB, tenta por nome
        if (!userId) {
          const { data: profileByName } = await supabaseClient
            .from('profiles')
            .select('id')
            .ilike('nome', `%${term}%`)
            .maybeSingle();

          if (profileByName) userId = profileByName.id;
        }

        if (!userId) {
          console.warn(`[Webhook Escavador] Nenhum perfil encontrado para o termo monitorado: "${term}"`);
          return new Response(JSON.stringify({ message: 'Perfil não encontrado' }), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        // Extrai o número do processo (do monitoramento ou do texto)
        let processoNumero = monitoramento?.processo?.numero_novo || '';
        if (!processoNumero && mov.descricao_pequena) {
          const cnjMatch = mov.descricao_pequena.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
          if (cnjMatch) processoNumero = cnjMatch[0];
        }

        // Insere a publicação no banco
        const { error: insertError } = await supabaseClient
          .from('publicacoes')
          .insert({
            user_id: userId,
            data_publicacao: mov.data || new Date().toISOString(),
            conteudo: mov.conteudo || mov.complemento || 'Sem conteúdo',
            processo_numero: processoNumero,
            lido: false,
            tipo: mov.tipo || 'Intimação',
            tribunal: monitoramento?.processo?.origem || mov.diario_oficial || 'Diário Oficial',
          });

        if (insertError) {
          console.error('[Webhook Escavador] Erro ao salvar publicação:', insertError);
          return new Response(JSON.stringify({ error: insertError.message }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        console.log(`[Webhook Escavador] Publicação salva com sucesso para o usuário ${userId}`);

        // Disparo para o n8n (Integração WhatsApp via uazap)
        const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
        if (n8nWebhookUrl) {
          try {
            console.log('[Webhook Escavador] Encaminhando publicação para o n8n...');
            const response = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'nova_publicacao',
                user_id: userId,
                oab_numero: oabNumero,
                oab_uf: oabUf,
                nome_advogado: profile?.nome || profileByName?.nome || 'Advogado',
                processo_numero: processoNumero,
                data_publicacao: mov.data || new Date().toISOString(),
                conteudo: mov.conteudo || mov.complemento || 'Sem conteúdo',
                tipo: mov.tipo || 'Intimação',
                tribunal: monitoramento?.processo?.origem || mov.diario_oficial || 'Diário Oficial'
              })
            });
            console.log(`[Webhook Escavador] Envio para o n8n concluído com status: ${response.status}`);
          } catch (n8nErr) {
            console.error('[Webhook Escavador] Erro de rede ao enviar para o n8n:', n8nErr);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ─── 2. PROXY: BUSCAR PROCESSOS POR OAB (GET /processos) ──────────────────
    if (path.endsWith('/processos')) {
      if (req.method !== 'GET') {
        return new Response('Método não permitido', { status: 405, headers: CORS_HEADERS });
      }

      // Validação obrigatória de segurança SEC-01
      try {
        await validarUsuario(req, supabaseClient);
      } catch (authErr: any) {
        console.error('[escavador-webhook/processos] Falha na validação:', authErr.message);
        return new Response(JSON.stringify({ error: 'Não autorizado', details: authErr.message }), { status: 401, headers: CORS_HEADERS });
      }

      const oabNumero = url.searchParams.get('oab_numero');
      const oabUf = url.searchParams.get('oab_uf');

      if (!oabNumero || !oabUf) {
        return new Response(JSON.stringify({ error: 'oab_numero e oab_uf são obrigatórios' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const escavadorUrl = `https://api.escavador.com/api/v2/advogado/processos?oab_numero=${oabNumero}&oab_estado=${oabUf.toUpperCase()}&oab_tipo=ADVOGADO`;
      
      const response = await fetch(escavadorUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${escavadorKey}`,
        },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

        // ─── 2.1 PROXY: BUSCAR PROCESSO POR CNJ (GET /processo-cnj) ───────────────
    if (path.endsWith('/processo-cnj')) {
      if (req.method !== 'GET') {
        return new Response('Método não permitido', { status: 405, headers: CORS_HEADERS });
      }

      try {
        await validarUsuario(req, supabaseClient);
      } catch (authErr: any) {
        console.error('[escavador-webhook/processo-cnj] Falha na validação:', authErr.message);
        return new Response(JSON.stringify({ error: 'Não autorizado', details: authErr.message }), { status: 401, headers: CORS_HEADERS });
      }

      const cnj = url.searchParams.get('numero');
      if (!cnj) {
        return new Response(JSON.stringify({ error: 'O número do processo (numero) é obrigatório' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const escavadorUrl = `https://api.escavador.com/api/v1/processos/numero/${cnj}`;
      const response = await fetch(escavadorUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${escavadorKey}`,
        },
      });

      const data = await response.json();
      
      // Se vier uma lista de processos, extrai o primeiro para consistência com o frontend
      let processo = null;
      if (Array.isArray(data) && data.length > 0) {
        processo = data[0];
      } else if (data && !Array.isArray(data) && (data.numero_novo || data.numero_cnj)) {
        processo = data;
      }

      // Se encontramos o processo e ele tem um ID, busca as movimentações completas dele
      if (processo && processo.id) {
        try {
          const movsUrl = `https://api.escavador.com/api/v1/processos/${processo.id}/movimentacoes`;
          const movsRes = await fetch(movsUrl, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${escavadorKey}`,
            },
          });
          if (movsRes.ok) {
            const movsData = await movsRes.json();
            // Injeta as movimentações completas no objeto do processo
            processo.movimentacoes = movsData.items || [];
          }
        } catch (movsErr) {
          console.error('[escavador-webhook/processo-cnj] Erro ao buscar movimentações completas:', movsErr);
        }
      }

      return new Response(JSON.stringify({ processo }), {
        status: response.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ─── 2.2 PROXY: BUSCAR PROCESSOS POR NOME/TERMO (GET /busca) ──────────────
    if (path.endsWith('/busca')) {
      if (req.method !== 'GET') {
        return new Response('Método não permitido', { status: 405, headers: CORS_HEADERS });
      }

      try {
        await validarUsuario(req, supabaseClient);
      } catch (authErr: any) {
        console.error('[escavador-webhook/busca] Falha na validação:', authErr.message);
        return new Response(JSON.stringify({ error: 'Não autorizado', details: authErr.message }), { status: 401, headers: CORS_HEADERS });
      }

      const q = url.searchParams.get('q');
      if (!q) {
        return new Response(JSON.stringify({ error: 'O termo de busca (q) é obrigatório' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const escavadorUrl = `https://api.escavador.com/api/v2/envolvido/processos?nome=${encodeURIComponent(q)}`;
      const response = await fetch(escavadorUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${escavadorKey}`,
        },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ─── 3. PROXY: ATIVAR MONITORAMENTO (POST /monitorar) ─────────────────────
    if (path.endsWith('/monitorar')) {
      if (req.method !== 'POST') {
        return new Response('Método não permitido', { status: 405, headers: CORS_HEADERS });
      }

      // Verifica token do usuário para obter o user_id logado
      let user;
      try {
        user = await validarUsuario(req, supabaseClient);
      } catch (authErr: any) {
        console.error('[escavador-webhook/monitorar] Falha na validação:', authErr.message);
        return new Response(JSON.stringify({ error: 'Não autorizado', details: authErr.message }), { status: 401, headers: CORS_HEADERS });
      }

      const { oab_numero, oab_uf } = await req.json();
      if (!oab_numero || !oab_uf) {
        return new Response(JSON.stringify({ error: 'oab_numero e oab_uf são obrigatórios' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const term = `${oab_numero}/${oab_uf.toUpperCase()}`;
      console.log(`[Escavador] Criando monitoramento para o termo: "${term}" para o usuário: ${user.id}`);

      // 1. Cadastra monitoramento no Escavador
      const registerRes = await fetch('https://api.escavador.com/api/v2/monitoramentos/novos-processos', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${escavadorKey}`,
        },
        body: JSON.stringify({ termo: term }),
      });

      let monitoramentoId: number | null = null;
      let registerData: any = {};

      if (registerRes.ok) {
        registerData = await registerRes.json();
        monitoramentoId = registerData.id;
      } else {
        const errorData = await registerRes.json();
        const errorMsg = errorData.error || errorData.message || '';
        
        if (registerRes.status === 422 && errorMsg.includes('já monitora este termo')) {
          console.log(`[Escavador] O termo "${term}" já está sendo monitorado. Buscando ID existente...`);
          
          const listRes = await fetch('https://api.escavador.com/api/v2/monitoramentos/novos-processos', {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${escavadorKey}`,
            },
          });

          if (listRes.ok) {
            const listData = await listRes.json();
            const items = listData.items || [];
            
            const normalizedTerm = term.replace(/\./g, '').toUpperCase();
            const matchedItem = items.find((item: any) => 
              item.termo.replace(/\./g, '').toUpperCase() === normalizedTerm
            );

            if (matchedItem) {
              monitoramentoId = matchedItem.id;
              registerData = matchedItem; // mock registerData to return standard response
              console.log(`[Escavador] ID de monitoramento existente encontrado: ${monitoramentoId}`);
            }
          }
        }

        if (!monitoramentoId) {
          const errorMsgFinal = errorData.error || errorData.message || (errorData.errors ? JSON.stringify(errorData.errors) : null) || JSON.stringify(errorData);
          return new Response(JSON.stringify({ error: errorMsgFinal }), {
            status: registerRes.status,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
      }

      // 2. Busca resultados históricos imediatamente
      const resultsRes = await fetch(`https://api.escavador.com/api/v2/monitoramentos/novos-processos/${monitoramentoId}/resultados`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${escavadorKey}`,
        },
      });

      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        const items = resultsData.items || [];

        console.log(`[Escavador] Encontrados ${items.length} resultados iniciais para importação.`);

        // Importa resultados históricos para a tabela publicacoes
        for (const item of items) {
          const { error: insErr } = await supabaseClient
            .from('publicacoes')
            .insert({
              user_id: user.id,
              data_publicacao: item.data_inicio || new Date().toISOString(),
              conteudo: item.match || 'Publicação importada',
              processo_numero: item.numero_cnj || '',
              lido: false,
              tipo: 'Intimação',
              tribunal: item.tribunal || 'Diário Oficial',
            });
          if (insErr) console.error('[Escavador] Erro ao importar publicação inicial:', insErr);
        }
      }

      return new Response(JSON.stringify(registerData), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Rota não encontrada', { status: 404, headers: CORS_HEADERS });

  } catch (err: any) {
    console.error('[escavador-webhook] erro geral:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
