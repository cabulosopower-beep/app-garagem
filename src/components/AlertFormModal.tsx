import { useState, useEffect } from 'react';
import { X, Loader2, Bell, Car } from 'lucide-react';
import { Alert, Vehicle } from '@/types';

interface AlertFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Alert, 'id' | 'created_at' | 'notified' | 'done'>, id?: string) => Promise<void>;
  vehicles: Vehicle[];
  alert?: Alert | null;
  presetDate?: string | null;
}

export default function AlertFormModal({
  open,
  onClose,
  onSave,
  vehicles,
  alert,
  presetDate,
}: AlertFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [vehicleId, setVehicleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(alert?.title ?? '');
      setDescription(alert?.description ?? '');
      setDate(alert?.alert_date ?? presetDate ?? new Date().toISOString().slice(0, 10));
      setTime(alert?.alert_time ?? '09:00');
      setVehicleId(alert?.vehicle_id ?? '');
      setError(null);
    }
  }, [open, alert, presetDate]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) {
      setError('Título e data são obrigatórios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          title: title.trim(),
          description: description.trim() || null,
          alert_date: date,
          alert_time: time,
          vehicle_id: vehicleId || null,
        },
        alert?.id,
      );
      onClose();
    } catch {
      setError('Erro ao salvar alerta.');
    } finally {
      setSaving(false);
    }
  }

  const previewText = `Notificação para ${date ? formatDateBR(date) : '—'}${
    time ? ` às ${time}` : ''
  }${title ? ` - ${title}` : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-6 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl z-10">
          <h2 className="text-lg font-semibold text-slate-900">
            {alert ? 'Editar alerta' : 'Novo alerta'}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Preview */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
            <Bell size={18} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700 font-medium">{previewText}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Título *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Trocar óleo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Usar óleo 5W-30 sintético, trocar também o filtro"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Data *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Horário</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Veículo (opcional)</label>
            <div className="relative">
              <Car
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 appearance-none bg-white"
              >
                <option value="">Nenhum</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model}
                    {v.plate ? ` · ${v.plate}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {alert ? 'Salvar' : 'Criar alerta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
