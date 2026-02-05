// Types for RestauraStock inventory system

export type MovimentoTipo = 'entrada' | 'saida' | 'transferencia' | 'perda' | 'ajuste';
export type ItemStatus = 'ativo' | 'manutencao' | 'descartado';
export type Localizacao = 'Cozinha' | 'Salao' | 'Bar' | 'Deposito' | 'Area Externa' | 'Escritorio';

export interface CategoriaRestaurante {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  cor: string | null;
  criado_por: string;
  created_at: string;
  updated_at: string;
}

export interface ItemRestaurante {
  id: string;
  nome: string;
  descricao: string | null;
  categoria_id: string | null;
  quantidade: number;
  quantidade_minima: number;
  localizacao: Localizacao;
  fornecedor: string | null;
  custo: number | null;
  data_aquisicao: string | null;
  codigo_barras: string | null;
  foto_url: string | null;
  status: ItemStatus;
  criado_por: string;
  created_at: string;
  updated_at: string;
  // Dimensões em centímetros
  largura_cm: number | null;
  altura_cm: number | null;
  profundidade_cm: number | null;
  // Galeria de fotos
  galeria_fotos: string[];
  foto_destaque_index: number;
  // Joined data
  categoria?: CategoriaRestaurante;
}

export interface MovimentacaoRestaurante {
  id: string;
  item_id: string;
  tipo: MovimentoTipo;
  quantidade: number;
  observacao: string | null;
  usuario_id: string;
  created_at: string;
  // Joined data
  item?: ItemRestaurante;
}

export interface DashboardStats {
  totalItens: number;
  estoqueBaixo: number;
  emManutencao: number;
  valorTotal: number;
  totalCategorias: number;
  movimentacoesHoje: number;
}
