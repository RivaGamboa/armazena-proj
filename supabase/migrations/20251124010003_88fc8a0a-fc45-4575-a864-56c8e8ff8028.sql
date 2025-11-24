-- Atualizar enum de categorias para as categorias solicitadas
ALTER TYPE categoria_item_enum RENAME TO categoria_item_enum_old;

CREATE TYPE categoria_item_enum AS ENUM ('Ferramentas', 'Materiais', 'Equipamentos', 'Consumíveis');

ALTER TABLE itens_em_estoque 
  ALTER COLUMN categoria_item TYPE categoria_item_enum 
  USING 'Ferramentas'::categoria_item_enum;

DROP TYPE categoria_item_enum_old;