
-- Add JSONB column for dynamic status-based quantities
ALTER TABLE public.itens_em_estoque 
ADD COLUMN IF NOT EXISTS quantidades_por_status jsonb DEFAULT '{}'::jsonb;

-- Migrate existing data from fixed columns to the new JSONB column
UPDATE public.itens_em_estoque 
SET quantidades_por_status = jsonb_build_object(
  'ITEM NOVO', COALESCE(quantidade_novo, 0),
  'ITEM USADO', COALESCE(quantidade_usado, 0),
  'ITEM USADO COM AVARIA', COALESCE(quantidade_danificado, 0),
  'AVARIA/DESCARTE', COALESCE(quantidade_em_manutencao, 0)
)
WHERE quantidades_por_status IS NULL OR quantidades_por_status = '{}'::jsonb;
