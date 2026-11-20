import { useCallback, useEffect, useState } from 'react';
import { TARGETED_VALUES } from '@/features/uno/models/card-style';
import { useCountdown } from '@/shared/hooks/use-countdown';
import { useCurrentRoom, useRealtimeCall } from '@/shared/hooks/use-realtime';
import { useSession } from '@/shared/hooks/use-session';
import { useTurnBell } from '@/shared/hooks/use-turn-bell';
import type { UnoCard, UnoColor, UnoDigit, UnoView } from '@/shared/models/realtime';

/** Una carta a medio jugar: faltan elecciones (color, número, rival) antes de mandarla. */
export interface PlayDraft {
  card: UnoCard;
  color?: UnoColor;
  number?: UnoDigit;
  target?: string;
}

export type DraftStep = 'color' | 'number' | 'target' | null;

/** Qué falta elegir para poder jugar la carta. */
export function nextStep(draft: PlayDraft, view: UnoView, meId: string): DraftStep {
  const { card } = draft;
  if (card.color === 'wild' && card.value !== 'joker' && !draft.color) return 'color';
  if (card.value === 'number' && !draft.number) return 'number';
  const handAfter = view.myHand.length - 1;
  // Cambiar de mano con la última carta no tiene sentido: ya terminaste.
  const swaps = card.value === 'swap' || (card.value === '7' && view.settings.sevenZero);
  const needsTarget = swaps ? handAfter > 0 : TARGETED_VALUES.includes(card.value);
  // Con un solo rival el servidor lo elige solo.
  if (needsTarget && !draft.target && targetsFor(view, meId).length > 1) return 'target';
  return null;
}

/** Rivales que siguen en juego. */
export const targetsFor = (view: UnoView, meId: string) =>
  view.players.filter((p) => p.id !== meId && !p.left && !p.place);

export function useUno() {
  const room = useCurrentRoom();
  const { user } = useSession();
  const call = useRealtimeCall();
  const view = room?.play?.type === 'uno' ? room.play : null;
  const seconds = useCountdown(view?.deadline ?? 0, view?.now ?? 0);
  const revealSeconds = useCountdown(view?.reveal?.until ?? 0, view?.now ?? 0);
  const meId = user?.id ?? '';
  // Suena la campana cuando te toca jugar.
  useTurnBell(Boolean(view && view.phase === 'playing' && view.turnId === meId));

  const [sayUno, setSayUno] = useState(false);
  const [draft, setDraft] = useState<PlayDraft | null>(null);
  const [discardSel, setDiscardSel] = useState<number[]>([]);
  const discarding = view?.pending?.kind === 'discard';

  // Al empezar o terminar un descarte se limpia la selección.
  useEffect(() => setDiscardSel([]), [discarding]);
  // Si la carta del borrador ya no se puede jugar (cambió la mesa), se descarta el borrador.
  useEffect(() => {
    if (draft && view && !view.playable.includes(draft.card.id)) setDraft(null);
  }, [draft, view]);

  const nameOf = useCallback(
    (id: string | null | undefined) => view?.players.find((p) => p.id === id)?.username ?? '?',
    [view],
  );

  const send = useCallback(
    async (payload: object) => {
      const res = await call('game:action', payload);
      if (res.ok) {
        setSayUno(false);
        setDraft(null);
      }
      return res;
    },
    [call],
  );

  /** Completa el borrador: si ya no falta nada, juega la carta. */
  const continueDraft = useCallback(
    (next: PlayDraft) => {
      if (!view) return;
      if (nextStep(next, view, meId)) return setDraft(next);
      const { card, ...choices } = next;
      void send({ type: 'play', cardId: card.id, uno: sayUno, ...choices });
    },
    [view, meId, send, sayUno],
  );

  const selectCard = useCallback(
    (card: UnoCard) => {
      if (discarding) {
        setDiscardSel((sel) => (sel.includes(card.id) ? sel.filter((id) => id !== card.id) : [...sel, card.id]));
        return;
      }
      continueDraft({ card });
    },
    [discarding, continueDraft],
  );

  return {
    view,
    meId,
    seconds,
    revealSeconds,
    nameOf,
    isMyTurn: view?.turnId === meId,
    sayUno,
    toggleUno: () => setSayUno((v) => !v),
    draft,
    draftStep: draft && view ? nextStep(draft, view, meId) : null,
    cancelDraft: () => setDraft(null),
    selectCard,
    chooseColor: (color: UnoColor) => draft && continueDraft({ ...draft, color }),
    chooseNumber: (number: UnoDigit) => draft && continueDraft({ ...draft, number }),
    chooseTarget: (target: string) => draft && continueDraft({ ...draft, target }),
    discardSel: discarding ? discardSel : null,
    confirmDiscard: () => void send({ type: 'discard', cardIds: discardSel, uno: sayUno }),
    flipColor: (color: UnoColor) => void send({ type: 'color', color }),
    challenge: () => void send({ type: 'challenge' }),
    catchPlayer: (target: string) => void send({ type: 'catch', target }),
    declareUno: () => void send({ type: 'uno' }),
    draw: useCallback(() => send({ type: 'draw' }), [send]),
    pass: useCallback(() => send({ type: 'pass' }), [send]),
  };
}

export type UnoController = ReturnType<typeof useUno>;
