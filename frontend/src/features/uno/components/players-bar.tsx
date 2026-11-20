import { useTranslation } from 'react-i18next';
import { UnoCard } from '@/features/uno/components/uno-card';
import { cardLabel } from '@/features/uno/models/card-label';
import type { UnoView } from '@/shared/models/realtime';
import { Button } from '@/shared/ui/button';

interface PlayersBarProps {
  view: UnoView;
  meId: string;
  onCatch: (id: string) => void;
}

export function PlayersBar({ view, meId, onCatch }: PlayersBarProps) {
  const { t } = useTranslation();
  const me = view.players.find((p) => p.id === meId);
  const canCatch = view.settings.catchUno && !!me && !me.left;
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {view.players.map((p) => {
        const isTurn = p.id === view.turnId;
        const state = p.left ? t('uno.left') : p.place ? t('uno.out', { place: p.place }) : t('uno.cards', { count: p.cards });
        return (
          <div
            key={p.id}
            className={`rounded-lg border px-3 py-1.5 text-sm ${isTurn ? 'border-primary bg-primary/20' : 'border-line bg-bg'} ${
              p.left || p.place ? 'opacity-50' : ''
            } ${!p.connected && !p.left ? 'line-through' : ''} ${p.vulnerable ? 'ring-2 ring-bad' : ''}`}
          >
            <b className={p.id === meId ? 'text-good' : ''}>{p.username}</b>
            <div className="text-xs text-muted">{state}</div>
            {p.backs && p.backs.length > 0 && (
              <div className="mt-1 flex max-w-[260px] flex-wrap gap-0.5" aria-label={t('uno.otherSide')} title={t('uno.otherSide')}>
                {p.backs.map((face, i) => (
                  <UnoCard key={i} card={face} dark={view.side === 'light'} label={cardLabel(face, t)} size="sm" />
                ))}
              </div>
            )}
            {p.vulnerable && canCatch && p.id !== meId && (
              <Button variant="primary" className="mt-1 px-2 py-1 text-xs" onClick={() => onCatch(p.id)}>
                🫵 {t('uno.catch')}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
