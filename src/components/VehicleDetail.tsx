import { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Wrench,
  Calendar,
  Banknote,
  Gauge,
  Receipt,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Package,
} from 'lucide-react';
import { Vehicle, Maintenance, MAINTENANCE_CATEGORIES, MaintenanceCategory } from '@/types';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, formatOdometer } from '@/lib/format';
import { useSignedUrl } from '@/lib/useSignedUrl';
import { deleteStorageFile } from '@/lib/upload';
import MaintenanceFormModal from './MaintenanceFormModal';
import VehicleFormModal from './VehicleFormModal';
import ReceiptViewer from './ReceiptViewer';
import PartsSection from './PartsSection';
import EmptyState from './EmptyState';

interface VehicleDetailProps {
  vehicle: Vehicle;
  onBack: () => void;
  onChanged: () => void;
}

type DetailTab = 'maintenance' | 'parts';

const CATEGORY_STYLES: Record<MaintenanceCategory, string> = {
  oleo: 'bg-amber-100 text-amber-700',
  freio: 'bg-red-100 text-red-700',
  pneu: 'bg-slate-100 text-slate-700',
  revisao: 'bg-blue-100 text-blue-700',
  suspensao: 'bg-purple-100 text-purple-700',
  eletrica: 'bg-yellow-100 text-yellow-700',
  outro: 'bg-gray-100 text-gray-600',
};

const CATEGORY_LABEL: Record<MaintenanceCategory, string> = MAINTENANCE_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.value]: c.label }),
  {} as Record<MaintenanceCategory, string>,
);

