import { useTranslation } from 'react-i18next';
import { VEHICLES, type Vehicle } from '@/shared/models/avatar';
import { LowPolyAvatar } from '@/shared/ui/low-poly-avatar';

interface VehiclePickerProps {
  value: Vehicle;
  onChange: (vehicle: Vehicle) => void;
}

/** Quien elige "no binario" solo elige entre estos dos vehículos. */
export function VehiclePicker({ value, onChange }: VehiclePickerProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      <p className="mb-1 text-sm text-muted">{t('character.vehicle')}</p>
      <p className="mb-3 text-xs text-muted">{t('character.nonbinaryNote')}</p>
      <div className="flex flex-wrap gap-3">
        {VEHICLES.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={v === value}
            onClick={() => onChange(v)}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 bg-table p-3 ${
              v === value ? 'border-primary ring-2 ring-primary/40' : 'border-line'
            }`}
          >
            <LowPolyAvatar avatar={{ sex: 'nonbinary', vehicle: v }} size={110} label={t(`character.styles.vehicle.${v}`)} />
            <span className="text-sm">{t(`character.styles.vehicle.${v}`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
