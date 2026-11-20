import { useId, type ReactNode } from 'react';
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
  /** Qué hace la carta: se muestra en una burbuja al pasar el mouse o enfocarla. */
  help?: string;
}

/** Burbuja con el nombre y el efecto de la carta, encima de ella. */
function WithTooltip({ id, label, help, children }: { id: string; label: string; help?: string; children: ReactNode }) {
  if (!help) return <>{children}</>;
  return (
    <span className="group relative inline-flex shrink-0">
      {children}
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-3 w-52 -translate-x-1/2 rounded-lg border border-line bg-bg px-2.5 py-2 text-left text-xs leading-snug text-fg opacity-0 shadow-lg transition-opacity delay-150 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <b className="mb-0.5 block text-sm capitalize">{label}</b>
        {help}
      </span>
    </span>
  );
}

export function UnoCard({ card, onClick, playable = false, selected = false, disabled = false, label, size = 'md', dark, help }: UnoCardProps) {
  const tipId = useId();
  const art = <CardArt face={card} dark={dark} compact={size === 'sm'} className={`block ${SIZE[size]}`} />;
  // Con burbuja propia no hace falta el title nativo (saldrían dos).
  const title = help ? undefined : label;
  const describedBy = help ? tipId : undefined;
  if (!onClick) {
    return (
      <WithTooltip id={tipId} label={label} help={help}>
        <div
          className={`shrink-0 rounded-lg shadow ${SIZE[size]}`}
          role="img"
          aria-label={label}
          aria-describedby={describedBy}
          title={title}
          tabIndex={help ? 0 : undefined}
        >
          {art}
        </div>
      </WithTooltip>
    );
  }
  return (
    <WithTooltip id={tipId} label={label} help={help}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={describedBy}
        aria-pressed={selected || undefined}
        title={title}
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
    </WithTooltip>
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
