import { useState, useEffect, useCallback } from 'react';
import { Download, Loader2, CalendarClock, AlertCircle, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Vehicle, Maintenance, Alert } from '@/types';

const LAST_BACKUP_KEY = 'garagem-last-backup';

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function monthsSince(iso: string): number {
  const last = new Date(iso + 'T00:00:00');
  const now = new Date();
  return (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth());
}

export default function SettingsView() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_BACKUP_KEY);
    if (stored) setLastBackup(stored);
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const [
        { data: vehicles, error: vErr },
        { data: maintenances, error: mErr },
        { data: alerts, error: aErr },
      ] = await Promise.all([
        supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
        supabase.from('maintenances').select('*').order('date', { ascending: false }),
        supabase.from('alerts').select('*').order('alert_date', { ascending: true }),
      ]);

      if (vErr || mErr || aErr) throw new Error('Erro ao buscar dados.');

      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email ?? 'usuario';

      const backup = {
        exported_at: new Date().toISOString(),
        exported_by: userEmail,
        vehicles: (vehicles ?? []) as Vehicle[],
        maintenances: (maintenances ?? []) as Maintenance[],
        alerts: (alerts ?? []) as Alert[],
        note: 'Este backup contém os dados do banco (veículos, manutenções e alertas). As imagens e recibos não estão incluídos neste arquivo — eles permanecem armazenados com segurança no Supabase Storage.',
      };

      const today = new Date().toISOString().slice(0, 10);
      const fileName = `garagem-backup-${today}.json`;
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      const todayStr = today;
      localStorage.setItem(LAST_BACKUP_KEY, todayStr);
      setLastBackup(todayStr);
    } catch {
      setError('Não foi possível exportar os dados. Tente novamente.');
    } finally {
      setExporting(false);
    }
  }, []);

  const overdue = lastBackup ? monthsSince(lastBackup) >= 1 : true;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Configurações</h2>
      <p className="text-sm text-slate-500 mb-6">Backup, dados e segurança da sua conta.</p>

      {/* Backup e dados */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
            <Database size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Backup e dados</h3>
            <p className="text-xs text-slate-500">Exporte seus dados para um arquivo no seu dispositivo.</p>
          </div>
        </div>

        {/* Last backup info */}
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3.5 mb-4">
          <CalendarClock size={18} className="text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-slate-700">
              {lastBackup
                ? `Último backup: ${formatDateBR(lastBackup)}`
                : 'Você ainda não fez nenhum backup.'}
            </p>
            {overdue && (
              <p className="text-xs text-amber-600 mt-0.5">
                Recomendamos fazer backup pelo menos uma vez por mês.
              </p>
            )}
          </div>
        </div>

        {/* Monthly reminder banner */}
        {overdue && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Hora de fazer backup</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {lastBackup
                  ? 'Já se passou mais de um mês desde o último backup. Exporte seus dados para mantê-los seguros.'
                  : 'Faça seu primeiro backup agora para ter uma cópia dos seus dados no seu dispositivo.'}
              </p>
            </div>
          </div>
        )}

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {exporting ? 'Exportando…' : 'Exportar meus dados'}
        </button>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>
        )}

        {/* Note about images */}
        <div className="mt-4 flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
          <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            O backup inclui todos os seus veículos, manutenções e alertas em formato JSON.
            As fotos e recibos não estão incluídos no arquivo — eles permanecem armazenados
            com segurança no serviço de armazenamento do app.
          </p>
        </div>
      </div>

      {/* Monthly reminder info */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-900 mb-2">Lembrete mensal</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          O app não faz backup automático. Recomendamos que você exporte seus dados pelo menos
          uma vez por mês. Esta página vai mostrar um aviso quando passar mais de um mês
          desde o último backup.
        </p>
      </div>
    </div>
  );
}
