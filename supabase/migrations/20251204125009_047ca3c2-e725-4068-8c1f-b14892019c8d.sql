-- Criar tabela de categorias
CREATE TABLE public.categorias_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Criar tabela de alocações
CREATE TABLE public.alocacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Criar tabela de status
CREATE TABLE public.status_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.categorias_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alocacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_item ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias_item
CREATE POLICY "Users can view all categories" ON public.categorias_item
FOR SELECT USING (true);

CREATE POLICY "Users can insert categories" ON public.categorias_item
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their categories" ON public.categorias_item
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their categories" ON public.categorias_item
FOR DELETE USING (auth.uid() = user_id);

-- Políticas para alocacoes
CREATE POLICY "Users can view all alocacoes" ON public.alocacoes
FOR SELECT USING (true);

CREATE POLICY "Users can insert alocacoes" ON public.alocacoes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their alocacoes" ON public.alocacoes
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their alocacoes" ON public.alocacoes
FOR DELETE USING (auth.uid() = user_id);

-- Políticas para status_item
CREATE POLICY "Users can view all status" ON public.status_item
FOR SELECT USING (true);

CREATE POLICY "Users can insert status" ON public.status_item
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their status" ON public.status_item
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their status" ON public.status_item
FOR DELETE USING (auth.uid() = user_id);