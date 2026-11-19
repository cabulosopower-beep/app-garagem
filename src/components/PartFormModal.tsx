import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Part } from '@/types';

interface PartFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Part, 'id' | 'vehicle_id' | 'user_id' | 'created_at' | 'updated_at'>, id?: string) => Promise<void>;
  part?: Part | null;
}

export default function PartFormModal({ open, onClose, onSave, part }: PartFormModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [brand, setBrand] = useState('');
  const [oemCode, setOemCode] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(part?.name ?? '');
      setCode(part?.code ?? '');
      setBrand(part?.brand ?? '');
      setOemCode(part?.oem_code ?? '');
      setNote(part?.note ?? '');
      setError(null);
    }
  }, [open, part]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da peça é obrigatório.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          name: name.trim(),
          code: code.trim() || null,
          brand: brand.trim() || null,
          oem_code: oemCode.trim() || null,
          note: note.trim() || null,
        },
        part?.id,
      );
      onClose();
    } catch {
      setError('Erro ao salvar peça.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-6 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl z-10">
          <h2 className="text-lg font-semibold text-slate-900">
            {part ? 'Editar peça' : 'Nova peça'}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da peça *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Filtro de óleo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Código</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PH8A"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Marca</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Fram"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Código OEM/Original</label>
            <input
              value={oemCode}
              onChange={(e) => setOemCode(e.target.value)}
              placeholder="15400-XXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Observação</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Usado na troca de óleo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400 resize-none"
            />
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
              {part ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
