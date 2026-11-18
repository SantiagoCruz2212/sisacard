import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useProfileStats } from '@/features/profile/hooks/use-profile-stats';
import { Card } from '@/shared/ui/card';
import { Page } from '@/shared/ui/page';

const Stat = ({ value, label }: { value: ReactNode; label: string }) => (
  <div className="flex flex-col rounded-[10px] bg-bg p-3">
    <b className="text-[26px]">{value}</b>
    <span className="text-[13px] text-muted">{label}</span>
  </div>
);

const Grid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">{children}</div>
);

export function ProfileView() {
  const { t } = useTranslation();
  const { user, isLoading, totalPoints, impostor, uno, blackjack } = useProfileStats();

  return (
    <Page>
      <Link to="/" className="mb-3 inline-block text-sm text-muted">
        ← {t('common.back')}
      </Link>
      <Card>
        <h2 className="mb-3 text-xl font-semibold">👤 {user?.username}</h2>
        {isLoading ? (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        ) : (
          <>
            <Grid>
              <Stat value={totalPoints} label={t('profile.totalPoints')} />
            </Grid>

            <h3 className="mt-4 mb-2 text-base font-semibold">🕵️ {t('profile.title')}</h3>
            {impostor.hasPlayed ? (
              <Grid>
                <Stat value={impostor.played} label={t('profile.games')} />
                <Stat value={impostor.wins} label={t('profile.wins', { pct: impostor.winRate })} />
                <Stat value={impostor.points} label={t('profile.points')} />
                <Stat value={impostor.asImpostor} label={t('profile.asImpostor', { pct: impostor.asImpostorRate })} />
                <Stat value={impostor.asCrew} label={t('profile.asCrew', { pct: impostor.asCrewRate })} />
              </Grid>
            ) : (
              <p className="text-sm text-muted">{t('profile.noGames')}</p>
            )}

            <h3 className="mt-4 mb-2 text-base font-semibold">🃏 {t('profile.unoTitle')}</h3>
            {uno.hasPlayed ? (
              <Grid>
                <Stat value={uno.played} label={t('profile.games')} />
                <Stat value={uno.wins} label={t('profile.wins', { pct: uno.winRate })} />
                <Stat value={uno.points} label={t('profile.points')} />
              </Grid>
            ) : (
              <p className="text-sm text-muted">{t('profile.unoNoGames')}</p>
            )}

            <h3 className="mt-4 mb-2 text-base font-semibold">♠️ {t('profile.blackjackTitle')}</h3>
            {blackjack.hasPlayed ? (
              <Grid>
                <Stat value={blackjack.played} label={t('profile.games')} />
                <Stat value={blackjack.wins} label={t('profile.wins', { pct: blackjack.winRate })} />
                <Stat value={blackjack.points} label={t('profile.points')} />
              </Grid>
            ) : (
              <p className="text-sm text-muted">{t('profile.noBlackjack')}</p>
            )}
          </>
        )}
      </Card>
    </Page>
  );
}
