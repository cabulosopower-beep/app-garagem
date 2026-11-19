/*
# Tabela de alertas (single-tenant, no auth)

1. New Tables
- `alerts`
  - `id` (uuid, primary key)
  - `title` (text, not null) - titulo curto do alerta
  - `description` (text) - descricao detalhada
  - `alert_date` (date, not null) - data do alerta
  - `alert_time` (time, default 09:00) - horario do alerta
  - `vehicle_id` (uuid, nullable, FK -> vehicles.id ON DELETE SET NULL) - veiculo relacionado (opcional)
  - `notified` (boolean, default false) - se ja foi notificado
  - `done` (boolean, default false) - se foi concluido
  - `created_at` (timestamptz)
2. Security
- Enable RLS on `alerts`.
- Allow anon + authenticated CRUD (single-tenant, no sign-in).
*/

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  alert_date date NOT NULL,
  alert_time time DEFAULT '09:00',
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  notified boolean NOT NULL DEFAULT false,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_alerts_date ON alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_alerts_notified ON alerts(notified);