/*
# Criar tabela parts (Peças e códigos)

## Objetivo
Adicionar uma tabela para armazenar peças vinculadas a cada veículo do usuário.
Cada peça pertence a um usuário e a um veículo específicos.

## Nova Tabela: parts
- id (uuid, primary key)
- vehicle_id (uuid, foreign key -> vehicles, ON DELETE CASCADE)
- user_id (uuid, foreign key -> auth.users, DEFAULT auth.uid())
- name (text, not null) — Nome da peça
- code (text, nullable) — Código da peça
- brand (text, nullable) — Marca
- oem_code (text, nullable) — Código OEM/Original
- note (text, nullable) — Observação
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

## Segurança
- RLS habilitado.
- 4 políticas (SELECT/INSERT/UPDATE/DELETE) restritas a authenticated,
  verificando auth.uid() = user_id — mesmo padrão das tabelas existentes.

## Notas
- Nenhuma tabela existente é alterada.
- Nenhum dado existente é modificado.
- ON DELETE CASCADE em vehicle_id garante que peças de um veículo
  sejam removidas automaticamente quando o veículo é excluído.
*/

CREATE TABLE IF NOT EXISTS parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  brand text,
  oem_code text,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_parts" ON parts;
CREATE POLICY "select_own_parts" ON parts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_parts" ON parts;
CREATE POLICY "insert_own_parts" ON parts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_parts" ON parts;
CREATE POLICY "update_own_parts" ON parts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_parts" ON parts;
CREATE POLICY "delete_own_parts" ON parts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
