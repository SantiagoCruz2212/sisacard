import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { StylePicker, SwatchPicker } from '@/features/character/components/option-pickers';
import { VehiclePicker } from '@/features/character/components/vehicle-picker';
import { useCharacterEditor } from '@/features/character/hooks/use-character-editor';
import {
  ACCESSORY_STYLES,
  BEARD_STYLES,
  CLOTHES_STYLES,
  EYE_STYLES,
  GLASSES_STYLES,
  HAIR_STYLES,
  HAT_PALETTE,
  HAT_STYLES,
  MOUTH_STYLES,
  PET_STYLES,
  PALETTE,
  SEXES,
} from '@/shared/models/avatar';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { LowPolyAvatar } from '@/shared/ui/low-poly-avatar';
import { Page } from '@/shared/ui/page';

export function CharacterView() {
  const { t } = useTranslation();
  const editor = useCharacterEditor();
  const { draft, human, change } = editor;

  return (
    <Page>
      <Link to="/" className="mb-3 inline-block text-sm text-muted">
        ← {t('common.back')}
      </Link>
      <Card>
        <h2 className="mb-4 text-xl font-semibold">🧑‍🎤 {t('character.title')}</h2>
        {editor.isLoading || !draft || !editor.sex ? (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        ) : (
          <div className="grid items-start gap-6 md:grid-cols-[240px_1fr]">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-table p-4 md:sticky md:top-4">
              <LowPolyAvatar avatar={draft} size={190} label={editor.username} />
              <span className="rounded-full bg-black/60 px-3 py-0.5 text-sm">{editor.username}</span>
            </div>

            <div>
              <StylePicker
                label={t('character.sex')}
                options={SEXES}
                value={editor.sex}
                nameOf={(o) => t(`character.styles.sex.${o}`)}
                onChange={editor.setSex}
              />

              {editor.vehicle && <VehiclePicker value={editor.vehicle} onChange={editor.setVehicle} />}

              {human && (
                <>
                  <StylePicker label={t('character.hair')} options={HAIR_STYLES} value={human.hair} nameOf={(o) => t(`character.styles.hair.${o}`)} onChange={(v) => change('hair', v)} isLocked={(o) => editor.isLocked('hair', o)} />
                  <SwatchPicker label={t('character.hairColor')} colors={PALETTE.hairColor} value={human.hairColor} onChange={(v) => change('hairColor', v)} />
                  <SwatchPicker label={t('character.skin')} colors={PALETTE.skin} value={human.skin} onChange={(v) => change('skin', v)} />
                  <StylePicker label={t('character.eyes')} options={EYE_STYLES} value={human.eyes} nameOf={(o) => t(`character.styles.eyes.${o}`)} onChange={(v) => change('eyes', v)} />
                  <SwatchPicker label={t('character.eyeColor')} colors={PALETTE.eyeColor} value={human.eyeColor} onChange={(v) => change('eyeColor', v)} />
                  <StylePicker label={t('character.mouth')} options={MOUTH_STYLES} value={human.mouth} nameOf={(o) => t(`character.styles.mouth.${o}`)} onChange={(v) => change('mouth', v)} />
                  {human.sex === 'male' && (
                    <StylePicker label={t('character.beard')} options={BEARD_STYLES} value={human.beard} nameOf={(o) => t(`character.styles.beard.${o}`)} onChange={(v) => change('beard', v)} />
                  )}
                  <StylePicker label={t('character.clothes')} options={CLOTHES_STYLES} value={human.clothes} nameOf={(o) => t(`character.styles.clothes.${o}`)} onChange={(v) => change('clothes', v)} isLocked={(o) => editor.isLocked('clothes', o)} />
                  <SwatchPicker label={t('character.clothesColor')} colors={PALETTE.clothesColor} value={human.clothesColor} onChange={(v) => change('clothesColor', v)} />
                  <StylePicker label={t('character.hat')} options={HAT_STYLES} value={human.hat} nameOf={(o) => t(`character.styles.hat.${o}`)} onChange={(v) => change('hat', v)} isLocked={(o) => editor.isLocked('hat', o)} />
                  {human.hat !== 'none' && <SwatchPicker label={t('character.hatColor')} colors={HAT_PALETTE} value={human.hatColor} onChange={(v) => change('hatColor', v)} />}
                  <StylePicker label={t('character.glasses')} options={GLASSES_STYLES} value={human.glasses} nameOf={(o) => t(`character.styles.glasses.${o}`)} onChange={(v) => change('glasses', v)} isLocked={(o) => editor.isLocked('glasses', o)} />
                  <StylePicker label={t('character.accessory')} options={ACCESSORY_STYLES} value={human.accessory} nameOf={(o) => t(`character.styles.accessory.${o}`)} onChange={(v) => change('accessory', v)} isLocked={(o) => editor.isLocked('accessory', o)} />
                  <StylePicker label={t('character.pet')} options={PET_STYLES} value={human.pet} nameOf={(o) => t(`character.styles.pet.${o}`)} onChange={(v) => change('pet', v)} isLocked={(o) => editor.isLocked('pet', o)} />
                  {(human.accessory === 'scarf') && <SwatchPicker label={t('character.hatColor')} colors={HAT_PALETTE} value={human.hatColor} onChange={(v) => change('hatColor', v)} />}
                </>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3">
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
