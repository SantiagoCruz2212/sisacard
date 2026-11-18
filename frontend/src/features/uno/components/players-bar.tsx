import { useTranslation } from 'react-i18next';
import type { UnoView } from '@/shared/models/realtime';

export function PlayersBar({ view, meId }: { view: UnoView; meId: string }) {
  const { t } = useTranslation();
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
            } ${!p.connected && !p.left ? 'line-through' : ''}`}
          >
            <b className={p.id === meId ? 'text-good' : ''}>{p.username}</b>
            <div className="text-xs text-muted">{state}</div>
          </div>
        );
      })}
    </div>
  );
}
