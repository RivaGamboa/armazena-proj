-- Corrigir search_path das funções para segurança

CREATE OR REPLACE FUNCTION generate_sku()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  next_val := nextval('sku_sequence');
  RETURN LPAD(next_val::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION set_sku()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sku IS NULL THEN
    NEW.sku := generate_sku();
  END IF;
  RETURN NEW;
END;
$$;