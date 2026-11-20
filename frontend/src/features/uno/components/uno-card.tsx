import { CardArt, CardBackArt } from '@/features/uno/components/card-art';
import type { UnoCardFace } from '@/shared/models/realtime';

const SIZE = {
  md: 'h-[84px] w-[58px]',
  sm: 'h-[42px] w-[29px]',
} as const;

interface UnoCardProps {
  card: UnoCardFace;
  onClick?: () => void;
  /** Resalta la carta como jugable (se eleva). */
  playable?: boolean;
  /** Marcada para descartar. */
  selected?: boolean;
  disabled?: boolean;
  label: string;
  size?: keyof typeof SIZE;
  /** Lado oscuro de UNO Flip: hace falta para los comodines, que no tienen color propio. */
  dark?: boolean;
}

export function UnoCard({ card, onClick, playable = false, selected = false, disabled = false, label, size = 'md', dark }: UnoCardProps) {
  const art = <CardArt face={card} dark={dark} compact={size === 'sm'} className={`block ${SIZE[size]}`} />;
  if (!onClick) {
    return (
      <div className={`shrink-0 rounded-lg shadow ${SIZE[size]}`} role="img" aria-label={label} title={label}>
        {art}
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected || undefined}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 rounded-lg shadow transition-transform ${SIZE[size]} ${
        selected
          ? '-translate-y-3 cursor-pointer ring-4 ring-bad'
          : playable
            ? '-translate-y-2 cursor-pointer hover:-translate-y-3'
            : 'opacity-50'
      }`}
    >
      {art}
    </button>
  );
}

export function CardBack({ label, onClick, disabled }: { label: string; onClick?: () => void; disabled?: boolean }) {
  const art = <CardBackArt className={`block ${SIZE.md}`} />;
  if (!onClick) return <div className={`shrink-0 rounded-lg shadow ${SIZE.md}`}>{art}</div>;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 rounded-lg shadow ${SIZE.md} ${disabled ? 'opacity-50' : 'cursor-pointer hover:brightness-125'}`}
    >
      {art}
    </button>
  );
}
