
-- Fix UPDATE policy on itens_restaurante: scope to owner
DROP POLICY IF EXISTS "Usuarios podem atualizar itens" ON public.itens_restaurante;
CREATE POLICY "Usuarios podem atualizar itens" ON public.itens_restaurante
  FOR UPDATE TO public USING (auth.uid() = criado_por);

-- Fix SELECT policy on itens_restaurante: scope to owner
DROP POLICY IF EXISTS "Usuarios podem ver itens" ON public.itens_restaurante;
CREATE POLICY "Usuarios podem ver itens" ON public.itens_restaurante
  FOR SELECT TO public USING (auth.uid() = criado_por);

-- Fix SELECT policy on movimentacoes_restaurante: scope to owner
DROP POLICY IF EXISTS "Usuarios podem ver movimentacoes" ON public.movimentacoes_restaurante;
CREATE POLICY "Usuarios podem ver movimentacoes" ON public.movimentacoes_restaurante
  FOR SELECT TO public USING (auth.uid() = usuario_id);