export default function VehicleDetail({ vehicle, onBack, onChanged }: VehicleDetailProps) {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMtnForm, setShowMtnForm] = useState(false);
  const [showVehForm, setShowVehForm] = useState(false);
  const [editingMtn, setEditingMtn] = useState<Maintenance | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('maintenance');
  const [mtnSearch, setMtnSearch] = useState('');

  const { url: photoUrl } = useSignedUrl(vehicle.photo_url);

  useEffect(() => {
    loadMaintenances();
  }, [vehicle.id]);

  async function loadMaintenances() {
    setLoading(true);
    const { data, error } = await supabase
      .from('maintenances')
      .select('*')
      .eq('vehicle_id', vehicle.id)
      .order('date', { ascending: false });
    if (!error && data) setMaintenances(data as Maintenance[]);
    setLoading(false);
  }

  const totalSpent = maintenances.reduce((sum, m) => sum + (m.cost ?? 0), 0);
  const lastMtn = maintenances[0];

  const filteredMaintenances = useMemo(() => {
    if (!mtnSearch.trim()) return maintenances;
    const q = mtnSearch.toLowerCase();
    return maintenances.filter(
      (m) =>
        (m.description?.toLowerCase().includes(q) ?? false) ||
        CATEGORY_LABEL[m.category].toLowerCase().includes(q),
    );
  }, [maintenances, mtnSearch]);

  async function handleSaveMtn(data: Omit<Maintenance, 'id' | 'created_at' | 'vehicle_id'>, id?: string) {
    if (id) {
      const { error } = await supabase.from('maintenances').update(data).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('maintenances')
        .insert({ ...data, vehicle_id: vehicle.id });
      if (error) throw error;
    }
    await loadMaintenances();
    onChanged();
  }

  async function handleDeleteMtn(m: Maintenance) {
    const { error } = await supabase.from('maintenances').delete().eq('id', m.id);
    if (!error) {
      if (m.receipt_url) await deleteStorageFile(m.receipt_url);
      await loadMaintenances();
      onChanged();
    }
  }

  async function handleDeleteVehicle() {
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id);
    if (!error) {
      if (vehicle.photo_url) await deleteStorageFile(vehicle.photo_url);
      onChanged();
      onBack();
    }
  }

  async function handleSaveVehicle(data: Omit<Vehicle, 'id' | 'created_at'>, id?: string) {
    const { error } = await supabase.from('vehicles').update(data).eq('id', id!);
    if (error) throw error;
    onChanged();
    setShowVehForm(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="relative h-52 sm:h-64 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        {photoUrl && (
          <img
            src={photoUrl}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-slate-900/20" />

        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 text-white flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowVehForm(true)}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 text-white flex items-center justify-center transition-colors"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur hover:bg-red-500/80 text-white flex items-center justify-center transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <h1 className="text-2xl font-bold">
            {vehicle.brand} {vehicle.model}
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            {[vehicle.year, vehicle.plate, vehicle.color].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-3 gap-3 bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 p-4">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-1.5">
              <Banknote size={18} />
            </div>
            <p className="text-[11px] text-slate-400 leading-none">Total gasto</p>
            <p className="text-sm font-bold text-slate-800 mt-1">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="text-center border-x border-slate-100">
            <div className="w-10 h-10 mx-auto rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-1.5">
              <Gauge size={18} />
            </div>
            <p className="text-[11px] text-slate-400 leading-none">KM atual</p>
            <p className="text-sm font-bold text-slate-800 mt-1">
              {formatOdometer(lastMtn?.odometer ?? null)}
            </p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-1.5">
              <Wrench size={18} />
            </div>
            <p className="text-[11px] text-slate-400 leading-none">Serviços</p>
            <p className="text-sm font-bold text-slate-800 mt-1">{maintenances.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="flex gap-1 border-b border-slate-100">
          <button
            onClick={() => setDetailTab('maintenance')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              detailTab === 'maintenance'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Wrench size={16} />
            Manutenções
          </button>
          <button
            onClick={() => setDetailTab('parts')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              detailTab === 'parts'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Package size={16} />
            Peças e códigos
          </button>
        </div>
      </div>

      {/* Tab content */}
      {detailTab === 'parts' ? (
        <div className="p-4 pt-4">
          <PartsSection vehicleId={vehicle.id} />
        </div>
      ) : (
        <div className="p-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Histórico de manutenções</h2>
            <button
              onClick={() => {
                setEditingMtn(null);
                setShowMtnForm(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              <Plus size={16} />
              Registrar
            </button>
          </div>

          {/* Search */}
          {maintenances.length > 0 && (
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={mtnSearch}
                onChange={(e) => setMtnSearch(e.target.value)}
                placeholder="Buscar manutenção…"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400 text-sm"
              />
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-slate-300" size={32} />
            </div>
          ) : filteredMaintenances.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100">
              {mtnSearch.trim() ? (
                <EmptyState
                  icon={<Wrench size={28} />}
                  title="Nenhuma manutenção encontrada"
                  description="Tente outro termo de busca."
                />
              ) : (
                <EmptyState
                  icon={<Wrench size={28} />}
                  title="Nenhuma manutenção registrada"
                  description="Registre a primeira manutenção deste veículo com data, valor, quilometragem e foto do recibo."
                  action={
                    <button
                      onClick={() => {
                        setEditingMtn(null);
                        setShowMtnForm(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                      <Plus size={16} />
                      Registrar manutenção
                    </button>
                  }
                />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMaintenances.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md shadow-slate-200/50 transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          CATEGORY_STYLES[m.category]
                        }`}
                      >
                        {CATEGORY_LABEL[m.category]}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {m.description || CATEGORY_LABEL[m.category]}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(m.date)}
                          </span>
                          {m.odometer != null && (
                            <span className="flex items-center gap-1">
                              <Gauge size={12} />
                              {formatOdometer(m.odometer)}
                            </span>
                          )}
                          {m.cost != null && (
                            <span className="flex items-center gap-1 font-semibold text-emerald-600">
                              <Banknote size={12} />
                              {formatCurrency(m.cost)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {m.receipt_url && (
                        <button
                          onClick={() => setReceiptPath(m.receipt_url)}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                          title="Ver recibo"
                        >
                          <Receipt size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingMtn(m);
                          setShowMtnForm(true);
                        }}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteMtn(m)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setConfirmDelete(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
              <Trash2 size={22} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Excluir veículo?</h3>
            <p className="text-sm text-slate-500 mt-1">
              Todas as manutenções e peças registradas deste veículo também serão removidas. Esta ação não
              pode ser desfeita.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteVehicle}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <MaintenanceFormModal
        open={showMtnForm}
        onClose={() => setShowMtnForm(false)}
        onSave={handleSaveMtn}
        vehicle={vehicle}
        maintenance={editingMtn}
      />
      <VehicleFormModal
        open={showVehForm}
        onClose={() => setShowVehForm(false)}
        onSave={handleSaveVehicle}
        vehicle={vehicle}
      />
      <ReceiptViewer path={receiptPath} onClose={() => setReceiptPath(null)} />
    </div>
  );
}
