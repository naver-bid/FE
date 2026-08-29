import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"

import { useAccount } from "@/hooks/use-account"
import * as api from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { BiddingMembership, BiddingSet } from "@/types/bidding"

/**
 * 자동입찰 세트 및 그룹 소속 상태 (서버 상태).
 * 세트 변경은 광고 그룹의 setId 에도 영향을 주므로 두 쿼리를 함께 무효화한다.
 */
export function useBiddingSets() {
  const { account } = useAccount()
  const customerId = account?.customerId ?? ""
  const queryClient = useQueryClient()
  const setsKey = queryKeys.biddingSets(customerId)

  const query = useQuery({
    queryKey: setsKey,
    queryFn: api.getBiddingSets,
    enabled: !!customerId,
  })
  const sets: BiddingSet[] = useMemo(() => query.data ?? [], [query.data])

  const membership: BiddingMembership = useMemo(() => {
    const m: BiddingMembership = {}
    for (const set of sets) for (const id of set.adGroupIds) m[id] = set.id
    return m
  }, [sets])

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: setsKey }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.adGroups(customerId),
      }),
    ])
  }

  const createSet = useMutation({
    mutationFn: (body: { name: string; adGroupIds?: string[] }) =>
      api.createBiddingSet(body),
    onSuccess: invalidate,
  })

  const updateSet = useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string
      name?: string
      enabled?: boolean
    }) => api.updateBiddingSet(id, patch),
    onSuccess: invalidate,
  })

  /** 순서 변경. 낙관적으로 반영하고 실패 시 되돌린다. */
  const reorderSets = useMutation({
    mutationFn: (ids: string[]) => api.reorderBiddingSets(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: setsKey })
      const previous = queryClient.getQueryData<BiddingSet[]>(setsKey)
      if (previous) {
        const byId = new Map(previous.map((s) => [s.id, s]))
        queryClient.setQueryData<BiddingSet[]>(
          setsKey,
          ids.map((id) => byId.get(id)).filter((s): s is BiddingSet => !!s)
        )
      }
      return { previous }
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(setsKey, ctx.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: setsKey }),
  })

  const deleteSet = useMutation({
    mutationFn: (id: string) => api.deleteBiddingSet(id),
    onSuccess: invalidate,
  })

  const assignGroups = useMutation({
    mutationFn: ({
      setId,
      adGroupIds,
    }: {
      setId: string
      adGroupIds: string[]
    }) => api.assignBiddingSetItems(setId, adGroupIds),
    onSuccess: invalidate,
  })

  const unassignGroups = useMutation({
    mutationFn: (adGroupIds: string[]) =>
      api.unassignBiddingSetItems(adGroupIds),
    onSuccess: invalidate,
  })

  return {
    sets,
    membership,
    isLoading: query.isLoading,
    createSet,
    updateSet,
    reorderSets,
    deleteSet,
    assignGroups,
    unassignGroups,
  }
}
