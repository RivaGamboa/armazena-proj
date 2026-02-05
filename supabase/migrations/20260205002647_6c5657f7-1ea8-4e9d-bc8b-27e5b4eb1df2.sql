-- Add measurement columns and gallery support to itens_restaurante

-- Add dimension columns (in centimeters)
ALTER TABLE public.itens_restaurante 
ADD COLUMN IF NOT EXISTS largura_cm numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS altura_cm numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS profundidade_cm numeric DEFAULT NULL;

-- Add gallery support - array of image URLs and featured image index
ALTER TABLE public.itens_restaurante 
ADD COLUMN IF NOT EXISTS galeria_fotos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS foto_destaque_index integer DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.itens_restaurante.largura_cm IS 'Largura do item em centímetros';
COMMENT ON COLUMN public.itens_restaurante.altura_cm IS 'Altura do item em centímetros';
COMMENT ON COLUMN public.itens_restaurante.profundidade_cm IS 'Profundidade do item em centímetros';
COMMENT ON COLUMN public.itens_restaurante.galeria_fotos IS 'Array de URLs das fotos do item';
COMMENT ON COLUMN public.itens_restaurante.foto_destaque_index IS 'Índice da foto destaque na galeria (0-based)';