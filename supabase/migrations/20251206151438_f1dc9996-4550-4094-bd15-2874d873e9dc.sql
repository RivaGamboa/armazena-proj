-- Fix RLS policies to restrict data access to own records only

-- Drop existing permissive SELECT policies
DROP POLICY IF EXISTS "Users can view all alocacoes" ON public.alocacoes;
DROP POLICY IF EXISTS "Users can view all status" ON public.status_item;
DROP POLICY IF EXISTS "Users can view all categories" ON public.categorias_item;

-- Create new restrictive SELECT policies - users can only view their own records
CREATE POLICY "Users can view their own alocacoes" 
ON public.alocacoes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own status" 
ON public.status_item 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own categories" 
ON public.categorias_item 
FOR SELECT 
USING (auth.uid() = user_id);