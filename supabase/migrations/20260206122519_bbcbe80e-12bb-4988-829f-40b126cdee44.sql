-- Change alocacao column from enum to text
ALTER TABLE public.itens_em_estoque 
  ALTER COLUMN alocacao TYPE text USING alocacao::text;

-- Change categoria_item column from enum to text  
ALTER TABLE public.itens_em_estoque 
  ALTER COLUMN categoria_item TYPE text USING categoria_item::text;

-- Change status_item column from enum to text
ALTER TABLE public.itens_em_estoque 
  ALTER COLUMN status_item TYPE text USING status_item::text;

-- Also update historico_movimentacoes columns
ALTER TABLE public.historico_movimentacoes
  ALTER COLUMN alocacao_anterior TYPE text USING alocacao_anterior::text;

ALTER TABLE public.historico_movimentacoes
  ALTER COLUMN alocacao_nova TYPE text USING alocacao_nova::text;

ALTER TABLE public.historico_movimentacoes
  ALTER COLUMN status_anterior TYPE text USING status_anterior::text;

ALTER TABLE public.historico_movimentacoes
  ALTER COLUMN status_novo TYPE text USING status_novo::text;

-- Set default values
ALTER TABLE public.itens_em_estoque 
  ALTER COLUMN alocacao SET DEFAULT 'DEPOSITO';

ALTER TABLE public.itens_em_estoque 
  ALTER COLUMN status_item SET DEFAULT 'NOVO';