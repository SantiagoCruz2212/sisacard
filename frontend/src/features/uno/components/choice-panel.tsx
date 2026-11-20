import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { targetsFor, type UnoController } from '@/features/uno/hooks/use-uno';
import { cardLabel } from '@/features/uno/models/card-label';
import { colorsOfSide, DIGITS, DOT_COLOR_CLASS } from '@/features/uno/models/card-style';
import type { UnoColor } from '@/shared/models/realtime';
import { Button } from '@/shared/ui/button';

function ColorPicker({ colors, onPick }: { colors: UnoColor[]; onPick: (c: UnoColor) => void }) {
  const { t } = useTranslation();
  return (
    <>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={t(`uno.colors.${c}`)}
          title={t(`uno.colors.${c}`)}
          onClick={() => onPick(c)}
          className={`h-9 w-9 cursor-pointer rounded-full border-2 border-white/70 ${DOT_COLOR_CLASS[c]}`}
        />
      ))}
    </>
  );
}

const Panel = ({ children }: { children: ReactNode }) => (
  <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-line p-3">{children}</div>
);

/** Lo que el jugador tiene que decidir ahora: elecciones de la carta, descartes, color tras voltear, desafío o UNO. */
export function ChoicePanel({ uno }: { uno: UnoController }) {
  const { t } = useTranslation();
  const { view, meId, draft, draftStep } = uno;
  if (!view) return null;
  const colors = colorsOfSide(view.side);
  const me = view.players.find((p) => p.id === meId);

  if (draft && draftStep) {
    return (
      <Panel>
        <span className="text-sm">
          <b>{cardLabel(draft.card, t)}</b> ·{' '}
          {draftStep === 'color' ? t('uno.chooseColor') : draftStep === 'number' ? t('uno.chooseNumber') : t('uno.chooseTarget')}
        </span>
        {draftStep === 'color' && <ColorPicker colors={colors} onPick={uno.chooseColor} />}
        {draftStep === 'number' &&
          DIGITS.map((n) => (
            <Button key={n} className="w-9 px-0 font-bold" onClick={() => uno.chooseNumber(n)}>
              {n}
            </Button>
          ))}
        {draftStep === 'target' &&
          targetsFor(view, meId).map((p) => (
            <Button key={p.id} onClick={() => uno.chooseTarget(p.id)}>
              {p.username} · {t('uno.cards', { count: p.cards })}
            </Button>
          ))}
        <Button variant="ghost" onClick={uno.cancelDraft} aria-label="✕">
          ✕
        </Button>
      </Panel>
    );
  }

  if (view.pending?.kind === 'discard') {
    const picked = uno.discardSel?.length ?? 0;
    return (
      <Panel>
        <span className="text-sm">{t('uno.discardPrompt', { count: view.pending.count })}</span>
        <Button variant="primary" disabled={picked !== view.pending.count} onClick={uno.confirmDiscard}>
          {t('uno.discardConfirm')} ({picked}/{view.pending.count})
        </Button>
      </Panel>
    );
  }

  if (view.pending?.kind === 'color') {
    return (
      <Panel>
        <span className="text-sm">{t('uno.flipColorPrompt')}</span>
        <ColorPicker colors={colors} onPick={uno.flipColor} />
      </Panel>
    );
  }

  if (view.penalty && view.penalty.victimId === meId) {
    return (
      <Panel>
        <span className="text-sm font-semibold">{t('uno.penaltyMine', { count: view.penalty.amount })}</span>
        {view.settings.stacking && <span className="text-xs text-muted">{t('uno.stackHint')}</span>}
        {view.penalty.canChallenge && (
          <>
            <span className="text-xs text-muted">{t('uno.challengeHint', { count: view.penalty.amount + 2 })}</span>
            <Button variant="primary" onClick={uno.challenge}>
              ⚖️ {t('uno.challenge')}
            </Button>
          </>
        )}
      </Panel>
    );
  }

  if (me?.vulnerable) {
    return (
      <Panel>
        <span className="text-sm font-semibold text-bad">{t('uno.vulnerableHint')}</span>
        <Button variant="primary" onClick={uno.declareUno}>
          {t('uno.sayUno')}
        </Button>
      </Panel>
    );
  }

  return null;
}
