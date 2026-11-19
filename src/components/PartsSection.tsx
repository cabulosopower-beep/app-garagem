import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Loader2, Package } from 'lucide-react';
import { Part } from '@/types';
import { supabase } from '@/lib/supabase';
import PartFormModal from './PartFormModal';
import EmptyState from './EmptyState';

interface PartsSectionProps {
  vehicleId: string;
}

export default function PartsSection({ vehicleId }: PartsSectionProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  useEffect(() => {
    loadParts();
  }, [vehicleId]);

  async function loadParts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
    if (!error && data) setParts(data as Part[]);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return parts;
    const q = search.toLowerCase();
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code?.toLowerCase().includes(q) ?? false) ||
        (p.brand?.toLowerCase().includes(q) ?? false) ||
        (p.oem_code?.toLowerCase().includes(q) ?? false),
    );
  }, [parts, search]);

  async function handleSave(data: Omit<Part, 'id' | 'vehicle_id' | 'user_id' | 'created_at' | 'updated_at'>, id?: string) {
    if (id) {
      const { error } = await supabase.from('parts').update(data).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('parts').insert({ ...data, vehicle_id: vehicleId });
      if (error) throw error;
    }
    await loadParts();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('parts').delete().eq('id', id);
    if (!error) await loadParts();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800">Peças e códigos</h2>
        <button
          onClick={() => {
            setEditingPart(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, código ou marca…"
          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition-all text-slate-900 placeholder-slate-400 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-slate-300" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100">
          {search.trim() ? (
            <EmptyState
              icon={<Package size={28} />}
              title="Nenhuma peça encontrada"
              description="Tente outro termo de busca."
            />
          ) : (
            <EmptyState
              icon={<Package size={28} />}
              title="Nenhuma peça cadastrada"
              description="Adicione a primeira peça deste veículo com nome, código e marca."
              action={
                <button
                  onClick={() => {
                    setEditingPart(null);
                    setShowForm(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  <Plus size={16} />
                  Adicionar peça
                </button>
              }
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md shadow-slate-200/50 transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                    {p.code && <span>Código: <span className="font-medium text-slate-600">{p.code}</span></span>}
                    {p.brand && <span>Marca: <span className="font-medium text-slate-600">{p.brand}</span></span>}
                    {p.oem_code && <span>OEM: <span className="font-medium text-slate-600">{p.oem_code}</span></span>}
                  </div>
                  {p.note && (
                    <p className="text-xs text-slate-400 mt-1.5">{p.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingPart(p);
                      setShowForm(true);
                    }}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
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

      <PartFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        part={editingPart}
      />
    </div>
  );
}
