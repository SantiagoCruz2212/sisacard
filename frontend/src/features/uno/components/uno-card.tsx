import { CARD_COLOR_CLASS, symbolOf } from '@/features/uno/models/card-style';
import type { UnoCardFace } from '@/shared/models/realtime';

const SIZE = {
  md: 'h-[84px] w-[58px] text-xl',
  sm: 'h-[42px] w-[29px] text-[10px] border',
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
}

export function UnoCard({ card, onClick, playable = false, selected = false, disabled = false, label, size = 'md' }: UnoCardProps) {
  const base = `grid shrink-0 place-items-center rounded-lg border-white/80 font-bold shadow ${
    size === 'md' ? 'border-2' : ''
  } ${SIZE[size]} ${CARD_COLOR_CLASS[card.color]}`;
  if (!onClick) {
    return (
      <div className={base} aria-label={label} title={label}>
        {symbolOf(card)}
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
      className={`${base} transition-transform ${
        selected
          ? '-translate-y-3 cursor-pointer ring-4 ring-bad'
          : playable
            ? '-translate-y-2 cursor-pointer hover:-translate-y-3'
            : 'opacity-50'
      }`}
    >
      {symbolOf(card)}
    </button>
  );
}

export function CardBack({ label, onClick, disabled }: { label: string; onClick?: () => void; disabled?: boolean }) {
  const cls =
    'grid h-[84px] w-[58px] place-items-center rounded-lg border-2 border-white/80 bg-bad-soft text-sm font-bold text-bad shadow';
  if (!onClick) return <div className={cls}>UNO</div>;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`${cls} ${disabled ? 'opacity-50' : 'cursor-pointer hover:brightness-125'}`}
    >
      UNO
    </button>
  );
}
