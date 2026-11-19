import { useState, useEffect, useRef } from 'react';
import { X, Upload, Loader2, Car } from 'lucide-react';
import { Vehicle } from '@/types';
import { uploadImage, UploadError } from '@/lib/upload';
import { useSignedUrl } from '@/lib/useSignedUrl';

interface VehicleFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Vehicle, 'id' | 'created_at'>, id?: string) => Promise<void>;
  vehicle?: Vehicle | null;
}

const COLORS = [
  { name: 'Preto', value: '#1f2937' },
  { name: 'Branco', value: '#f8fafc' },
  { name: 'Prata', value: '#cbd5e1' },
  { name: 'Cinza', value: '#64748b' },
  { name: 'Vermelho', value: '#dc2626' },
  { name: 'Azul', value: '#2563eb' },
  { name: 'Verde', value: '#16a34a' },
  { name: 'Amarelo', value: '#eab308' },
];

export default function VehicleFormModal({ open, onClose, onSave, vehicle }: VehicleFormModalProps) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { url: previewUrl } = useSignedUrl(photoPath);

  useEffect(() => {
    if (open) {
      setBrand(vehicle?.brand ?? '');
      setModel(vehicle?.model ?? '');
      setYear(vehicle?.year?.toString() ?? '');
      setPlate(vehicle?.plate ?? '');
      setColor(vehicle?.color ?? '');
      setPhotoPath(vehicle?.photo_url ?? null);
      setError(null);
    }
  }, [open, vehicle]);

  if (!open) return null;

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const path = await uploadImage(file, 'vehicles');
      setPhotoPath(path);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : 'Não foi possível enviar a foto.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brand.trim() || !model.trim()) {
      setError('Marca e modelo são obrigatórios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          brand: brand.trim(),
          model: model.trim(),
          year: year ? parseInt(year) : null,
          plate: plate.trim() || null,
          color: color || null,
          photo_url: photoPath,
        },
        vehicle?.id,
      );
      onClose();
    } catch {
      setError('Erro ao salvar veículo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-6 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-lg font-semibold text-slate-900">
            {vehicle ? 'Editar veículo' : 'Novo veículo'}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Photo */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-28 h-28 rounded-2xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors flex items-center justify-center group"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Veículo" className="w-full h-full object-cover" />
              ) : uploading ? (
                <Loader2 className="animate-spin text-slate-400" size={28} />
              ) : (
                <div className="flex flex-col items-center text-slate-400 group-hover:text-slate-500">
                  <Car size={32} />
                  <Upload size={16} className="mt-1" />
                </div>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handlePhoto}
            />
            <p className="text-xs text-slate-400 mt-2">Foto do veículo (opcional, máx. 5 MB)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Marca *</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Toyota"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Modelo *</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Corolla"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ano</label>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="2021"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Placa</label>
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="ABC1D23"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(color === c.name ? '' : c.name)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                    color === c.name
                      ? 'border-slate-800 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-slate-200"
                    style={{ background: c.value }}
                  />
                  <span className="text-xs font-medium text-slate-600">{c.name}</span>
                </button>
              ))}
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
              {vehicle ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
