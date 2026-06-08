/**
 * Escavador — Adaptador de Consulta e Busca Processual
 * Roteia as chamadas via Supabase Edge Function (escavador-webhook) para proteger a API Key.
 * Mapeia o JSON retornado do Escavador para manter compatibilidade com a UI da aplicação.
 */

import { supabase } from './supabase';
import { TribunalAlias } from '../types';
import { DataJudProcesso, DataJudMovimento, DataJudParte } from './datajud';

// Mantém o mapa de siglas de tribunal para compatibilidade
export const TRIBUNAIS: Record<string, TribunalAlias> = {
  TJAC: 'api_publica_tjac',
  TJAL: 'api_publica_tjal',
  TJAM: 'api_publica_tjam',
  TJAP: 'api_publica_tjap',
  TJBA: 'api_publica_tjba',
  TJCE: 'api_publica_tjce',
  TJDFT: 'api_publica_tjdft',
  TJES: 'api_publica_tjes',
  TJGO: 'api_publica_tjgo',
  TJMA: 'api_publica_tjma',
  TJMG: 'api_publica_tjmg',
  TJMS: 'api_publica_tjms',
  TJMT: 'api_publica_tjmt',
  TJPA: 'api_publica_tjpa',
  TJPB: 'api_publica_tjpb',
  TJPE: 'api_publica_tjpe',
  TJPI: 'api_publica_tjpi',
  TJPR: 'api_publica_tjpr',
  TJRJ: 'api_publica_tjrj',
  TJRN: 'api_publica_tjrn',
  TJRO: 'api_publica_tjro',
  TJRR: 'api_publica_tjrr',
  TJRS: 'api_publica_tjrs',
  TJSC: 'api_publica_tjsc',
  TJSE: 'api_publica_tjse',
  TJSP: 'api_publica_tjsp',
  TJTO: 'api_publica_tjto',
  TRF1: 'api_publica_trf1',
  TRF2: 'api_publica_trf2',
  TRF3: 'api_publica_trf3',
  TRF4: 'api_publica_trf4',
  TRF5: 'api_publica_trf5',
  TRF6: 'api_publica_trf6',
  STJ: 'api_publica_stj',
  STF: 'api_publica_stf',
  TST: 'api_publica_tst',
};

// URL Base da Edge Function remota no Supabase
const EDGE_FUNCTION_URL = 'https://ngxordzdeigzrxocwjfc.supabase.co/functions/v1/escavador-webhook';

/**
 * Traduz o formato de processo retornado do Escavador para o formato legível no frontend
 */
