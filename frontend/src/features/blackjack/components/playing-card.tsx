import type { BjCard } from '@/shared/models/realtime';

const isRed = (card: BjCard) => card.suit === '♥' || card.suit === '♦';

/** Carta de póker: rango arriba a la izquierda, palo grande en el centro. */
export function PlayingCard({ card }: { card: BjCard }) {
  return (
    <div
      role="img"
      aria-label={`${card.rank} ${card.suit}`}
      className={`flex h-[62px] w-[44px] shrink-0 flex-col justify-between rounded-md border border-black/20 bg-paper px-1 py-0.5 text-sm font-bold shadow ${
        isRed(card) ? 'text-suit-red' : 'text-black'
      }`}
    >
      <span className="leading-none">{card.rank}</span>
      <span className="text-center text-xl leading-none">{card.suit}</span>
      <span className="rotate-180 leading-none">{card.rank}</span>
    </div>
  );
}
