import { useTranslation } from 'react-i18next';
import { OfficeMap } from '@/features/amongus/components/office-map';
import { useAmongUs } from '@/features/amongus/hooks/use-amongus';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { ResultsTable } from '@/shared/ui/results-table';

/** Pantalla del Among Us lite: plano en tiempo real, acciones, reunión con votación y resultado. */
export function AmongUsView() {
  const { t } = useTranslation();
  const g = useAmongUs();
  const { view, room, meId } = g;
  if (!view || !room) return null;

  const me = view.me;
  const everyone = [...room.players, ...room.spectators];
  const avatarOf = (id: string) => everyone.find((p) => p.id === id)?.avatar;
  const mates = view.players.filter((p) => p.impostor && p.id !== meId).map((p) => p.username);
  const roleText =
    view.role === 'impostor'
      ? t('amongus.roleImpostor', { mates: mates.length ? t('amongus.mates', { names: mates.join(', ') }) : '' })
      : view.role === 'crew'
        ? t('amongus.roleCrew')
        : t('amongus.roleSpectator');
  const percent = view.tasksTotal ? Math.round((view.tasksDone / view.tasksTotal) * 100) : 0;
  const alivePlayers = view.players.filter((p) => p.alive);

  return (
    <Card>
      <p className={`mb-2 text-sm font-semibold ${view.role === 'impostor' ? 'text-bad' : ''}`}>{roleText}</p>
      <div className="mb-3">
        <div className="mb-1 text-xs text-muted">{t('amongus.tasks', { done: view.tasksDone, total: view.tasksTotal })}</div>
        <div className="h-2 overflow-hidden rounded bg-line">
          <div className="h-full bg-good transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {view.phase === 'playing' && (
        <>
          {me && !me.alive && <p className="mb-2 text-sm text-muted">{t('amongus.ghost')}</p>}
          <OfficeMap view={view} meId={meId} avatarOf={avatarOf} />
          <p className="mt-2 text-xs text-muted">{t('amongus.controls')}</p>
          {me && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {me.role === 'crew' && (
                <Button variant={me.canTask ? 'primary' : undefined} onClick={() => void g.task()}>
                  {t('amongus.task')}
                </Button>
              )}
              {me.role === 'impostor' && me.alive && (
                <Button variant={me.canKill ? 'primary' : undefined} disabled={g.killSeconds > 0} onClick={() => void g.kill()}>
                  {g.killSeconds > 0 ? t('amongus.killIn', { seconds: g.killSeconds }) : t('amongus.kill')}
                </Button>
              )}
              {me.alive && (
                <Button variant={me.canReport ? 'primary' : undefined} onClick={() => void g.report()}>
                  {t('amongus.report')}
                </Button>
              )}
              {me.working !== null && <span className="text-sm text-primary">{t('amongus.working')}</span>}
            </div>
          )}
          {me && me.role === 'crew' && (
            <div className="mt-3 text-sm">
              <b>{t('amongus.myTasks')}</b>
              <ul className="mt-1 flex flex-wrap gap-2">
                {me.tasks.map((task) => (
                  <li key={task.id} className={`rounded-full border px-3 py-0.5 ${task.done ? 'border-good text-good line-through' : 'border-line'}`}>
                    {t(`amongus.rooms.${task.id}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {view.phase === 'meeting' && (
        <div>
          <h3 className="mb-1 text-lg font-semibold">
            {t('amongus.meetingTitle')} · {g.seconds}s
          </h3>
          <p className="mb-3 text-sm text-muted">{t('amongus.meetingHint')}</p>
          <ul className="mb-3 grid gap-2 sm:grid-cols-2">
            {alivePlayers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                <span>
                  {p.username} {p.voted && <span className="text-xs text-muted">✔ {t('amongus.voted')}</span>}
                </span>
                {me?.alive && view.myVote === undefined && (
                  <Button onClick={() => void g.vote(p.id)} disabled={p.id === meId}>
                    🗳️
                  </Button>
                )}
                {view.myVote === p.id && <span className="text-primary">🗳️</span>}
              </li>
            ))}
          </ul>
          {me?.alive && view.myVote === undefined && <Button onClick={() => void g.vote(null)}>{t('amongus.skip')}</Button>}
          {me?.alive && view.myVote !== undefined && <p className="text-sm text-muted">{t('amongus.youVoted')}</p>}
          {me && !me.alive && <p className="text-sm text-muted">{t('amongus.ghostNoVote')}</p>}
        </div>
      )}

      {view.phase === 'result' && view.meeting && (
        <div className="text-center">
          <h3 className="mb-1 text-lg font-semibold">{t('amongus.resultTitle')}</h3>
          {view.meeting.ejected ? (
            <>
              <p className="text-xl font-bold">{t('amongus.ejected', { name: g.nameOf(view.meeting.ejected) })}</p>
              <p className="text-sm text-muted">{view.meeting.wasImpostor ? t('amongus.wasImpostor') : t('amongus.wasCrew')}</p>
            </>
          ) : (
            <p className="text-xl font-bold">{t('amongus.noOne')}</p>
          )}
        </div>
      )}

      {view.phase === 'ended' && (
        <div className="text-center">
          <h2 className="mb-1 text-xl font-semibold">{t('amongus.ended')}</h2>
          <p className="text-2xl font-bold text-good">{view.winner === 'crew' ? t('amongus.crewWins') : t('amongus.impostorWins')}</p>
          <p className="text-sm text-muted">
            {t('amongus.impostors', { names: view.players.filter((p) => p.impostor).map((p) => p.username).join(', ') })}
          </p>
          {view.results && (
            <ResultsTable
              meId={meId}
              rows={[...view.results].sort((a, b) => a.place - b.place).map((r) => ({ ...r, name: g.nameOf(r.userId) }))}
            />
          )}
        </div>
      )}
    </Card>
  );
}
