import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { fetchMyAvatar, saveMyAvatar } from '@/features/character/apis/character-api';
import { useSession } from '@/shared/hooks/use-session';
import { randomAvatar, type Avatar } from '@/shared/models/avatar';

export function useCharacterEditor() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['avatar', user?.id], queryFn: fetchMyAvatar, refetchOnMount: 'always' });
  const [draft, setDraft] = useState<Avatar | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // El borrador arranca con el personaje guardado y a partir de ahí se edita localmente.
  useEffect(() => {
    if (query.data && !draft) setDraft(query.data);
  }, [query.data, draft]);

  const save = useMutation({
    mutationFn: saveMyAvatar,
    onSuccess: (avatar) => {
      queryClient.setQueryData(['avatar', user?.id], avatar);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    },
  });

  const change = <K extends keyof Avatar>(key: K, value: Avatar[K]) => {
    setJustSaved(false);
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  return {
    username: user?.username ?? '',
    draft,
    isLoading: query.isLoading || !draft,
    isDirty: Boolean(draft && query.data && JSON.stringify(draft) !== JSON.stringify(query.data)),
    isSaving: save.isPending,
    justSaved,
    error: save.error?.message,
    change,
    randomize: () => {
      setJustSaved(false);
      setDraft(randomAvatar());
    },
    save: () => draft && save.mutate(draft),
  };
}
