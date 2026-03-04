
-- Add alocacao_atual column to itens_em_estoque (current location, initially same as alocacao which is the default)
ALTER TABLE public.itens_em_estoque ADD COLUMN IF NOT EXISTS alocacao_atual text;

-- Set initial value of alocacao_atual to match alocacao (the default location)
UPDATE public.itens_em_estoque SET alocacao_atual = alocacao WHERE alocacao_atual IS NULL;

-- Set default for new rows
ALTER TABLE public.itens_em_estoque ALTER COLUMN alocacao_atual SET DEFAULT 'DEPOSITO';

-- Add is_default column to alocacoes table
ALTER TABLE public.alocacoes ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
