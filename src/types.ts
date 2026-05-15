export interface Client {
  id: string;
  created_at: string;
  updated_at: string;
  nome: string;
  sender: string;
  ultimo_contato: string;
  ultimo_vendedor: string;
  sobre: string;
  status: string;
  origem: string;
}

export interface Prazo {
  id: string;
  client_id: string;
  descricao: string;
  data_vencimento: string;
  lembrete_1_dia: boolean;
  lembrete_no_dia: boolean;
  status: 'pendente' | 'concluido' | string;
  tipo: string;
  prioridade: 'alta' | 'media' | 'baixa' | string;
  created_at: string;
  updated_at: string;
  notificado: boolean;
  notificado_em: string | null;
  // Joined client data
  client?: Client;
}

// ─── PROCESSOS ───────────────────────────────────────────────────────────────

export type TribunalAlias =
  | 'api_publica_tjac' | 'api_publica_tjal' | 'api_publica_tjam' | 'api_publica_tjap'
  | 'api_publica_tjba' | 'api_publica_tjce' | 'api_publica_tjdft' | 'api_publica_tjes'
  | 'api_publica_tjgo' | 'api_publica_tjma' | 'api_publica_tjmg' | 'api_publica_tjms'
  | 'api_publica_tjmt' | 'api_publica_tjpa' | 'api_publica_tjpb' | 'api_publica_tjpe'
  | 'api_publica_tjpi' | 'api_publica_tjpr' | 'api_publica_tjrj' | 'api_publica_tjrn'
  | 'api_publica_tjro' | 'api_publica_tjrr' | 'api_publica_tjrs' | 'api_publica_tjsc'
  | 'api_publica_tjse' | 'api_publica_tjsp' | 'api_publica_tjto'
  | 'api_publica_trf1' | 'api_publica_trf2' | 'api_publica_trf3'
  | 'api_publica_trf4' | 'api_publica_trf5' | 'api_publica_trf6'
  | 'api_publica_stj' | 'api_publica_stf' | 'api_publica_tst'
  | string;

export interface Processo {
  id: string;
  user_id: string;
  numero_cnj: string;         // ex: 0050503-85.2018.8.17.1234
  titulo: string;
  cliente_id: string | null;
  tribunal: string;           // ex: TJSE
  tribunal_alias: TribunalAlias;
  vara: string | null;
  status: 'ativo' | 'arquivado' | 'suspenso';
  ultima_consulta_datajud: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  cliente?: Client;
  andamentos?: Andamento[];
}

// ─── ANDAMENTOS ──────────────────────────────────────────────────────────────

export type AndamentoUrgencia = 'alta' | 'media' | 'baixa';

export interface SugestaoIA {
  acao: string;
  prazo_dias: number;
  urgencia: AndamentoUrgencia;
  justificativa: string;
}

export interface Andamento {
  id: string;
  processo_id: string;
  data_andamento: string;
  descricao: string;
  codigo_movimento: string | null;
  tratado: boolean;
  sugestao_ia: SugestaoIA | null;
  prazo_criado_id: string | null;
  created_at: string;
  // Joined
  processo?: Processo;
}

// ─── KANBAN ──────────────────────────────────────────────────────────────────

export type KanbanStatus = 'a_fazer' | 'fazendo' | 'concluido';

export interface TarefaKanban {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  status: KanbanStatus;
  processo_id: string | null;
  cliente_id: string | null;
  data_vencimento: string | null;
  created_at: string;
  // Joined
  processo?: Processo;
  cliente?: Client;
}

// ─── PUBLICAÇÕES ─────────────────────────────────────────────────────────────

export interface Publicacao {
  id: string;
  user_id: string;
  nome_monitorado: string;      // nome do advogado/cliente
  data_publicacao: string;
  diario: string;               // ex: DJSE, DJE-TJ/SE
  excerpt: string;
  url: string | null;
  processo_id: string | null;
  tratada: boolean;
  created_at: string;
  processo?: Processo;
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

export type OperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
