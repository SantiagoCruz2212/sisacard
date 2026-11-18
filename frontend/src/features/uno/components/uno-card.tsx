import { CARD_COLOR_CLASS, symbolOf } from '@/features/uno/models/card-style';
import type { UnoCard as Card } from '@/shared/models/realtime';

interface UnoCardProps {
  card: Card;
  onClick?: () => void;
  /** Resalta la carta como jugable (se eleva). */
  playable?: boolean;
  disabled?: boolean;
  label: string;
}

export function UnoCard({ card, onClick, playable = false, disabled = false, label }: UnoCardProps) {
  const base = `grid h-[84px] w-[58px] shrink-0 place-items-center rounded-lg border-2 border-white/80 text-xl font-bold shadow ${CARD_COLOR_CLASS[card.color]}`;
  if (!onClick) {
    return (
      <div className={base} aria-label={label}>
        {symbolOf(card)}
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`${base} transition-transform ${playable ? '-translate-y-2 cursor-pointer hover:-translate-y-3' : 'opacity-50'}`}
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
