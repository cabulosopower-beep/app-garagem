/*
# Add user ownership and switch to authenticated-only RLS

## Purpose
Convert the app from single-tenant (anon-shared) to multi-user (each authenticated
user sees only their own vehicles, maintenances, and alerts).

## Changes
1. New columns
   - `vehicles.user_id` (uuid, default auth.uid(), references auth.users)
   - `maintenances.user_id` (uuid, default auth.uid(), references auth.users)
   - `alerts.user_id` (uuid, default auth.uid(), references auth.users)
   All are nullable so the 1 pre-existing vehicle row is preserved (it simply
   becomes invisible to any authenticated user, since NULL never matches auth.uid()).

2. Security (RLS)
   - Drop the old anon-accessible policies on all three tables.
   - Add 4 owner-scoped policies (SELECT/INSERT/UPDATE/DELETE) per table, scoped
     TO authenticated, using auth.uid() = user_id.
   - INSERT policies use WITH CHECK (auth.uid() = user_id) so the DEFAULT auth.uid()
     fills the owner even when the client omits user_id from the insert payload.

## Notes
- Email confirmation stays OFF (default).
- Existing anon-created data is not deleted; it is simply unreachable under the
  new authenticated-only policies.
*/

-- vehicles: add user_id
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- maintenances: add user_id
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- alerts: add user_id
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- ========== vehicles policies ==========
DROP POLICY IF EXISTS "anon_select_vehicles" ON vehicles;
DROP POLICY IF EXISTS "anon_insert_vehicles" ON vehicles;
DROP POLICY IF EXISTS "anon_update_vehicles" ON vehicles;
DROP POLICY IF EXISTS "anon_delete_vehicles" ON vehicles;
DROP POLICY IF EXISTS "select_own_vehicles" ON vehicles;
DROP POLICY IF EXISTS "insert_own_vehicles" ON vehicles;
DROP POLICY IF EXISTS "update_own_vehicles" ON vehicles;
DROP POLICY IF EXISTS "delete_own_vehicles" ON vehicles;

CREATE POLICY "select_own_vehicles" ON vehicles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_vehicles" ON vehicles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_vehicles" ON vehicles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_vehicles" ON vehicles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ========== maintenances policies ==========
DROP POLICY IF EXISTS "anon_select_maintenances" ON maintenances;
DROP POLICY IF EXISTS "anon_insert_maintenances" ON maintenances;
DROP POLICY IF EXISTS "anon_update_maintenances" ON maintenances;
DROP POLICY IF EXISTS "anon_delete_maintenances" ON maintenances;
DROP POLICY IF EXISTS "select_own_maintenances" ON maintenances;
DROP POLICY IF EXISTS "insert_own_maintenances" ON maintenances;
DROP POLICY IF EXISTS "update_own_maintenances" ON maintenances;
DROP POLICY IF EXISTS "delete_own_maintenances" ON maintenances;

CREATE POLICY "select_own_maintenances" ON maintenances FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_maintenances" ON maintenances FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_maintenances" ON maintenances FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_maintenances" ON maintenances FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ========== alerts policies ==========
DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
DROP POLICY IF EXISTS "select_own_alerts" ON alerts;
DROP POLICY IF EXISTS "insert_own_alerts" ON alerts;
DROP POLICY IF EXISTS "update_own_alerts" ON alerts;
DROP POLICY IF EXISTS "delete_own_alerts" ON alerts;

CREATE POLICY "select_own_alerts" ON alerts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_alerts" ON alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_alerts" ON alerts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_alerts" ON alerts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