function mapearProcessoEscavador(esc: any): DataJudProcesso {
  if (!esc) throw new Error('Dados do processo nulos');

  // Normaliza o tribunal
  let siglaTribunal = 'TJ';
  if (typeof esc.tribunal === 'string') {
    siglaTribunal = esc.tribunal;
  } else if (esc.tribunal && esc.tribunal.sigla) {
    siglaTribunal = esc.tribunal.sigla;
  } else if (esc.diario_sigla) {
    siglaTribunal = esc.diario_sigla;
  }

  // 1. Converte as movimentações (andamentos)
  const rawMovs = esc.movimentacoes || esc.ultimas_movimentacoes_resumo || [];
  const movimentos: DataJudMovimento[] = rawMovs.map((m: any) => ({
    codigo: m.id || 0,
    nome: m.texto || m.conteudo || m.conteudo_resumo || 'Movimentação Processual',
    dataHora: m.data || new Date().toISOString(),
    complemento: m.tipo || '',
  }));

  // 2. Converte as partes envolvidas
  const involvedMap = new Map<string, DataJudParte>();

  // Auxiliar para normalizar o tipo de envolvido
  const normalizarTipo = (t: string) => {
    if (!t) return 'Parte';
    if (t.toLowerCase().includes('adv')) return 'Advogado';
    return t;
  };

  // 2.1 Verifica esc.partes (V1)
  if (Array.isArray(esc.partes)) {
    esc.partes.forEach((p: any) => {
      if (p.nome) {
        involvedMap.set(p.nome, {
          nome: p.nome,
          tipo: normalizarTipo(p.tipo),
        });
        if (Array.isArray(p.advogados)) {
          p.advogados.forEach((adv: any) => {
            if (adv.nome) {
              involvedMap.set(adv.nome, {
                nome: adv.nome,
                tipo: 'Advogado',
                documento: adv.oab || undefined,
              });
            }
          });
        }
      }
    });
  }

  // 2.2 Verifica esc.envolvidos_ultima_movimentacao
  if (Array.isArray(esc.envolvidos_ultima_movimentacao)) {
    esc.envolvidos_ultima_movimentacao.forEach((p: any) => {
      if (p.nome) {
        involvedMap.set(p.nome, {
          nome: p.nome,
          tipo: normalizarTipo(p.tipo || p.pivot_tipo || p.envolvido_tipo),
        });
      }
    });
  }

  // 2.3 Verifica esc.fontes[...].envolvidos (V2 advogado/processos e envolvido/processos)
  if (Array.isArray(esc.fontes)) {
    esc.fontes.forEach((f: any) => {
      if (Array.isArray(f.envolvidos)) {
        f.envolvidos.forEach((p: any) => {
          if (p.nome) {
            involvedMap.set(p.nome, {
              nome: p.nome,
              tipo: normalizarTipo(p.tipo || p.tipo_normalizado),
            });
            if (Array.isArray(p.advogados)) {
              p.advogados.forEach((adv: any) => {
                if (adv.nome) {
                  involvedMap.set(adv.nome, {
                    nome: adv.nome,
                    tipo: 'Advogado',
                    documento: adv.oab || undefined,
                  });
                }
              });
            }
          }
        });
      }
    });
  }

  // 2.4 Verifica esc.ultimas_movimentacoes_resumo[...].envolvidos_resumo (V1 resumo)
  if (Array.isArray(esc.ultimas_movimentacoes_resumo)) {
    esc.ultimas_movimentacoes_resumo.forEach((m: any) => {
      if (Array.isArray(m.envolvidos_resumo)) {
        m.envolvidos_resumo.forEach((p: any) => {
          if (p.nome) {
            involvedMap.set(p.nome, {
              nome: p.nome,
              tipo: normalizarTipo(p.tipo || p.envolvido_tipo),
              documento: p.oab || undefined,
            });
          }
        });
      }
    });
  }

  // 2.5 Verifica esc.movimentacoes[...].envolvidos (V1 movimentações detalhadas)
  if (Array.isArray(esc.movimentacoes)) {
    esc.movimentacoes.forEach((m: any) => {
      if (Array.isArray(m.envolvidos)) {
        m.envolvidos.forEach((p: any) => {
          if (p.nome) {
            involvedMap.set(p.nome, {
              nome: p.nome,
              tipo: normalizarTipo(p.tipo || p.envolvido_tipo),
              documento: p.oab || undefined,
            });
          }
        });
      }
    });
  }

  // 2.6 Se a lista ainda estiver vazia, tenta extrair dos títulos de polo ativo/passivo da capa (V2)
  if (involvedMap.size === 0) {
    if (esc.titulo_polo_ativo) {
      involvedMap.set(esc.titulo_polo_ativo, { nome: esc.titulo_polo_ativo, tipo: 'Polo Ativo' });
    }
    if (esc.titulo_polo_passivo) {
      involvedMap.set(esc.titulo_polo_passivo, { nome: esc.titulo_polo_passivo, tipo: 'Polo Passivo' });
    }
  }

  const partes = Array.from(involvedMap.values());

  const numCnj = esc.numero_cnj || esc.numero_novo || '';

  return {
    id: String(esc.id || numCnj || Math.random()),
    numeroProcesso: numCnj.replace(/\D/g, '') || '',
    classe: { codigo: 0, nome: esc.classe || esc.tipo_ultima_movimentacao || 'Procedimento Judicial' },
    sistema: { codigo: 0, nome: esc.sistema || 'PJe' },
    formato: { codigo: 0, nome: 'Eletrônico' },
    tribunal: siglaTribunal,
    grau: esc.grau || '1º Grau',
    dataAjuizamento: esc.data_inicio || esc.created_at || new Date().toISOString(),
    dataHoraUltimaAtualizacao: esc.data_ultima_movimentacao || esc.updated_at || new Date().toISOString(),
    movimentos,
    orgaoJulgador: { codigo: 0, nome: esc.orgao_julgador || esc.secao || 'Vara / Juízo', codigoMunicipioIBGE: 0 },
    assuntos: (esc.assuntos || []).map((a: any) => ({
      codigo: 0,
      nome: typeof a === 'string' ? a : a.nome || 'Assunto',
    })),
    partes,
    nivelSigilo: 0,
  };
}

