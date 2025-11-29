CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

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
    offline_operations jsonb DEFAULT '[]'::jsonb
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
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now()
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
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


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
-- Name: itens_em_estoque Users can delete their own items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own items" ON public.itens_em_estoque FOR DELETE USING ((auth.uid() = user_id));


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
-- Name: itens_em_estoque Users can update items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update items" ON public.itens_em_estoque FOR UPDATE USING (true);


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: historico_movimentacoes Users can view all history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all history" ON public.historico_movimentacoes FOR SELECT USING (true);


--
-- Name: itens_em_estoque Users can view all items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all items" ON public.itens_em_estoque FOR SELECT USING (true);


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: historico_movimentacoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.historico_movimentacoes ENABLE ROW LEVEL SECURITY;

--
-- Name: itens_em_estoque; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itens_em_estoque ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


