-- =============================================
-- RESTAURASTOCK: Sistema de Inventário para Restaurante
-- =============================================

-- Criar enum para tipos de movimentação
CREATE TYPE public.movimento_tipo AS ENUM ('entrada', 'saida', 'transferencia', 'perda', 'ajuste');

-- Criar enum para status do item
CREATE TYPE public.item_status AS ENUM ('ativo', 'manutencao', 'descartado');

-- Criar enum para localização
CREATE TYPE public.localizacao_enum AS ENUM ('Cozinha', 'Salao', 'Bar', 'Deposito', 'Area Externa', 'Escritorio');

-- =============================================
-- TABELA: categorias_restaurante
-- =============================================
CREATE TABLE public.categorias_restaurante (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    icone TEXT,
    cor TEXT DEFAULT '#3B82F6',
    criado_por UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.categorias_restaurante ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuarios podem ver categorias" ON public.categorias_restaurante
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios podem criar categorias" ON public.categorias_restaurante
    FOR INSERT WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "Usuarios podem atualizar suas categorias" ON public.categorias_restaurante
    FOR UPDATE USING (auth.uid() = criado_por);

CREATE POLICY "Usuarios podem deletar suas categorias" ON public.categorias_restaurante
    FOR DELETE USING (auth.uid() = criado_por);

-- =============================================
-- TABELA: itens_restaurante
-- =============================================
CREATE TABLE public.itens_restaurante (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria_id UUID REFERENCES public.categorias_restaurante(id) ON DELETE SET NULL,
    quantidade INTEGER NOT NULL DEFAULT 0,
    quantidade_minima INTEGER NOT NULL DEFAULT 5,
    localizacao public.localizacao_enum NOT NULL DEFAULT 'Deposito',
    fornecedor TEXT,
    custo DECIMAL(10,2) DEFAULT 0,
    data_aquisicao DATE,
    codigo_barras TEXT,
    foto_url TEXT,
    status public.item_status NOT NULL DEFAULT 'ativo',
    criado_por UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.itens_restaurante ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuarios podem ver itens" ON public.itens_restaurante
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios podem criar itens" ON public.itens_restaurante
    FOR INSERT WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "Usuarios podem atualizar itens" ON public.itens_restaurante
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios podem deletar seus itens" ON public.itens_restaurante
    FOR DELETE USING (auth.uid() = criado_por);

-- =============================================
-- TABELA: movimentacoes_restaurante
-- =============================================
CREATE TABLE public.movimentacoes_restaurante (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.itens_restaurante(id) ON DELETE CASCADE,
    tipo public.movimento_tipo NOT NULL,
    quantidade INTEGER NOT NULL,
    observacao TEXT,
    usuario_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.movimentacoes_restaurante ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuarios podem ver movimentacoes" ON public.movimentacoes_restaurante
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios podem criar movimentacoes" ON public.movimentacoes_restaurante
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- =============================================
-- FUNÇÃO: Atualizar quantidade do item após movimentação
-- =============================================
CREATE OR REPLACE FUNCTION public.atualizar_quantidade_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.tipo = 'entrada' THEN
        UPDATE itens_restaurante 
        SET quantidade = quantidade + NEW.quantidade,
            updated_at = NOW()
        WHERE id = NEW.item_id;
    ELSIF NEW.tipo IN ('saida', 'perda') THEN
        UPDATE itens_restaurante 
        SET quantidade = GREATEST(0, quantidade - NEW.quantidade),
            updated_at = NOW()
        WHERE id = NEW.item_id;
    ELSIF NEW.tipo = 'ajuste' THEN
        UPDATE itens_restaurante 
        SET quantidade = NEW.quantidade,
            updated_at = NOW()
        WHERE id = NEW.item_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger para atualizar quantidade
CREATE TRIGGER trigger_atualizar_quantidade
    AFTER INSERT ON public.movimentacoes_restaurante
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_quantidade_item();

-- =============================================
-- FUNÇÃO: Atualizar updated_at automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_restaurante()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Triggers para updated_at
CREATE TRIGGER trigger_categorias_updated_at
    BEFORE UPDATE ON public.categorias_restaurante
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_restaurante();

CREATE TRIGGER trigger_itens_updated_at
    BEFORE UPDATE ON public.itens_restaurante
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_restaurante();

-- =============================================
-- ÍNDICES para performance
-- =============================================
CREATE INDEX idx_itens_categoria ON public.itens_restaurante(categoria_id);
CREATE INDEX idx_itens_status ON public.itens_restaurante(status);
CREATE INDEX idx_itens_localizacao ON public.itens_restaurante(localizacao);
CREATE INDEX idx_movimentacoes_item ON public.movimentacoes_restaurante(item_id);
CREATE INDEX idx_movimentacoes_tipo ON public.movimentacoes_restaurante(tipo);
CREATE INDEX idx_movimentacoes_created ON public.movimentacoes_restaurante(created_at DESC);

-- =============================================
-- STORAGE BUCKET para fotos de itens
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-photos', 'item-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Usuarios podem ver fotos" ON storage.objects
    FOR SELECT USING (bucket_id = 'item-photos');

CREATE POLICY "Usuarios podem fazer upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'item-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios podem deletar suas fotos" ON storage.objects
    FOR DELETE USING (bucket_id = 'item-photos' AND auth.uid() IS NOT NULL);