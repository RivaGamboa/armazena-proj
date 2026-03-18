
-- Create table for access invites/tokens
CREATE TABLE public.convites_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  nome_convidado text,
  nivel_acesso text NOT NULL DEFAULT 'visitante' CHECK (nivel_acesso IN ('visitante', 'editor')),
  expira_em timestamp with time zone NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.convites_acesso ENABLE ROW LEVEL SECURITY;

-- Owner can manage their invites
CREATE POLICY "Users can view their own invites"
  ON public.convites_acesso FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert invites"
  ON public.convites_acesso FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their invites"
  ON public.convites_acesso FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their invites"
  ON public.convites_acesso FOR DELETE
  USING (auth.uid() = user_id);

-- Allow anonymous read for token validation (guest access)
CREATE POLICY "Anyone can validate tokens"
  ON public.convites_acesso FOR SELECT
  USING (ativo = true AND expira_em > now());
