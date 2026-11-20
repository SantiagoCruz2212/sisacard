import { useTranslation } from 'react-i18next';
import { CardGuide } from '@/features/uno/components/card-guide';
import { useCurrentRoom, useRealtimeCall } from '@/shared/hooks/use-realtime';
import { useSession } from '@/shared/hooks/use-session';
import type { UnoSettings } from '@/shared/models/realtime';
import { Card } from '@/shared/ui/card';

const DECK_SWITCHES = ['infinity', 'flip'] as const;
const RULES = ['stacking', 'challenge', 'sevenZero', 'jumpIn', 'catchUno'] as const;
type Switch = (typeof DECK_SWITCHES)[number] | (typeof RULES)[number];

/** Nombre de la baraja que resulta de combinar los interruptores. */
const deckKind = (s: UnoSettings) => (s.infinity && s.flip ? 'mega' : s.flip ? 'flip' : s.infinity ? 'infinity' : 'classic');

/** Baraja y reglas de la casa del UNO. Las cambia el anfitrión; el resto las ve. */
export function UnoSettingsPanel() {
  const { t } = useTranslation();
  const room = useCurrentRoom();
  const { user } = useSession();
  const call = useRealtimeCall();
  if (!room || room.game !== 'uno' || room.status !== 'waiting') return null;
  const settings = room.settings as unknown as UnoSettings;
  const isHost = room.hostId === user?.id;
  const update = (patch: Partial<UnoSettings>) => void call('room:settings', { settings: { ...settings, ...patch } });

  const toggle = (key: Switch) => (
    <label key={key} className={`flex gap-2 rounded-lg bg-bg p-2 text-sm ${isHost ? 'cursor-pointer' : ''}`}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-primary"
        checked={settings[key]}
        onChange={(e) => update({ [key]: e.target.checked })}
      />
      <span>
        <b>{t(`uno.settings.${key}`)}</b>
        <span className="block text-xs text-muted">{t(`uno.settings.${key}Desc`)}</span>
      </span>
    </label>
  );

  return (
    <Card>
      <h3 className="mb-2 text-base font-semibold">🃏 {t('uno.settings.title')}</h3>
      {!isHost && <p className="mb-2 text-xs text-muted">{t('uno.settings.hostOnly')}</p>}
      <fieldset disabled={!isHost} className="space-y-3">
        <div>
          <p className="mb-1 text-sm font-semibold">
            {t('uno.settings.deck')}: <span className="text-primary">{t(`uno.settings.summary.${deckKind(settings)}`)}</span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">{DECK_SWITCHES.map(toggle)}</div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">{RULES.map(toggle)}</div>
      </fieldset>
      <CardGuide settings={settings} className="mt-3" />
    </Card>
  );
}
