-- Fix function search_path security issue
CREATE OR REPLACE FUNCTION public.update_ultima_atualizacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.ultima_atualizacao = now();
  RETURN NEW;
END;
$function$;