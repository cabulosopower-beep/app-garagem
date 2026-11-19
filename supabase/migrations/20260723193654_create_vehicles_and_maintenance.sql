/*
# Veiculos e Manutencoes (single-tenant, no auth)

1. New Tables
- `vehicles`
  - `id` (uuid, primary key)
  - `brand` (text, not null) - marca do veiculo
  - `model` (text, not null) - modelo
  - `year` (int) - ano de fabricacao
  - `plate` (text) - placa
  - `color` (text) - cor
  - `photo_url` (text) - foto do veiculo (storage public URL)
  - `created_at` (timestamptz)
- `maintenances`
  - `id` (uuid, primary key)
  - `vehicle_id` (uuid, foreign key -> vehicles.id ON DELETE CASCADE)
  - `date` (date, not null) - data da manutencao
  - `odometer` (int) - quilometragem
  - `cost` (numeric(10,2)) - valor
  - `description` (text) - descricao do servico
  - `category` (text) - categoria (oleo, freio, pneu, revisao, outro)
  - `receipt_url` (text) - foto do recibo (storage public URL)
  - `created_at` (timestamptz)
2. Storage
- Public bucket `vehicle-photos` for vehicle photos and receipt images.
3. Security
- Enable RLS on both tables.
- Allow anon + authenticated CRUD because the data is intentionally shared/public (no sign-in app).
*/

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  year int,
  plate text,
  color text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_vehicles" ON vehicles;
CREATE POLICY "anon_select_vehicles" ON vehicles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_vehicles" ON vehicles;
CREATE POLICY "anon_insert_vehicles" ON vehicles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_vehicles" ON vehicles;
CREATE POLICY "anon_update_vehicles" ON vehicles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_vehicles" ON vehicles;
CREATE POLICY "anon_delete_vehicles" ON vehicles FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS maintenances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date date NOT NULL,
  odometer int,
  cost numeric(10,2),
  description text,
  category text DEFAULT 'outro',
  receipt_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_maintenances" ON maintenances;
CREATE POLICY "anon_select_maintenances" ON maintenances FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_maintenances" ON maintenances;
CREATE POLICY "anon_insert_maintenances" ON maintenances FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_maintenances" ON maintenances;
CREATE POLICY "anon_update_maintenances" ON maintenances FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_maintenances" ON maintenances;
CREATE POLICY "anon_delete_maintenances" ON maintenances FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_maintenances_vehicle_id ON maintenances(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_date ON maintenances(date);

INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_upload_vehicle_photos" ON storage.objects;
CREATE POLICY "anon_upload_vehicle_photos" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'vehicle-photos');

DROP POLICY IF EXISTS "anon_read_vehicle_photos" ON storage.objects;
CREATE POLICY "anon_read_vehicle_photos" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'vehicle-photos');

DROP POLICY IF EXISTS "anon_delete_vehicle_photos" ON storage.objects;
CREATE POLICY "anon_delete_vehicle_photos" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'vehicle-photos');