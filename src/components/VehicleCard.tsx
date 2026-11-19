import { Car, Wrench, Calendar, Banknote } from 'lucide-react';
import { VehicleWithStats } from '@/types';
import { formatCurrency, formatDate, formatOdometer } from '@/lib/format';
import { useSignedUrl } from '@/lib/useSignedUrl';

interface VehicleCardProps {
  vehicle: VehicleWithStats;
  onClick: () => void;
}

export default function VehicleCard({ vehicle, onClick }: VehicleCardProps) {
  const { url: photoUrl } = useSignedUrl(vehicle.photo_url);

  return (
    <button
      onClick={onClick}
      className="group text-left w-full bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg shadow-slate-200/50 transition-all duration-200 overflow-hidden"
    >
      <div className="relative h-36 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Car size={56} strokeWidth={1.2} />
          </div>
        )}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-xs font-semibold text-slate-700 shadow-sm">
          {vehicle.maintenance_count} {vehicle.maintenance_count === 1 ? 'registro' : 'registros'}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">
              {vehicle.brand} {vehicle.model}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {[vehicle.year, vehicle.plate, vehicle.color].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Banknote size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400 leading-none">Total gasto</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {formatCurrency(vehicle.total_spent)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Calendar size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400 leading-none">Última revisão</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                {formatDate(vehicle.last_service_date)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
