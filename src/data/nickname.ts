import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/state/SessionContext';
import { defaultNickname } from './greeting';
import { getPreferredNickname, setPreferredNickname } from './preferences';

export function useNickname(fullName?: string) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const accountKey = session ? `${session.institutionId}:${session.userName}` : '';
  const queryKey = ['nickname', accountKey] as const;
  const preference = useQuery({ queryKey, queryFn: () => getPreferredNickname(accountKey), enabled: Boolean(accountKey), staleTime: Infinity });
  const update = useMutation({
    mutationFn: (nickname: string | null) => setPreferredNickname(accountKey, nickname),
    onSuccess: (_result, nickname) => queryClient.setQueryData(queryKey, nickname?.trim() || null),
  });
  const fallbackName = fullName || session?.userName || '';
  return {
    nickname: preference.data || defaultNickname(fallbackName),
    isLoading: preference.isLoading,
    isSaving: update.isPending,
    saveNickname: (nickname: string) => update.mutateAsync(nickname),
    resetNickname: () => update.mutateAsync(null),
  };
}
