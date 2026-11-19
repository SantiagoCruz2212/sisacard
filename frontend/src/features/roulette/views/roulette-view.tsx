import { useTranslation } from 'react-i18next';
import { useRoulette } from '@/features/roulette/hooks/use-roulette';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { ResultsTable } from '@/shared/ui/results-table';

/** Tambor del revólver: las cámaras ya recorridas se ven apagadas. */
function Cylinder({ chambers, position }: { chambers: number; position: number }) {
  return (
    <svg viewBox="-50 -50 100 100" className="mx-auto h-28 w-28" aria-hidden="true">
      <polygon
        points={Array.from({ length: 12 }, (_, i) => {
          const a = (Math.PI / 6) * i;
          return `${(46 * Math.cos(a)).toFixed(1)},${(46 * Math.sin(a)).toFixed(1)}`;
        }).join(' ')}
        fill="#4b5563"
        stroke="#1f2937"
        strokeWidth="2"
      />
      {Array.from({ length: chambers }, (_, i) => {
        const a = (2 * Math.PI * i) / chambers - Math.PI / 2;
        const cleared = i < position;
        return (
          <polygon
            key={i}
            points={Array.from({ length: 6 }, (_, k) => {
              const b = (Math.PI / 3) * k;
              return `${(30 * Math.cos(a) + 9 * Math.cos(b)).toFixed(1)},${(30 * Math.sin(a) + 9 * Math.sin(b)).toFixed(1)}`;
            }).join(' ')}
            fill={cleared ? '#9ca3af' : '#111827'}
          />
        );
      })}
      <polygon points="-5,-5 5,-5 5,5 -5,5" fill="#1f2937" />
    </svg>
  );
}

/** Pantalla de Ruleta rusa: tambor, turno actual, botones de disparar/girar y registro. */
export function RouletteView() {
  const { t } = useTranslation();
  const r = useRoulette();
  const { view, meId } = r;
  if (!view) return null;

  const winner = view.results?.find((x) => x.place === 1);
  const mine = view.results?.find((x) => x.userId === meId);
  const lines = [...view.log].reverse().map((e) => t(`roulette.log.${e.kind}`, { name: r.nameOf(e.userId) }));

  return (
    <Card>
      <p className="mb-2 text-xs text-muted">{t('roulette.goal', { chambers: view.chambers })}</p>
      <Cylinder chambers={view.chambers} position={view.position} />
      <p className="mb-3 text-center text-sm text-muted">
        {t('roulette.chambers', { position: view.position, chambers: view.chambers })}
      </p>

      <div className="mb-3 flex flex-wrap justify-center gap-2 text-sm">
        {view.players.map((p) => (
          <span
            key={p.id}
            className={`rounded-full border px-3 py-1 ${p.out ? 'border-line text-muted line-through' : p.id === view.turnId ? 'border-primary font-semibold text-primary' : 'border-line'}`}
          >
            {p.out ? '💀 ' : ''}
            {p.username} {p.survived > 0 && !p.out ? t('roulette.survived', { count: p.survived }) : ''}
          </span>
        ))}
      </div>

      {view.phase === 'playing' && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="primary" disabled={!view.canAct} onClick={r.pull}>
            {t('roulette.pull')}
          </Button>
          <Button disabled={!view.canAct} onClick={r.spin}>
            {t('roulette.spin')}
          </Button>
          <span className={`text-sm ${r.isMyTurn ? 'font-semibold text-primary' : 'text-muted'}`}>
            {r.isMyTurn ? t('roulette.yourTurn') : t('roulette.turnOf', { name: r.nameOf(view.turnId) })} · {r.seconds}s
          </span>
        </div>
      )}
      {view.phase === 'between' && <p className="text-center text-sm text-muted">{t('roulette.next', { seconds: r.seconds })}</p>}

      {view.phase === 'ended' && (
        <div className="text-center">
          <h2 className="mb-1 text-xl font-semibold">{t('roulette.ended')}</h2>
          {winner && <p className="text-2xl font-bold text-good">{t('roulette.winner', { name: r.nameOf(winner.userId) })}</p>}
          {mine && mine.place !== 1 && <p className="text-sm text-muted">{t('roulette.youPlace', { place: mine.place })}</p>}
          {view.results && (
            <ResultsTable
              meId={meId}
              rows={[...view.results].sort((a, b) => a.place - b.place).map((x) => ({ ...x, name: r.nameOf(x.userId) }))}
            />
          )}
        </div>
      )}

      {lines.length > 0 && (
        <div className="mt-3 border-t border-line pt-2 text-xs text-muted">
          {lines.map((line, i) => (
            <div key={i} className={i === 0 ? 'text-fg' : ''}>
              {line}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
