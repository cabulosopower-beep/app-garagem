export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  plate: string | null;
  color: string | null;
  photo_url: string | null;
  user_id: string;
  created_at: string;
}

export type MaintenanceCategory =
  | 'oleo'
  | 'freio'
  | 'pneu'
  | 'revisao'
  | 'suspensao'
  | 'eletrica'
  | 'outro';

export const MAINTENANCE_CATEGORIES: { value: MaintenanceCategory; label: string }[] = [
  { value: 'oleo', label: 'Troca de óleo' },
  { value: 'freio', label: 'Freios' },
  { value: 'pneu', label: 'Pneus' },
  { value: 'revisao', label: 'Revisão' },
  { value: 'suspensao', label: 'Suspensão' },
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'outro', label: 'Outro' },
];

export interface Maintenance {
  id: string;
  vehicle_id: string;
  date: string;
  odometer: number | null;
  cost: number | null;
  title: string | null;
  description: string | null;
  category: MaintenanceCategory;
  receipt_url: string | null;
  user_id: string;
  created_at: string;
}

export interface VehicleWithStats extends Vehicle {
  maintenance_count: number;
  total_spent: number;
  last_service_date: string | null;
  last_odometer: number | null;
}

export interface Part {
  id: string;
  vehicle_id: string;
  user_id: string;
  name: string;
  code: string | null;
  brand: string | null;
  oem_code: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string | null;
  alert_date: string;
  alert_time: string;
  vehicle_id: string | null;
  notified: boolean;
  done: boolean;
  user_id: string;
  created_at: string;
}