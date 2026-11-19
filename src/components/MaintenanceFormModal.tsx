import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Receipt, Trash2 } from 'lucide-react';
import { Maintenance, MaintenanceCategory, MAINTENANCE_CATEGORIES, Vehicle } from '@/types';
import { uploadImage, UploadError } from '@/lib/upload';
import { useSignedUrl } from '@/lib/useSignedUrl';

interface MaintenanceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    data: Omit<Maintenance, 'id' | 'created_at' | 'vehicle_id'>,
    id?: string,
  ) => Promise<void>;
  vehicle: Vehicle | null;
  maintenance?: Maintenance | null;
}

export default function MaintenanceFormModal({
  open,
  onClose,
  onSave,
  vehicle,
  maintenance,
}: MaintenanceFormModalProps) {
  const [date, setDate] = useState('');
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('oleo');
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { url: previewUrl } = useSignedUrl(receiptPath);

  useEffect(() => {
    if (open) {
      setDate(maintenance?.date ?? new Date().toISOString().slice(0, 10));
      setOdometer(maintenance?.odometer?.toString() ?? '');
      setCost(maintenance?.cost?.toString() ?? '');
      setDescription(maintenance?.description ?? '');
      setCategory(maintenance?.category ?? 'oleo');
      setReceiptPath(maintenance?.receipt_url ?? null);
      setError(null);
    }
  }, [open, maintenance]);

  if (!open || !vehicle) return null;

  async function handleReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const path = await uploadImage(file, 'receipts');
      setReceiptPath(path);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : 'Não foi possível enviar o recibo.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setError('A data é obrigatória.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          date,
          odometer: odometer ? parseInt(odometer) : null,
          cost: cost ? parseFloat(cost) : null,
          description: description.trim() || null,
          category,
          receipt_url: receiptPath,
        },
        maintenance?.id,
      );
      onClose();
    } catch {
      setError('Erro ao registrar manutenção.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-6 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {maintenance ? 'Editar manutenção' : 'Nova manutenção'}
            </h2>
            <p className="text-xs text-slate-500">
              {vehicle.brand} {vehicle.model}
              {vehicle.plate ? ` · ${vehicle.plate}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de serviço</label>
            <div className="flex flex-wrap gap-2">
              {MAINTENANCE_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    category === c.value
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Quilometragem</label>
              <input
                value={odometer}
                onChange={(e) => setOdometer(e.target.value.replace(/\D/g, ''))}
                placeholder="50000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor (R$)</label>
            <input
              value={cost}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.,]/g, '');
                setCost(v);
              }}
              inputMode="decimal"
              placeholder="250,00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Troca de óleo sintético 5W-30 + filtro de óleo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400 resize-none"
            />
          </div>

          {/* Receipt photo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Foto do recibo
            </label>
            {previewUrl ? (
              <div className="relative group rounded-2xl overflow-hidden border border-slate-200">
                <img src={previewUrl} alt="Recibo" className="w-full max-h-64 object-contain bg-slate-50" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReceiptPath(null)}
                    className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur flex items-center justify-center text-red-500 hover:bg-white shadow-sm transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full py-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors flex flex-col items-center justify-center text-slate-400 hover:text-slate-500"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" size={28} />
                ) : (
                  <>
                    <Receipt size={28} />
                    <span className="text-sm mt-2 font-medium">Enviar foto do recibo</span>
                    <span className="text-xs mt-0.5">Toque para tirar ou escolher uma foto</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleReceipt}
            />
            <p className="text-xs text-slate-400 mt-1.5">JPG, PNG, WebP ou GIF, máx. 5 MB</p>
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
              {maintenance ? 'Salvar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
