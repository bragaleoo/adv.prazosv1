/**
 * Módulo de IA — Análise de andamentos e publicações jurídicas via Gemini
 * Usa a lib @google/genai já instalada no projeto
 */

import { GoogleGenAI } from '@google/genai';
import { SugestaoIA } from '../types';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || import.meta.env.VITE_GOOGLE_AI_KEY || '';

function getClient() {
  if (!GEMINI_KEY) {
    console.warn('[AI] VITE_GEMINI_KEY não configurada. Sugestões de IA desabilitadas.');
    return null;
  }
  return new GoogleGenAI({ apiKey: GEMINI_KEY });
}

const SYSTEM_PROMPT = `Você é um assistente jurídico especializado em direito processual brasileiro.
Analise o texto de um andamento processual e retorne SOMENTE um JSON válido (sem markdown, sem código) com a estrutura:
{
  "acao": "descrição clara da próxima ação necessária",
  "prazo_dias": <número inteiro de dias para a ação, 0 se não houver prazo>,
  "urgencia": "alta" | "media" | "baixa",
  "justificativa": "explicação breve e objetiva do motivo da ação"
}

Regras:
- urgencia "alta": decisão com prazo curto (<= 5 dias), despacho para manifestação imediata, sentença
- urgencia "media": intimação com prazo de 15 dias, publicação para recurso
- urgencia "baixa": mero expediente, juntada de documento, informação, despacho administrativo
- Se não houver ação necessária, use acao "Monitorar andamento", prazo_dias 0, urgencia "baixa"`;

/**
 * Analisa o texto de um andamento processual e retorna sugestão de ação.
 */
export async function analisarAndamento(
  textoAndamento: string,
  contextoProcesso?: string
): Promise<SugestaoIA | null> {
  const ai = getClient();
  if (!ai) return null;

  try {
    const prompt = contextoProcesso
      ? `Processo: ${contextoProcesso}\n\nAndamento: ${textoAndamento}`
      : `Andamento: ${textoAndamento}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 256,
      },
    });

    const raw = response.text?.trim() || '';
    // Remove possíveis blocos de código markdown que a IA possa retornar
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as SugestaoIA;
  } catch (err) {
    console.error('[AI] Erro ao analisar andamento:', err);
    return null;
  }
}

/**
 * Analisa uma publicação do Diário Oficial e sugere ação.
 */
export async function analisarPublicacao(
  textoPublicacao: string
): Promise<SugestaoIA | null> {
  const ai = getClient();
  if (!ai) return null;

  try {
    const prompt = `Publicação do Diário da Justiça:\n\n${textoPublicacao}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] },
      ],
      config: { temperature: 0.2, maxOutputTokens: 256 },
    });

    const raw = response.text?.trim() || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as SugestaoIA;
  } catch (err) {
    console.error('[AI] Erro ao analisar publicação:', err);
    return null;
  }
}

/**
 * Gera um resumo executivo de um conjunto de andamentos.
 */
export async function resumirAndamentos(
  andamentos: Array<{ descricao: string; data: string }>
): Promise<string | null> {
  const ai = getClient();
  if (!ai) return null;

  try {
    const lista = andamentos
      .map((a) => `[${a.data}] ${a.descricao}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [{
            text: `Você é um assistente jurídico. Faça um resumo executivo conciso (máximo 3 frases) da situação atual deste processo com base nos andamentos recentes:\n\n${lista}`
          }],
        },
      ],
      config: { temperature: 0.3, maxOutputTokens: 200 },
    });

    return response.text?.trim() || null;
  } catch (err) {
    console.error('[AI] Erro ao resumir andamentos:', err);
    return null;
  }
}
