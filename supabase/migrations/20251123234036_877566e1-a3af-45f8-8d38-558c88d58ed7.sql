-- Create enum types
CREATE TYPE status_item_enum AS ENUM ('NOVO', 'USADO', 'DANIFICADO', 'EM_MANUTENCAO');
CREATE TYPE alocacao_enum AS ENUM ('DEPOSITO', 'EVENTO', 'FUNCIONARIO');
CREATE TYPE categoria_item_enum AS ENUM (
  'Estruturas Metálicas',
  'Iluminação',
  'Áudio/Vídeo',
  'Ferramentas Manuais',
  'Ferramentas Elétricas',
  'Materiais de Consumo',
  'Mobiliário',
  'Sinalização Gráfica',
  'Decorativos',
  'Equipamentos de Segurança',
  'Elétricos',
  'Diversos'
);

-- Create the main table
CREATE TABLE public.itens_em_estoque (
  id_item BIGSERIAL PRIMARY KEY,
  categoria_item categoria_item_enum NOT NULL,
  nome_item TEXT NOT NULL,
  descricao_item TEXT,
  status_item status_item_enum NOT NULL DEFAULT 'NOVO',
  alocacao alocacao_enum NOT NULL DEFAULT 'DEPOSITO',
  quantidade_novo INTEGER NOT NULL DEFAULT 0,
  quantidade_usado INTEGER NOT NULL DEFAULT 0,
  quantidade_danificado INTEGER NOT NULL DEFAULT 0,
  quantidade_em_manutencao INTEGER NOT NULL DEFAULT 0,
  quantidade_total INTEGER GENERATED ALWAYS AS (quantidade_novo + quantidade_usado + quantidade_danificado + quantidade_em_manutencao) STORED,
  comprimento_cm DECIMAL(10,2),
  largura_cm DECIMAL(10,2),
  profundidade_cm DECIMAL(10,2),
  peso_kg DECIMAL(10,2),
  imagem_item TEXT,
  video_item TEXT,
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ultima_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT now(),
  offline_operations JSONB DEFAULT '[]'::jsonb
);

-- Create table for movement history
CREATE TABLE public.historico_movimentacoes (
  id BIGSERIAL PRIMARY KEY,
  id_item BIGINT REFERENCES public.itens_em_estoque(id_item) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  tipo_operacao TEXT NOT NULL,
  alocacao_anterior alocacao_enum,
  alocacao_nova alocacao_enum,
  status_anterior status_item_enum,
  status_novo status_item_enum,
  quantidade_alterada INTEGER,
  observacoes TEXT,
  data_operacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.itens_em_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_movimentacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for itens_em_estoque
CREATE POLICY "Users can view all items"
  ON public.itens_em_estoque FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own items"
  ON public.itens_em_estoque FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update items"
  ON public.itens_em_estoque FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own items"
  ON public.itens_em_estoque FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for historico_movimentacoes
CREATE POLICY "Users can view all history"
  ON public.historico_movimentacoes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own history"
  ON public.historico_movimentacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for images and videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('estoque-media', 'estoque-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'estoque-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'estoque-media');

CREATE POLICY "Users can update their own media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'estoque-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'estoque-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger to update ultima_atualizacao
CREATE OR REPLACE FUNCTION public.update_ultima_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ultima_atualizacao = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ultima_atualizacao
  BEFORE UPDATE ON public.itens_em_estoque
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ultima_atualizacao();