import { Button } from '@/shared/ui/button';

interface StylePickerProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  nameOf: (option: T) => string;
  onChange: (option: T) => void;
  /** Opciones de la tienda que aún no se han comprado. */
  isLocked?: (option: T) => boolean;
}

/** Fila de botones para elegir un estilo (pelo, ojos, boca, ropa). */
export function StylePicker<T extends string>({ label, options, value, nameOf, onChange, isLocked }: StylePickerProps<T>) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-sm text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <Button key={o} variant={o === value ? 'primary' : 'secondary'} disabled={isLocked?.(o)} onClick={() => onChange(o)}>
            {isLocked?.(o) ? '🔒 ' : ''}
            {nameOf(o)}
          </Button>
        ))}
      </div>
    </div>
  );
}

interface SwatchPickerProps {
  label: string;
  colors: readonly string[];
  value: number;
  onChange: (index: number) => void;
}

/** Fila de muestras de color. */
export function SwatchPicker({ label, colors, value, onChange }: SwatchPickerProps) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-sm text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, i) => (
          <button
            key={color}
            type="button"
            aria-label={`${label} ${i + 1}`}
            aria-pressed={i === value}
            onClick={() => onChange(i)}
            className={`h-8 w-8 cursor-pointer rounded-full border-2 ${i === value ? 'border-white ring-2 ring-primary' : 'border-line'}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}
