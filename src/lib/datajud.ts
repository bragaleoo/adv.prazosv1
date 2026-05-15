/**
 * DataJud — API Pública do CNJ
 * Chamadas são roteadas via Supabase Edge Function (datajud-proxy) para evitar CORS.
 * Docs: https://datajud-wiki.cnj.jus.br/api-publica/
 */

import { supabase } from './supabase';
import { TribunalAlias } from '../types';

// Mapa de siglas de tribunal para alias da API
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

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface DataJudMovimento {
  codigo: number;
  nome: string;
  dataHora: string;
  complementosTabelados?: { codigo: number; valor: string }[];
  complemento?: string;
}

export interface DataJudParte {
  nome: string;
  tipo: string;
  documento?: string;
}

export interface DataJudProcesso {
  id: string;
  numeroProcesso: string;
  classe: { codigo: number; nome: string };
  sistema: { codigo: number; nome: string };
  formato: { codigo: number; nome: string };
  tribunal: string;
  grau: string;
  dataAjuizamento: string;
  dataHoraUltimaAtualizacao: string;
  movimentos: DataJudMovimento[];
  orgaoJulgador: { codigo: number; nome: string; codigoMunicipioIBGE: number };
  assuntos: { codigo: number; nome: string }[];
  partes: DataJudParte[];
  nivelSigilo: number;
}

export interface DataJudResponse {
  hits: {
    total: { value: number; relation: string };
    hits: Array<{ _source: DataJudProcesso }>;
  };
}

// ─── Função auxiliar — chama a Edge Function proxy ───────────────────────────

async function chamarProxy(tribunal: TribunalAlias, body: object): Promise<DataJudResponse> {
  const { data, error } = await supabase.functions.invoke('datajud-proxy', {
    body: { tribunal, body },
  });

  if (error) throw new Error(`Proxy error: ${error.message}`);
  if (data?.error) throw new Error(`DataJud: ${data.error}`);

  return data as DataJudResponse;
}

// ─── Consulta por número CNJ ──────────────────────────────────────────────────

export async function consultarProcesso(
  numeroCnj: string,
  tribunalAlias: TribunalAlias
): Promise<DataJudProcesso | null> {
  try {
    const data = await chamarProxy(tribunalAlias, {
      query: {
        match: { numeroProcesso: numeroCnj.replace(/[^0-9]/g, '') },
      },
      size: 1,
      sort: [{ dataHoraUltimaAtualizacao: { order: 'desc' } }],
    });

    const hits = data?.hits?.hits;
    if (!hits || hits.length === 0) return null;
    return hits[0]._source;
  } catch (err) {
    console.error('[DataJud] Erro na consulta por número:', err);
    throw err;
  }
}

// ─── Busca por nome de parte / advogado ──────────────────────────────────────

export async function buscarPorNome(
  nome: string,
  tribunalAlias: TribunalAlias,
  size = 30
): Promise<DataJudProcesso[]> {
  try {
    const data = await chamarProxy(tribunalAlias, {
      query: {
        nested: {
          path: 'partes',
          query: { match: { 'partes.nome': nome } },
        },
      },
      size,
      sort: [{ dataHoraUltimaAtualizacao: { order: 'desc' } }],
    });

    return (data?.hits?.hits || []).map((h) => h._source);
  } catch (err) {
    console.error('[DataJud] Erro na busca por nome:', err);
    throw err;
  }
}

// ─── Busca por número OAB ─────────────────────────────────────────────────────
// O DataJud indexa o número OAB no campo partes.documento (ex: "12345/SE")
// A query usa nested + bool para garantir que é a parte do tipo Advogado.

export async function buscarPorOAB(
  numeroOAB: string,
  estadoOAB: string,        // ex: 'SE', 'SP', 'RJ'...
  tribunalAlias: TribunalAlias,
  size = 30
): Promise<DataJudProcesso[]> {
  // Normaliza — tenta "12345SE", "12345/SE" e "SE12345" para máxima cobertura
  const numLimpo = numeroOAB.replace(/\D/g, '');
  const estado = estadoOAB.toUpperCase();

  // Variações do documento OAB que o DataJud pode indexar
  const variacoes = [
    `${numLimpo}/${estado}`,
    `${numLimpo}${estado}`,
    `${estado}${numLimpo}`,
    numLimpo,
  ];

  try {
    const data = await chamarProxy(tribunalAlias, {
      query: {
        nested: {
          path: 'partes',
          query: {
            bool: {
              must: [
                {
                  terms: {
                    'partes.documento.keyword': variacoes,
                  },
                },
              ],
              should: [
                { match: { 'partes.tipo': 'Advogado' } },
                { match: { 'partes.tipo': 'ADVOGADO' } },
              ],
            },
          },
        },
      },
      size,
      sort: [{ dataHoraUltimaAtualizacao: { order: 'desc' } }],
    });

    return (data?.hits?.hits || []).map((h) => h._source);
  } catch (err) {
    console.error('[DataJud] Erro na busca por OAB:', err);
    throw err;
  }
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

/**
 * Formata número CNJ para exibição: 0050503-85.2018.8.17.1234
 */
export function formatarNumeroCNJ(numero: string): string {
  const digits = numero.replace(/[^0-9]/g, '');
  if (digits.length !== 20) return numero;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

/**
 * Extrai os andamentos mais recentes (movimentos), ordenados por data desc.
 */
export function extrairAndamentosRecentes(
  processo: DataJudProcesso,
  limite = 10
): DataJudMovimento[] {
  return [...(processo.movimentos || [])]
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
    .slice(0, limite);
}
