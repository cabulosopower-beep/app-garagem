import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell,
  BellRing,
  Check,
  Pencil,
  Trash2,
  Loader2,
  CalendarDays,
  Car,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Alert, Vehicle } from '@/types';
import { formatMonthYear } from '@/lib/format';
import AlertFormModal from './AlertFormModal';
import EmptyState from './EmptyState';

interface CalendarViewProps {
  vehicles: Vehicle[];
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sameDay(a: string, b: string): boolean {
  return a === b;
}

function isToday(iso: string): boolean {
  return sameDay(iso, toISODate(new Date()));
}

export default function CalendarView({ vehicles }: CalendarViewProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => toISODate(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('alert_date', { ascending: true })
      .order('alert_time', { ascending: true });
    if (!error && data) setAlerts(data as Alert[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Notification checker
  useEffect(() => {
    function checkAlerts() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const now = new Date();
      const todayISO = toISODate(now);
      const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      alerts.forEach((a) => {
        if (!a.notified && !a.done && a.alert_date <= todayISO && a.alert_time <= currentTime) {
          const body = a.description
            ? `${a.description}${a.vehicle_id ? '' : ''}`
            : `Alerta para ${a.alert_date.split('-').reverse().join('/')} às ${a.alert_time}`;
          new Notification(a.title, { body, tag: a.id });
          supabase.from('alerts').update({ notified: true }).eq('id', a.id).then(() => {
            setAlerts((prev) => prev.map((p) => (p.id === a.id ? { ...p, notified: true } : p)));
          });
        }
      });
    }

    checkAlerts();
    const interval = setInterval(checkAlerts, 60000);
    return () => clearInterval(interval);
  }, [alerts]);

  function requestPermission() {
    if ('Notification' in window) {
      Notification.requestPermission().then((p) => setPermission(p));
    }
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [currentMonth]);

  const alertsByDate = useMemo(() => {
    const map: Record<string, Alert[]> = {};
    alerts.forEach((a) => {
      if (!map[a.alert_date]) map[a.alert_date] = [];
      map[a.alert_date].push(a);
    });
    return map;
  }, [alerts]);

  const selectedDayAlerts = alertsByDate[selectedDate] ?? [];

  const upcomingAlerts = useMemo(() => {
    const today = toISODate(new Date());
    return alerts.filter((a) => !a.done && a.alert_date >= today).slice(0, 5);
  }, [alerts]);

  async function handleSaveAlert(
    data: Omit<Alert, 'id' | 'created_at' | 'notified' | 'done'>,
    id?: string,
  ) {
    if (id) {
      const { error } = await supabase.from('alerts').update(data).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('alerts').insert(data);
      if (error) throw error;
    }
    await loadAlerts();
  }

  async function handleDeleteAlert(id: string) {
    const { error } = await supabase.from('alerts').delete().eq('id', id);
    if (!error) await loadAlerts();
  }

  async function toggleDone(alert: Alert) {
    const { error } = await supabase
      .from('alerts')
      .update({ done: !alert.done })
      .eq('id', alert.id);
    if (!error) await loadAlerts();
  }

  function getVehicle(id: string | null): Vehicle | undefined {
    if (!id) return undefined;
    return vehicles.find((v) => v.id === id);
  }

  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Notification permission banner */}
      {permission !== 'granted' && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <BellRing size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800">Ative as notificações</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Permita notificações para receber avisos dos seus alertas no horário marcado.
              </p>
            </div>
          </div>
          <button
            onClick={requestPermission}
            className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors whitespace-nowrap shrink-0"
          >
            Ativar
          </button>
        </div>
      )}

      {/* Upcoming alerts */}
      {upcomingAlerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-1.5">
            <Bell size={15} />
            Próximos alertas
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {upcomingAlerts.map((a) => {
              const v = getVehicle(a.vehicle_id);
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedDate(a.alert_date);
                    setCurrentMonth(new Date(a.alert_date + 'T00:00:00'));
                  }}
                  className="flex flex-col gap-1 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md shadow-slate-200/50 transition-all p-3 min-w-[180px] text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        a.notified ? 'bg-slate-300' : 'bg-blue-500'
                      }`}
                    />
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {a.title}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {a.alert_date.split('-').reverse().join('/')} às {a.alert_time}
                  </span>
                  {v && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Car size={11} />
                      {v.brand} {v.model}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {MONTHS_PT[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(toISODate(now));
                }}
                className="px-3 h-9 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors"
              >
                <CalendarDays size={14} />
                Hoje
              </button>
              <button
                onClick={nextMonth}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-slate-400 py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso = toISODate(day);
              const dayAlerts = alertsByDate[iso] ?? [];
              const hasAlert = dayAlerts.length > 0;
              const hasUnnotified = dayAlerts.some((a) => !a.notified && !a.done);
              const isSelected = sameDay(iso, selectedDate);
              const today = isToday(iso);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(iso)}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : today
                      ? 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? 'text-white' : today ? 'text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {hasAlert && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayAlerts.slice(0, 3).map((a) => (
                        <span
                          key={a.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected
                              ? 'bg-white/70'
                              : a.done
                              ? 'bg-slate-300'
                              : hasUnnotified
                              ? 'bg-blue-500'
                              : 'bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                })}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedDayAlerts.length} {selectedDayAlerts.length === 1 ? 'alerta' : 'alertas'}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingAlert(null);
                setShowForm(true);
              }}
              className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-slate-300" size={28} />
            </div>
          ) : selectedDayAlerts.length === 0 ? (
            <EmptyState
              icon={<Bell size={24} />}
              title="Nenhum alerta"
              description="Crie um alerta para esta data e receba uma notificação no horário marcado."
            />
          ) : (
            <div className="space-y-2.5">
              {selectedDayAlerts.map((a) => {
                const v = getVehicle(a.vehicle_id);
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-3.5 transition-all ${
                      a.done
                        ? 'border-slate-100 bg-slate-50/50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          onClick={() => toggleDone(a)}
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            a.done
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 hover:border-emerald-400'
                          }`}
                        >
                          {a.done && <Check size={12} strokeWidth={3} />}
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-semibold ${
                              a.done ? 'text-slate-400 line-through' : 'text-slate-800'
                            }`}
                          >
                            {a.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Bell size={11} />
                              {a.alert_time}
                            </span>
                            {v && (
                              <span className="flex items-center gap-1">
                                <Car size={11} />
                                {v.brand} {v.model}
                              </span>
                            )}
                            {a.notified && !a.done && (
                              <span className="text-blue-500 font-medium">Notificado</span>
                            )}
                          </div>
                          {a.description && (
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                              {a.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingAlert(a);
                            setShowForm(true);
                          }}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteAlert(a.id)}
                          className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AlertFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSaveAlert}
        vehicles={vehicles}
        alert={editingAlert}
        presetDate={selectedDate}
      />
    </div>
  );
}
