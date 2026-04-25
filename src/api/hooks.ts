import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/useAuth';
import { apiCall } from './client';
import type { HomeView, RowByTab, TabName } from '@/types';

function useToken() {
  const { idToken } = useAuth();
  return idToken;
}

export function useRows<T extends TabName>(tab: T) {
  const idToken = useToken();
  return useQuery({
    queryKey: ['rows', tab],
    enabled: !!idToken,
    queryFn: () => apiCall<RowByTab[T][]>({ idToken: idToken!, action: 'list', tab }),
  });
}

export function useHome() {
  const idToken = useToken();
  return useQuery({
    queryKey: ['home'],
    enabled: !!idToken,
    queryFn: () => apiCall<HomeView>({ idToken: idToken!, action: 'home' }),
  });
}

export function useAddRow<T extends TabName>(tab: T) {
  const idToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RowByTab[T]>) =>
      apiCall<RowByTab[T]>({ idToken: idToken!, action: 'add', tab, data: data as Record<string, unknown> }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rows', tab] });
      qc.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export function useUpdateRow<T extends TabName>(tab: T) {
  const idToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RowByTab[T]> }) =>
      apiCall<RowByTab[T]>({ idToken: idToken!, action: 'update', tab, id, data: data as Record<string, unknown> }),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['rows', tab] });
      const previous = qc.getQueryData<RowByTab[T][]>(['rows', tab]);
      if (previous) {
        qc.setQueryData<RowByTab[T][]>(
          ['rows', tab],
          previous.map((r) => (r.id === id ? { ...r, ...data } : r)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['rows', tab], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['rows', tab] });
      qc.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export function useDeleteRow<T extends TabName>(tab: T) {
  const idToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiCall<{ id: string; deleted: boolean }>({ idToken: idToken!, action: 'delete', tab, id }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['rows', tab] });
      const previous = qc.getQueryData<RowByTab[T][]>(['rows', tab]);
      if (previous) {
        qc.setQueryData<RowByTab[T][]>(
          ['rows', tab],
          previous.filter((r) => r.id !== id),
        );
      }
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(['rows', tab], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['rows', tab] });
      qc.invalidateQueries({ queryKey: ['home'] });
    },
  });
}
