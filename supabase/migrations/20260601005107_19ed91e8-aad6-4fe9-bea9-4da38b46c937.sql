DROP POLICY IF EXISTS "Usuarios podem atualizar itens" ON public.itens_restaurante;
CREATE POLICY "Usuarios podem atualizar itens" ON public.itens_restaurante
  FOR UPDATE TO authenticated
  USING (auth.uid() = criado_por)
  WITH CHECK (auth.uid() = criado_por);