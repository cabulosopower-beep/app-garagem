import { useEffect, useState, useCallback } from 'react';
import { Plus, Car, Loader2, Wrench, TrendingUp, CalendarDays, Bell, LogOut, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Vehicle, VehicleWithStats, Maintenance, Alert } from '@/types';
import { formatCurrency } from '@/lib/format';
import VehicleCard from '@/components/VehicleCard';
import VehicleFormModal from '@/components/VehicleFormModal';
import VehicleDetail from '@/components/VehicleDetail';
import CalendarView from '@/components/CalendarView';
import SettingsView from '@/components/SettingsView';
import EmptyState from '@/components/EmptyState';
import AuthScreen from '@/components/AuthScreen';
import type { Session } from '@supabase/supabase-js';

type View = { mode: 'list' } | { mode: 'detail'; vehicleId: string };
type Tab = 'garage' | 'calendar' | 'settings';

export default function App() {
  const [vehicles, setVehicles] = useState<VehicleWithStats[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<View>({ mode: 'list' });
  const [tab, setTab] = useState<Tab>('garage');
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(() =>
    window.location.hash.includes('type=recovery'),
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setVehicles([]);
    setAlerts([]);
    setView({ mode: 'list' });
  }

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    const { data: vehs, error: vehErr } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    if (vehErr || !vehs) {
      setLoading(false);
      return;
    }

    const { data: mtns, error: mtnErr } = await supabase
      .from('maintenances')
      .select('*')
      .order('date', { ascending: false });
    if (mtnErr || !mtns) {
      setLoading(false);
      return;
    }

    const withStats: VehicleWithStats[] = (vehs as Vehicle[]).map((v) => {
      const vMtns = (mtns as Maintenance[]).filter((m) => m.vehicle_id === v.id);
      const totalSpent = vMtns.reduce((s, m) => s + (m.cost ?? 0), 0);
      const last = vMtns[0];
      return {
        ...v,
        maintenance_count: vMtns.length,
        total_spent: totalSpent,
        last_service_date: last?.date ?? null,
        last_odometer: last?.odometer ?? null,
      };
    });

    setVehicles(withStats);
    setLoading(false);
  }, []);

  const loadAlerts = useCallback(async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('alert_date', { ascending: true });
    if (!error && data) setAlerts(data as Alert[]);
  }, []);

  useEffect(() => {
    if (session && !isRecoveringPassword) {
      loadVehicles();
      loadAlerts();
    }
  }, [loadVehicles, loadAlerts, session, isRecoveringPassword]);

  async function handleSaveVehicle(
    data: Omit<Vehicle, 'id' | 'created_at'>,
    id?: string,
  ) {
    if (id) {
      const { error } = await supabase.from('vehicles').update(data).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('vehicles').insert(data);
      if (error) throw error;
    }
    await loadVehicles();
  }

  const totalVehicles = vehicles.length;
  const totalSpentAll = vehicles.reduce((s, v) => s + v.total_spent, 0);
  const totalServices = vehicles.reduce((s, v) => s + v.maintenance_count, 0);

  const todayISO = new Date().toISOString().slice(0, 10);
  const pendingAlertCount = alerts.filter(
    (a) => !a.done && a.alert_date <= todayISO,
  ).length;

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-300" size={36} />
      </div>
    );
  }

  if (!session || isRecoveringPassword) {
    return (
      <AuthScreen
        initialMode={isRecoveringPassword ? 'update-password' : 'signin'}
        onPasswordUpdated={() => setIsRecoveringPassword(false)}
      />
    );
  }

  if (view.mode === 'detail') {
    const vehicle = vehicles.find((v) => v.id === view.vehicleId);
    if (vehicle) {
      return (
        <VehicleDetail
          vehicle={vehicle}
          onBack={() => setView({ mode: 'list' })}
          onChanged={loadVehicles}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <Car size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">Garagem</h1>
              <p className="text-xs text-slate-500 mt-0.5">Controle de manutenção</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'garage' && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Novo veículo</span>
              </button>
            )}
            <button
              onClick={handleSignOut}
              title="Sair"
              className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setTab('garage')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'garage'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Car size={16} />
              Veículos
            </button>
            <button
              onClick={() => setTab('calendar')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                tab === 'calendar'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <CalendarDays size={16} />
              Agendamentos
              {pendingAlertCount > 0 && (
                <span className="ml-0.5 px-1.5 min-w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingAlertCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('settings')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'settings'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Settings size={16} />
              Configurações
            </button>
          </div>
        </div>
      </header>

      {tab === 'calendar' ? (
        <CalendarView vehicles={vehicles} />
      ) : tab === 'settings' ? (
        <SettingsView />
      ) : (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {/* Stats summary */}
          {totalVehicles > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Car size={15} />
                  <span className="text-xs font-medium">Veículos</span>
                </div>
                <p className="text-xl font-bold text-slate-800">{totalVehicles}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Wrench size={15} />
                  <span className="text-xs font-medium">Serviços</span>
                </div>
                <p className="text-xl font-bold text-slate-800">{totalServices}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <TrendingUp size={15} />
                  <span className="text-xs font-medium">Total investido</span>
                </div>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalSpentAll)}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-slate-300" size={36} />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 mt-2">
              <EmptyState
                icon={<Car size={28} />}
                title="Sua garagem está vazia"
                description="Adicione seu primeiro veículo para começar a registrar manutenções, acompanhar gastos e guardar os recibos."
                action={
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={18} />
                    Adicionar veículo
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((v) => (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  onClick={() => setView({ mode: 'detail', vehicleId: v.id })}
                />
              ))}
            </div>
          )}
        </main>
      )}

      <VehicleFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSaveVehicle}
      />
    </div>
  );
}