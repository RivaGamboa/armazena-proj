-- Adicionar coluna SKU à tabela itens_em_estoque
ALTER TABLE itens_em_estoque ADD COLUMN sku TEXT UNIQUE;

-- Criar sequência para SKU
CREATE SEQUENCE IF NOT EXISTS sku_sequence START 1;

-- Criar função para gerar SKU formatado
CREATE OR REPLACE FUNCTION generate_sku()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
BEGIN
  next_val := nextval('sku_sequence');
  RETURN LPAD(next_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para gerar SKU automaticamente
CREATE OR REPLACE FUNCTION set_sku()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sku IS NULL THEN
    NEW.sku := generate_sku();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_sku
BEFORE INSERT ON itens_em_estoque
FOR EACH ROW
EXECUTE FUNCTION set_sku();

-- Atualizar itens existentes com SKUs sequenciais
DO $$
DECLARE
  item_record RECORD;
  counter INTEGER := 0;
BEGIN
  FOR item_record IN 
    SELECT id_item FROM itens_em_estoque WHERE sku IS NULL ORDER BY id_item
  LOOP
    counter := counter + 1;
    UPDATE itens_em_estoque 
    SET sku = LPAD(counter::TEXT, 5, '0')
    WHERE id_item = item_record.id_item;
  END LOOP;
  
  -- Ajustar a sequência para começar após os itens existentes
  PERFORM setval('sku_sequence', counter + 1, false);
END $$;