/**
 * Consulta os dados completos de um processo único pelo número CNJ
 */
export async function consultarProcesso(
  numeroCnj: string,
  _tribunalAlias?: TribunalAlias // Ignorado
): Promise<DataJudProcesso | null> {
  try {
    const cnjLimpo = numeroCnj.replace(/\D/g, '');
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes.data.session?.access_token;

    const response = await fetch(`${EDGE_FUNCTION_URL}/processo-cnj?numero=${cnjLimpo}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.details || errData.error || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data?.error || data?.message === 'Processo não encontrado') return null;

    const processoRaw = data?.processo || data;
    if (!processoRaw || (!processoRaw.numero_cnj && !processoRaw.numero_novo)) return null;

    return mapearProcessoEscavador(processoRaw);
  } catch (err: any) {
    console.error('[Escavador Adapter] Erro na consulta de processo:', err);
    throw err;
  }
}

/**
 * Busca processos por nome da parte ou termo genérico
 */
export async function buscarPorNome(
  nome: string,
  _tribunalAlias?: TribunalAlias, // Ignorado
  _size = 30
): Promise<DataJudProcesso[]> {
  try {
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes.data.session?.access_token;

    const response = await fetch(`${EDGE_FUNCTION_URL}/busca?q=${encodeURIComponent(nome)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.details || errData.error || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawItems = data?.items || data?.resultado?.items || (Array.isArray(data) ? data : []);
    
    return rawItems
      .filter((item: any) => item !== null && (item.numero_cnj || item.numero))
      .map((item: any) => {
        const normalized = {
          ...item,
          numero_cnj: item.numero_cnj || item.numero,
          id: item.id || item.numero
        };
        return mapearProcessoEscavador(normalized);
      });
  } catch (err: any) {
    console.error('[Escavador Adapter] Erro na busca por nome:', err);
    throw err;
  }
}

/**
 * Busca processos de um advogado pelo seu número de OAB
 */
export async function buscarPorOAB(
  numeroOAB: string,
  estadoOAB: string,
  _tribunalAlias?: TribunalAlias, // Ignorado
  _size = 30
): Promise<DataJudProcesso[]> {
  try {
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes.data.session?.access_token;

    const response = await fetch(`${EDGE_FUNCTION_URL}/processos?oab_numero=${numeroOAB.replace(/\D/g, '')}&oab_uf=${estadoOAB.toUpperCase()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.details || errData.error || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawItems = data?.items || data?.processos || (Array.isArray(data) ? data : []);

    return rawItems
      .filter((item: any) => item !== null && (item.numero_cnj || item.numero))
      .map((item: any) => {
        const normalized = {
          ...item,
          numero_cnj: item.numero_cnj || item.numero,
          id: item.id || item.numero
        };
        return mapearProcessoEscavador(normalized);
      });
  } catch (err: any) {
    console.error('[Escavador Adapter] Erro na busca por OAB:', err);
    throw err;
  }
}

/**
 * Utilitários para formatação e processamento (compatibilidade com datajud.ts)
 */
export function formatarNumeroCNJ(numero: string): string {
  const digits = numero.replace(/[^0-9]/g, '');
  if (digits.length !== 20) return numero;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

export function extrairAndamentosRecentes(
  processo: DataJudProcesso,
  limite = 10
): DataJudMovimento[] {
  return [...(processo.movimentos || [])]
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
    .slice(0, limite);
}
