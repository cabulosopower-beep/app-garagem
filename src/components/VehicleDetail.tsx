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
  ChevronRight,
  X,
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

type DetailNavState = {
  showMtnForm: boolean;
  showVehForm: boolean;
  receiptPath: string | null;
  confirmDelete: boolean;
  viewingMtnId: string | null;
};

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
  const [viewingMtnId, setViewingMtnId] = useState<string | null>(null);
  const [confirmDeleteMtn, setConfirmDeleteMtn] = useState(false);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('maintenance');
  const [mtnSearch, setMtnSearch] = useState('');

  const viewingMtn = useMemo(
    () => maintenances.find((m) => m.id === viewingMtnId) ?? null,
    [maintenances, viewingMtnId],
  );

  const { url: photoUrl } = useSignedUrl(vehicle.photo_url);
  const { url: viewingReceiptUrl } = useSignedUrl(viewingMtn?.receipt_url ?? null);

  useEffect(() => {
    loadMaintenances();
  }, [vehicle.id]);

  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      const d = e.state?.detailNav as DetailNavState | undefined;
      if (d) {
        setShowMtnForm(Boolean(d.showMtnForm));
        setShowVehForm(Boolean(d.showVehForm));
        setReceiptPath(d.receiptPath ?? null);
        setConfirmDelete(Boolean(d.confirmDelete));
        setViewingMtnId(d.viewingMtnId ?? null);
        setConfirmDeleteMtn(false);
      } else {
        setShowMtnForm(false);
        setShowVehForm(false);
        setReceiptPath(null);
        setConfirmDelete(false);
        setViewingMtnId(null);
        setConfirmDeleteMtn(false);
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function pushDetailModal(next: Partial<DetailNavState>) {
    const nextState: DetailNavState = {
      showMtnForm: next.showMtnForm ?? false,
      showVehForm: next.showVehForm ?? false,
      receiptPath: next.receiptPath ?? null,
      confirmDelete: next.confirmDelete ?? false,
      viewingMtnId: next.viewingMtnId ?? null,
    };

    setShowMtnForm(nextState.showMtnForm);
    setShowVehForm(nextState.showVehForm);
    setReceiptPath(nextState.receiptPath);
    setConfirmDelete(nextState.confirmDelete);
    setViewingMtnId(nextState.viewingMtnId);
    setConfirmDeleteMtn(false);

    const currentDepth =
      typeof window.history.state?.depth === 'number' ? window.history.state.depth : 1;

    window.history.pushState(
      {
        ...(window.history.state ?? {}),
        depth: currentDepth + 1,
        detailNav: nextState,
      },
      '',
    );
  }

  function closeDetailModal(fallback: () => void) {
    if (window.history.state?.detailNav) {
      window.history.back();
    } else {
      fallback();
    }
  }

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
        (m.title?.toLowerCase().includes(q) ?? false) ||
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
      closeDetailModal(() => {
        setViewingMtnId(null);
        setConfirmDeleteMtn(false);
      });
    }
  }

  async function handleDeleteVehicle() {
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id);
    if (!error) {
      if (vehicle.photo_url) await deleteStorageFile(vehicle.photo_url);
      onChanged();
      if (window.history.state?.detailNav) {
        window.history.go(-2);
      } else {
        onBack();
      }
    }
  }

  async function handleSaveVehicle(data: Omit<Vehicle, 'id' | 'created_at'>, id?: string) {
    const { error } = await supabase.from('vehicles').update(data).eq('id', id!);
    if (error) throw error;
    onChanged();
    closeDetailModal(() => setShowVehForm(false));
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
              onClick={() => pushDetailModal({ showVehForm: true })}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 text-white flex items-center justify-center transition-colors"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => pushDetailModal({ confirmDelete: true })}
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
                pushDetailModal({ showMtnForm: true });
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
                        pushDetailModal({ showMtnForm: true });
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
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pushDetailModal({ viewingMtnId: m.id })}
                  className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md shadow-slate-200/50 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
                            CATEGORY_STYLES[m.category]
                          }`}
                        >
                          {CATEGORY_LABEL[m.category]}
                        </span>
                        {m.receipt_url && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Receipt size={12} />
                            Recibo
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {m.title || CATEGORY_LABEL[m.category]}
                      </p>

                      {m.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {m.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-xs text-slate-500">
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

                    <ChevronRight size={18} className="text-slate-300 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Maintenance full detail modal */}
      {viewingMtn && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => closeDetailModal(() => setViewingMtnId(null))}
          />
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 rounded-t-3xl z-10">
              <div className="min-w-0">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mb-1.5 ${
                    CATEGORY_STYLES[viewingMtn.category]
                  }`}
                >
                  {CATEGORY_LABEL[viewingMtn.category]}
                </span>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {viewingMtn.title || CATEGORY_LABEL[viewingMtn.category]}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => closeDetailModal(() => setViewingMtnId(null))}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                    <Calendar size={13} />
                    Data
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatDate(viewingMtn.date)}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                    <Gauge size={13} />
                    Quilometragem
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatOdometer(viewingMtn.odometer)}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                    <Banknote size={13} />
                    Valor
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">
                    {viewingMtn.cost != null ? formatCurrency(viewingMtn.cost) : '—'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Descrição
                </p>
                <div className="bg-slate-50 rounded-xl p-3.5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {viewingMtn.description || 'Nenhuma descrição informada.'}
                </div>
              </div>

              {viewingMtn.receipt_url && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    Recibo
                  </p>
                  {viewingReceiptUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        pushDetailModal({
                          viewingMtnId: viewingMtn.id,
                          receiptPath: viewingMtn.receipt_url,
                        })
                      }
                      className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 hover:opacity-95 transition-opacity"
                    >
                      <img
                        src={viewingReceiptUrl}
                        alt="Recibo"
                        className="w-full max-h-60 object-contain"
                      />
                      <span className="block text-xs text-slate-500 py-2 border-t border-slate-100 bg-white">
                        Toque para ampliar
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        pushDetailModal({
                          viewingMtnId: viewingMtn.id,
                          receiptPath: viewingMtn.receipt_url,
                        })
                      }
                      className="w-full py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50"
                    >
                      <Receipt size={16} />
                      Ver recibo
                    </button>
                  )}
                </div>
              )}

              {confirmDeleteMtn ? (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <p className="text-sm font-medium text-red-800 mb-3">
                    Tem certeza que deseja excluir esta manutenção?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteMtn(false)}
                      className="flex-1 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMtn(viewingMtn)}
                      className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600"
                    >
                      Sim, excluir
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteMtn(true)}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMtn(viewingMtn);
                      pushDetailModal({
                        viewingMtnId: viewingMtn.id,
                        showMtnForm: true,
                      });
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Pencil size={16} />
                    Editar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => closeDetailModal(() => setConfirmDelete(false))}
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
                onClick={() => closeDetailModal(() => setConfirmDelete(false))}
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
        onClose={() => closeDetailModal(() => setShowMtnForm(false))}
        onSave={handleSaveMtn}
        vehicle={vehicle}
        maintenance={editingMtn}
      />
      <VehicleFormModal
        open={showVehForm}
        onClose={() => closeDetailModal(() => setShowVehForm(false))}
        onSave={handleSaveVehicle}
        vehicle={vehicle}
      />
      <ReceiptViewer
        path={receiptPath}
        onClose={() => closeDetailModal(() => setReceiptPath(null))}
      />
    </div>
  );
}