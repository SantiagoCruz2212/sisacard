import { useTranslation } from 'react-i18next';
import { CardArt } from '@/features/uno/components/card-art';
import { cardHelp, guideSections } from '@/features/uno/models/card-help';
import { cardLabel } from '@/features/uno/models/card-label';
import type { UnoSettings } from '@/shared/models/realtime';

/** Lista plegable con todas las cartas de la baraja de la sala y qué hace cada una. */
export function CardGuide({ settings, className = '' }: { settings: UnoSettings; className?: string }) {
  const { t } = useTranslation();
  return (
    <details className={`group rounded-lg border border-line ${className}`}>
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold select-none hover:bg-line/40">{t('uno.guide.title')}</summary>
      <div className="space-y-4 px-3 pt-1 pb-3">
        {guideSections(settings, t).map((section) => (
          <section key={section.title}>
            <h4 className="mb-2 text-xs font-semibold text-muted">{section.title}</h4>
            <ul className="grid gap-2 sm:grid-cols-2">
              {section.entries.map(({ face, name, dark }) => (
                <li key={`${face.color}-${face.value}`} className="flex items-start gap-2.5 rounded-lg bg-bg p-2">
                  <CardArt face={face} dark={dark} compact className="block h-[50px] w-[35px] shrink-0" />
                  <span className="text-xs leading-snug">
                    <b className="block text-sm capitalize">{name ?? cardLabel(face, t)}</b>
                    <span className="text-muted">{cardHelp(face, settings, t)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
