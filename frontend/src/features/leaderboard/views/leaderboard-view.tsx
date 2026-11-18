import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LEADERBOARD_FILTERS, useLeaderboard } from '@/features/leaderboard/hooks/use-leaderboard';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Page } from '@/shared/ui/page';

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardView() {
  const { t } = useTranslation();
  const { filter, setFilter, entries, isLoading, meId } = useLeaderboard();

  return (
    <Page>
      <Link to="/" className="mb-3 inline-block text-sm text-muted">
        ← {t('common.back')}
      </Link>
      <Card>
        <h2 className="mb-3 text-xl font-semibold">🏆 {t('leaderboard.title')}</h2>
        <div className="mb-3 flex gap-2">
          {LEADERBOARD_FILTERS.map((f) => (
            <Button key={f} variant={filter === f ? 'primary' : 'secondary'} onClick={() => setFilter(f)}>
              {f === 'all' ? t('leaderboard.all') : t(`gameNames.${f}`)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted">{t('leaderboard.empty')}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="w-12 py-1">#</th>
                <th>{t('leaderboard.player')}</th>
                <th className="text-right">{t('leaderboard.played')}</th>
                <th className="text-right">{t('leaderboard.wins')}</th>
                <th className="text-right">{t('leaderboard.points')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.userId} className={`border-t border-line ${e.userId === meId ? 'font-semibold text-good' : ''}`}>
                  <td className="py-1.5">{MEDALS[i] ?? i + 1}</td>
                  <td>{e.username}</td>
                  <td className="text-right">{e.played}</td>
                  <td className="text-right">{e.wins}</td>
                  <td className="text-right text-primary">{e.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-muted">{t('leaderboard.rule')}</p>
      </Card>
    </Page>
  );
}
