CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: alocacao_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alocacao_enum AS ENUM (
    'DEPOSITO',
    'EVENTO',
    'FUNCIONARIO'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: categoria_item_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.categoria_item_enum AS ENUM (
    'Ferramentas',
    'Materiais',
    'Equipamentos',
    'Consumíveis'
);


--
-- Name: status_item_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.status_item_enum AS ENUM (
    'NOVO',
    'USADO',
    'DANIFICADO',
    'EM_MANUTENCAO'
);


--
-- Name: check_low_stock_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_low_stock_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Check if total quantity is below 5
  IF (COALESCE(NEW.quantidade_novo, 0) + COALESCE(NEW.quantidade_usado, 0)) < 5 THEN
    INSERT INTO public.notifications (user_id, type, title, message, item_id)
    VALUES (
      NEW.user_id,
      'low_stock',
      'Estoque Baixo',
      'O item "' || NEW.nome_item || '" está com estoque baixo (menos de 5 unidades)',
      NEW.id_item
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Check if item is damaged
  IF NEW.quantidade_danificado > 0 AND (OLD IS NULL OR OLD.quantidade_danificado < NEW.quantidade_danificado) THEN
    INSERT INTO public.notifications (user_id, type, title, message, item_id)
    VALUES (
      NEW.user_id,
      'damaged',
      'Item Danificado',
      'O item "' || NEW.nome_item || '" possui ' || NEW.quantidade_danificado || ' unidade(s) danificada(s)',
      NEW.id_item
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_sku(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_sku() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  next_val INTEGER;
BEGIN
  next_val := nextval('sku_sequence');
  RETURN LPAD(next_val::TEXT, 5, '0');
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  
  -- Assign default 'user' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: notify_movement(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_movement() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  item_name TEXT;
BEGIN
  SELECT nome_item INTO item_name FROM public.itens_em_estoque WHERE id_item = NEW.id_item;
  
  IF NEW.tipo_operacao = 'RETIRADA' THEN
    INSERT INTO public.notifications (user_id, type, title, message, item_id)
    VALUES (
      NEW.user_id,
      'movement',
      'Item Retirado',
      'O item "' || COALESCE(item_name, 'Desconhecido') || '" foi retirado para ' || COALESCE(NEW.alocacao_nova::TEXT, 'uso'),
      NEW.id_item
    );
  ELSIF NEW.tipo_operacao = 'DEVOLUCAO' THEN
    INSERT INTO public.notifications (user_id, type, title, message, item_id)
    VALUES (
      NEW.user_id,
      'movement',
      'Item Devolvido',
      'O item "' || COALESCE(item_name, 'Desconhecido') || '" foi devolvido ao depósito',
      NEW.id_item
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: set_sku(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_sku() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.sku IS NULL THEN
    NEW.sku := generate_sku();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_ultima_atualizacao(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ultima_atualizacao() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.ultima_atualizacao = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: alocacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alocacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    descricao text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: categorias_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    descricao text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: historico_movimentacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historico_movimentacoes (
    id bigint NOT NULL,
    id_item bigint,
    user_id uuid NOT NULL,
    tipo_operacao text NOT NULL,
    alocacao_anterior public.alocacao_enum,
    alocacao_nova public.alocacao_enum,
    status_anterior public.status_item_enum,
    status_novo public.status_item_enum,
    quantidade_alterada integer,
    observacoes text,
    data_operacao timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: historico_movimentacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historico_movimentacoes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historico_movimentacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historico_movimentacoes_id_seq OWNED BY public.historico_movimentacoes.id;


--
-- Name: itens_em_estoque; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_em_estoque (
    id_item bigint NOT NULL,
    categoria_item public.categoria_item_enum NOT NULL,
    nome_item text NOT NULL,
    descricao_item text,
    status_item public.status_item_enum DEFAULT 'NOVO'::public.status_item_enum NOT NULL,
    alocacao public.alocacao_enum DEFAULT 'DEPOSITO'::public.alocacao_enum NOT NULL,
    quantidade_novo integer DEFAULT 0 NOT NULL,
    quantidade_usado integer DEFAULT 0 NOT NULL,
    quantidade_danificado integer DEFAULT 0 NOT NULL,
    quantidade_em_manutencao integer DEFAULT 0 NOT NULL,
    quantidade_total integer GENERATED ALWAYS AS ((((quantidade_novo + quantidade_usado) + quantidade_danificado) + quantidade_em_manutencao)) STORED,
    comprimento_cm numeric(10,2),
    largura_cm numeric(10,2),
    profundidade_cm numeric(10,2),
    peso_kg numeric(10,2),
    imagem_item text,
    video_item text,
    data_cadastro timestamp with time zone DEFAULT now() NOT NULL,
    ultima_atualizacao timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL,
    sync_status text DEFAULT 'synced'::text,
    last_sync timestamp with time zone DEFAULT now(),
    offline_operations jsonb DEFAULT '[]'::jsonb,
    sku text
);


--
-- Name: itens_em_estoque_id_item_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.itens_em_estoque_id_item_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itens_em_estoque_id_item_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.itens_em_estoque_id_item_seq OWNED BY public.itens_em_estoque.id_item;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    item_id bigint,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sku_sequence; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sku_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: status_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    descricao text,
    cor text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: historico_movimentacoes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_movimentacoes ALTER COLUMN id SET DEFAULT nextval('public.historico_movimentacoes_id_seq'::regclass);


--
-- Name: itens_em_estoque id_item; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_em_estoque ALTER COLUMN id_item SET DEFAULT nextval('public.itens_em_estoque_id_item_seq'::regclass);


--
-- Name: alocacoes alocacoes_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alocacoes
    ADD CONSTRAINT alocacoes_nome_key UNIQUE (nome);


--
-- Name: alocacoes alocacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alocacoes
    ADD CONSTRAINT alocacoes_pkey PRIMARY KEY (id);


--
-- Name: categorias_item categorias_item_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_item
    ADD CONSTRAINT categorias_item_nome_key UNIQUE (nome);


--
-- Name: categorias_item categorias_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_item
    ADD CONSTRAINT categorias_item_pkey PRIMARY KEY (id);


--
-- Name: historico_movimentacoes historico_movimentacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_movimentacoes
    ADD CONSTRAINT historico_movimentacoes_pkey PRIMARY KEY (id);


--
-- Name: itens_em_estoque itens_em_estoque_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_em_estoque
    ADD CONSTRAINT itens_em_estoque_pkey PRIMARY KEY (id_item);


--
-- Name: itens_em_estoque itens_em_estoque_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_em_estoque
    ADD CONSTRAINT itens_em_estoque_sku_key UNIQUE (sku);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: status_item status_item_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_item
    ADD CONSTRAINT status_item_nome_key UNIQUE (nome);


--
-- Name: status_item status_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_item
    ADD CONSTRAINT status_item_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: itens_em_estoque check_stock_notification_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_stock_notification_trigger AFTER INSERT OR UPDATE ON public.itens_em_estoque FOR EACH ROW EXECUTE FUNCTION public.check_low_stock_notification();


--
-- Name: historico_movimentacoes notify_movement_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_movement_trigger AFTER INSERT ON public.historico_movimentacoes FOR EACH ROW EXECUTE FUNCTION public.notify_movement();


--
-- Name: itens_em_estoque trigger_set_sku; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_sku BEFORE INSERT ON public.itens_em_estoque FOR EACH ROW EXECUTE FUNCTION public.set_sku();


--
-- Name: itens_em_estoque trigger_update_ultima_atualizacao; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_ultima_atualizacao BEFORE UPDATE ON public.itens_em_estoque FOR EACH ROW EXECUTE FUNCTION public.update_ultima_atualizacao();


--
-- Name: historico_movimentacoes historico_movimentacoes_id_item_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_movimentacoes
    ADD CONSTRAINT historico_movimentacoes_id_item_fkey FOREIGN KEY (id_item) REFERENCES public.itens_em_estoque(id_item) ON DELETE CASCADE;


--
-- Name: historico_movimentacoes historico_movimentacoes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_movimentacoes
    ADD CONSTRAINT historico_movimentacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: itens_em_estoque itens_em_estoque_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_em_estoque
    ADD CONSTRAINT itens_em_estoque_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: notifications notifications_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.itens_em_estoque(id_item) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: alocacoes Users can delete their alocacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their alocacoes" ON public.alocacoes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: categorias_item Users can delete their categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their categories" ON public.categorias_item FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: itens_em_estoque Users can delete their own items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own items" ON public.itens_em_estoque FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: status_item Users can delete their status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their status" ON public.status_item FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: alocacoes Users can insert alocacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert alocacoes" ON public.alocacoes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: categorias_item Users can insert categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert categories" ON public.categorias_item FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: status_item Users can insert status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert status" ON public.status_item FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: historico_movimentacoes Users can insert their own history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own history" ON public.historico_movimentacoes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: itens_em_estoque Users can insert their own items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own items" ON public.itens_em_estoque FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: alocacoes Users can update their alocacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their alocacoes" ON public.alocacoes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: categorias_item Users can update their categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their categories" ON public.categorias_item FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: itens_em_estoque Users can update their own items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own items" ON public.itens_em_estoque FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: status_item Users can update their status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their status" ON public.status_item FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: alocacoes Users can view their own alocacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own alocacoes" ON public.alocacoes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: categorias_item Users can view their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own categories" ON public.categorias_item FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: historico_movimentacoes Users can view their own history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own history" ON public.historico_movimentacoes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: itens_em_estoque Users can view their own items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own items" ON public.itens_em_estoque FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: status_item Users can view their own status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own status" ON public.status_item FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: alocacoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alocacoes ENABLE ROW LEVEL SECURITY;

--
-- Name: categorias_item; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categorias_item ENABLE ROW LEVEL SECURITY;

--
-- Name: historico_movimentacoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.historico_movimentacoes ENABLE ROW LEVEL SECURITY;

--
-- Name: itens_em_estoque; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itens_em_estoque ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: status_item; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.status_item ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


