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
  }

  // 1. Converte as movimentações (andamentos)
  const movimentos: DataJudMovimento[] = (esc.movimentacoes || []).map((m: any) => ({
    codigo: m.id || 0,
    nome: m.texto || m.conteudo || 'Movimentação Processual',
    dataHora: m.data || new Date().toISOString(),
    complemento: m.tipo || '',
  }));

  // 2. Converte as partes envolvidas
  const partes: DataJudParte[] = [];
  (esc.partes || []).forEach((p: any) => {
    partes.push({
      nome: p.nome || 'Parte Sem Nome',
      tipo: p.tipo || 'Parte',
    });

    // Se houver advogados aninhados na parte, adiciona-os também na lista
    if (p.advogados && Array.isArray(p.advogados)) {
      p.advogados.forEach((adv: any) => {
        partes.push({
          nome: adv.nome || 'Advogado Sem Nome',
          tipo: 'Advogado',
          documento: adv.oab || undefined,
        });
      });
    }
  });

  return {
    id: String(esc.id || esc.numero_cnj || Math.random()),
    numeroProcesso: esc.numero_cnj?.replace(/\D/g, '') || '',
    classe: { codigo: 0, nome: esc.classe || 'Procedimento Judicial' },
    sistema: { codigo: 0, nome: esc.sistema || 'PJe' },
    formato: { codigo: 0, nome: 'Eletrônico' },
    tribunal: siglaTribunal,
    grau: esc.grau || '1º Grau',
    dataAjuizamento: esc.data_inicio || new Date().toISOString(),
    dataHoraUltimaAtualizacao: esc.data_ultima_movimentacao || new Date().toISOString(),
    movimentos,
    orgaoJulgador: { codigo: 0, nome: esc.orgao_julgador || 'Vara / Juízo', codigoMunicipioIBGE: 0 },
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
  _tribunalAlias?: TribunalAlias // Ignorado no Escavador pois a busca é nacional
): Promise<DataJudProcesso | null> {
  try {
    const cnjLimpo = numeroCnj.replace(/\D/g, '');
    const { data, error } = await supabase.functions.invoke('escavador-webhook', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      // Passamos a rota /processo-cnj usando queryParams do supabase-js
      // que são repassados ao endpoint da Edge Function
      queryParams: {
        numero: cnjLimpo
      }
    });

    if (error) throw new Error(`Erro na chamada da Edge Function: ${error.message}`);
    
    // Roteador de erros da API do Escavador
    if (data?.error || data?.message === 'Processo não encontrado') return null;

    // A Edge Function chama a rota que mapeia para o endpoint do Escavador /processos/numero/{cnj}
    // O retorno pode vir direto do Escavador ou em formato aninhado
    const processoRaw = data?.processo || data;
    if (!processoRaw || !processoRaw.numero_cnj) return null;

    return mapearProcessoEscavador(processoRaw);
  } catch (err) {
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
    const { data, error } = await supabase.functions.invoke('escavador-webhook', {
      method: 'GET',
      queryParams: {
        q: nome
      }
    });

    if (error) throw new Error(`Erro na busca por nome: ${error.message}`);

    // O retorno do Escavador para /busca?q=... contém os processos em data.items ou data.resultado.items
    const rawItems = data?.items || data?.resultado?.items || (Array.isArray(data) ? data : []);
    
    return rawItems
      .filter((item: any) => item !== null && (item.numero_cnj || item.numero))
      .map((item: any) => {
        // Normaliza campos do escavador que às vezes variam entre busca geral e busca específica
        const normalized = {
          ...item,
          numero_cnj: item.numero_cnj || item.numero,
          id: item.id || item.numero
        };
        return mapearProcessoEscavador(normalized);
      });
  } catch (err) {
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
    const { data, error } = await supabase.functions.invoke('escavador-webhook', {
      method: 'GET',
      queryParams: {
        oab_numero: numeroOAB.replace(/\D/g, ''),
        oab_uf: estadoOAB.toUpperCase()
      }
    });

    if (error) throw new Error(`Erro na busca por OAB: ${error.message}`);

    // O retorno de /advogado/processos do Escavador está em data.items ou data.processos
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
  } catch (err) {
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
