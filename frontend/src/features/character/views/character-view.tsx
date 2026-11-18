import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { StylePicker, SwatchPicker } from '@/features/character/components/option-pickers';
import { useCharacterEditor } from '@/features/character/hooks/use-character-editor';
import { CLOTHES_STYLES, EYE_STYLES, HAIR_STYLES, MOUTH_STYLES, PALETTE } from '@/shared/models/avatar';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { LowPolyAvatar } from '@/shared/ui/low-poly-avatar';
import { Page } from '@/shared/ui/page';

export function CharacterView() {
  const { t } = useTranslation();
  const editor = useCharacterEditor();
  const { draft, change } = editor;

  return (
    <Page>
      <Link to="/" className="mb-3 inline-block text-sm text-muted">
        ← {t('common.back')}
      </Link>
      <Card>
        <h2 className="mb-4 text-xl font-semibold">🧑‍🎤 {t('character.title')}</h2>
        {editor.isLoading || !draft ? (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        ) : (
          <div className="grid items-start gap-6 md:grid-cols-[240px_1fr]">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-table p-4">
              <LowPolyAvatar avatar={draft} size={190} label={editor.username} />
              <span className="rounded-full bg-black/60 px-3 py-0.5 text-sm">{editor.username}</span>
            </div>

            <div>
              <StylePicker label={t('character.hair')} options={HAIR_STYLES} value={draft.hair} nameOf={(o) => t(`character.styles.hair.${o}`)} onChange={(v) => change('hair', v)} />
              <SwatchPicker label={t('character.hairColor')} colors={PALETTE.hairColor} value={draft.hairColor} onChange={(v) => change('hairColor', v)} />
              <SwatchPicker label={t('character.skin')} colors={PALETTE.skin} value={draft.skin} onChange={(v) => change('skin', v)} />
              <StylePicker label={t('character.eyes')} options={EYE_STYLES} value={draft.eyes} nameOf={(o) => t(`character.styles.eyes.${o}`)} onChange={(v) => change('eyes', v)} />
              <SwatchPicker label={t('character.eyeColor')} colors={PALETTE.eyeColor} value={draft.eyeColor} onChange={(v) => change('eyeColor', v)} />
              <StylePicker label={t('character.mouth')} options={MOUTH_STYLES} value={draft.mouth} nameOf={(o) => t(`character.styles.mouth.${o}`)} onChange={(v) => change('mouth', v)} />
              <StylePicker label={t('character.clothes')} options={CLOTHES_STYLES} value={draft.clothes} nameOf={(o) => t(`character.styles.clothes.${o}`)} onChange={(v) => change('clothes', v)} />
              <SwatchPicker label={t('character.clothesColor')} colors={PALETTE.clothesColor} value={draft.clothesColor} onChange={(v) => change('clothesColor', v)} />

              <div className="mt-2 flex items-center gap-3">
                <Button variant="primary" disabled={!editor.isDirty || editor.isSaving} onClick={editor.save}>
                  {t('character.save')}
                </Button>
                <Button onClick={editor.randomize}>🎲 {t('character.random')}</Button>
                {editor.justSaved && <span className="text-sm text-good">{t('character.saved')}</span>}
                {editor.error && <span className="text-sm text-bad">{editor.error}</span>}
              </div>
            </div>
          </div>
        )}
      </Card>
    </Page>
  );
}
