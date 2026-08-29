import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import * as api from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { AdGroup } from "@/types/ads"

export function useAdGroups(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adGroups(customerId ?? ""),
    queryFn: api.getAdGroups,
    enabled: !!customerId,
  })
}

/** 광고 그룹의 키워드 목록. adGroupId 가 없으면 조회하지 않는다. */
export function useAdGroupKeywords(adGroupId: string | null) {
  return useQuery({
    queryKey: queryKeys.adGroupKeywords(adGroupId ?? ""),
    queryFn: () => api.getAdGroupKeywords(adGroupId!),
    enabled: !!adGroupId,
    staleTime: 60_000,
  })
}

export function useSyncAccount(customerId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.syncAccount,
    onSuccess: async () => {
      if (customerId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adGroups(customerId) })
      }
    },
  })
}

/** 하나 이상의 광고 그룹 syncEnabled 를 낙관적으로 토글한다. 실패한 항목만 되돌린다. */
export function useToggleAdGroups(customerId: string | undefined) {
  const queryClient = useQueryClient()
  const key = queryKeys.adGroups(customerId ?? "")

  return useMutation({
    mutationFn: async ({ ids, checked }: { ids: string[]; checked: boolean }) => {
      const results = await Promise.allSettled(
        ids.map((id) => api.updateAdGroup(id, { syncEnabled: checked }))
      )
      return ids.filter((_, i) => results[i].status === "rejected")
    },
    onMutate: async ({ ids, checked }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const targetIds = new Set(ids)
      queryClient.setQueryData<AdGroup[]>(key, (prev) =>
        prev?.map((g) => (targetIds.has(g.id) ? { ...g, syncEnabled: checked } : g))
      )
    },
    onSuccess: (failedIds, { checked }) => {
      if (failedIds.length === 0) return
      const failed = new Set(failedIds)
      queryClient.setQueryData<AdGroup[]>(key, (prev) =>
        prev?.map((g) => (failed.has(g.id) ? { ...g, syncEnabled: !checked } : g))
      )
    },
  })
}
