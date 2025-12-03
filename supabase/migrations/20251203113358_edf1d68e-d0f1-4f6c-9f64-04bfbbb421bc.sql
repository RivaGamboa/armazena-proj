-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all history" ON public.historico_movimentacoes;
DROP POLICY IF EXISTS "Users can view all items" ON public.itens_em_estoque;
DROP POLICY IF EXISTS "Users can update items" ON public.itens_em_estoque;

-- Create secure policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Create secure policies for historico_movimentacoes
CREATE POLICY "Users can view their own history" 
ON public.historico_movimentacoes 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create secure policies for itens_em_estoque
CREATE POLICY "Users can view their own items" 
ON public.itens_em_estoque 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" 
ON public.itens_em_estoque 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  item_id BIGINT REFERENCES public.itens_em_estoque(id_item) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to generate notifications for low stock
CREATE OR REPLACE FUNCTION public.check_low_stock_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create trigger for stock notifications
DROP TRIGGER IF EXISTS check_stock_notification_trigger ON public.itens_em_estoque;
CREATE TRIGGER check_stock_notification_trigger
AFTER INSERT OR UPDATE ON public.itens_em_estoque
FOR EACH ROW
EXECUTE FUNCTION public.check_low_stock_notification();

-- Create function to generate notifications for movements
CREATE OR REPLACE FUNCTION public.notify_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create trigger for movement notifications
DROP TRIGGER IF EXISTS notify_movement_trigger ON public.historico_movimentacoes;
CREATE TRIGGER notify_movement_trigger
AFTER INSERT ON public.historico_movimentacoes
FOR EACH ROW
EXECUTE FUNCTION public.notify_movement();