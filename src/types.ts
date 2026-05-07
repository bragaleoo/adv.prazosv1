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
