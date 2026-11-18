import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { fetchMyAvatar, saveMyAvatar } from '@/features/character/apis/character-api';
import { useSession } from '@/shared/hooks/use-session';
import { DEFAULT_HUMAN, randomHuman, type Avatar, type HumanAvatar, type Sex, type Vehicle } from '@/shared/models/avatar';

export function useCharacterEditor() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['avatar', user?.id], queryFn: fetchMyAvatar, refetchOnMount: 'always' });
  const [draft, setDraft] = useState<Avatar | null>(null);
  // Al pasar a "no binario" se recuerda el personaje humano para poder volver a él sin perderlo.
  const [lastHuman, setLastHuman] = useState<HumanAvatar>(DEFAULT_HUMAN);
  const [lastVehicle, setLastVehicle] = useState<Vehicle>('apache');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!query.data || draft) return;
    setDraft(query.data);
    if (query.data.sex === 'nonbinary') setLastVehicle(query.data.vehicle);
    else setLastHuman(query.data);
  }, [query.data, draft]);

  const save = useMutation({
    mutationFn: saveMyAvatar,
    onSuccess: (avatar) => {
      queryClient.setQueryData(['avatar', user?.id], avatar);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    },
  });

  const human = draft && draft.sex !== 'nonbinary' ? draft : null;
  const vehicle = draft && draft.sex === 'nonbinary' ? draft.vehicle : null;

  const edit = (next: Avatar) => {
    setJustSaved(false);
    setDraft(next);
  };

  return {
    username: user?.username ?? '',
    draft,
    human,
    vehicle,
    sex: draft?.sex ?? null,
    isLoading: query.isLoading || !draft,
    isDirty: Boolean(draft && query.data && JSON.stringify(draft) !== JSON.stringify(query.data)),
    isSaving: save.isPending,
    justSaved,
    error: save.error?.message,

    change: <K extends keyof HumanAvatar>(key: K, value: HumanAvatar[K]) => {
      if (human) edit({ ...human, [key]: value });
    },

    setSex: (sex: Sex) => {
      if (sex === 'nonbinary') {
        if (human) setLastHuman(human);
        edit({ sex, vehicle: lastVehicle });
        return;
      }
      const base = human ?? lastHuman;
      // La barba solo existe en hombres.
      edit({ ...base, sex, beard: sex === 'female' ? 'none' : base.beard });
    },

    setVehicle: (v: Vehicle) => {
      setLastVehicle(v);
      edit({ sex: 'nonbinary', vehicle: v });
    },

    randomize: () => {
      if (draft?.sex === 'nonbinary') {
        const v: Vehicle = Math.random() < 0.5 ? 'apache' : 'motorcycle';
        setLastVehicle(v);
        edit({ sex: 'nonbinary', vehicle: v });
      } else {
        edit(randomHuman(draft?.sex === 'female' ? 'female' : 'male'));
      }
    },

    save: () => draft && save.mutate(draft),
  };
}
