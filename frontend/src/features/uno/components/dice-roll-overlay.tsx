import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ROLL_MS, type DiceRoll } from '@/features/uno/hooks/use-dice-rolls';
import { playDiceRoll } from '@/shared/lib/sound-effects';
import { useSoundStore } from '@/shared/lib/sound-store';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * El dado rueda en el centro de la pantalla mostrando números al azar y cae en el resultado,
 * con quién lo lanzó y quién roba. No bloquea los clics. Se monta con `key={roll.id}`.
 */
export function DiceRollOverlay({ roll, nameOf }: { roll: DiceRoll; nameOf: (id: string | null) => string }) {
  const { t } = useTranslation();
  const muted = useSoundStore((s) => s.muted);
  const [landed, setLanded] = useState(prefersReducedMotion);
  const [face, setFace] = useState(() => 1 + Math.floor(Math.random() * roll.sides));

  useEffect(() => {
    if (!muted) playDiceRoll();
    if (landed) return;
    const spin = setInterval(() => setFace(1 + Math.floor(Math.random() * roll.sides)), 80);
    const land = setTimeout(() => setLanded(true), ROLL_MS);
    return () => {
      clearInterval(spin);
      clearTimeout(land);
    };
    // Solo al aparecer: cada tirada monta un componente nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = landed ? roll.roll : face;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
      <div className="dice-overlay rounded-2xl border border-line bg-bg/95 px-8 py-5 text-center shadow-2xl">
        <div className={landed ? 'dice-land' : 'dice-tumble'}>
          <svg viewBox="-30 -30 60 60" className="mx-auto block h-24 w-24" aria-hidden="true">
            <polygon
              points="0,-27 23.4,-13.5 23.4,13.5 0,27 -23.4,13.5 -23.4,-13.5"
              strokeWidth={3}
              strokeLinejoin="round"
              className={landed ? 'fill-card stroke-primary' : 'fill-card stroke-muted'}
            />
            <polygon points="0,-27 23.4,-13.5 0,0 -23.4,-13.5" className="fill-white/5" />
            <text textAnchor="middle" dominantBaseline="central" fontSize={shown > 9 ? 20 : 24} fontWeight={800} className="fill-fg">
              {shown}
            </text>
          </svg>
        </div>
        <div role="status" aria-live="polite" className="mt-2 min-w-48">
          {landed ? (
            <>
              <p className="text-2xl font-bold text-primary">{t('uno.diceRoll.result', { roll: roll.roll })}</p>
              <p className="text-sm">
                {roll.victimId ? t('uno.diceRoll.victim', { name: nameOf(roll.victimId), count: roll.roll }) : null}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">{t('uno.diceRoll.rolling', { name: nameOf(roll.rollerId), sides: roll.sides })}</p>
          )}
        </div>
      </div>
    </div>
  );
}
