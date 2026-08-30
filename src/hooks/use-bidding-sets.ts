import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"

import { useAccount } from "@/hooks/use-account"
import * as api from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { AdGroup } from "@/types/ads"
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
  const adGroupsKey = queryKeys.adGroups(customerId)

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
      queryClient.invalidateQueries({ queryKey: adGroupsKey }),
    ])
  }

  /**
   * 그룹 소속 변경을 두 캐시(세트 목록, 광고 그룹)에 낙관적으로 반영한다.
   * `apply` 로 세트 목록을 바꾸면 각 그룹의 setId 는 거기서 유도된다.
   * 실패 시 되돌릴 수 있도록 이전 스냅샷을 돌려준다.
   */
  const applyOptimistic = async (
    apply: (sets: BiddingSet[]) => BiddingSet[]
  ) => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: setsKey }),
      queryClient.cancelQueries({ queryKey: adGroupsKey }),
    ])
    const previousSets = queryClient.getQueryData<BiddingSet[]>(setsKey)
    const previousGroups = queryClient.getQueryData<AdGroup[]>(adGroupsKey)
    if (previousSets) {
      const nextSets = apply(previousSets)
      queryClient.setQueryData<BiddingSet[]>(setsKey, nextSets)
      if (previousGroups) {
        const setIdOf: Record<string, string> = {}
        for (const set of nextSets)
          for (const id of set.adGroupIds) setIdOf[id] = set.id
        queryClient.setQueryData<AdGroup[]>(
          adGroupsKey,
          previousGroups.map((g) =>
            (setIdOf[g.id] ?? null) === g.setId
              ? g
              : { ...g, setId: setIdOf[g.id] ?? null }
          )
        )
      }
    }
    return { previousSets, previousGroups }
  }

  const rollback = (ctx?: {
    previousSets?: BiddingSet[]
    previousGroups?: AdGroup[]
  }) => {
    if (ctx?.previousSets) queryClient.setQueryData(setsKey, ctx.previousSets)
    if (ctx?.previousGroups)
      queryClient.setQueryData(adGroupsKey, ctx.previousGroups)
  }

  /** 세트에서 주어진 그룹들을 뺀다 (다른 세트로 이동/제거 시 공통) */
  const withoutGroups = (sets: BiddingSet[], adGroupIds: string[]) => {
    const removing = new Set(adGroupIds)
    return sets.map((s) =>
      s.adGroupIds.some((id) => removing.has(id))
        ? { ...s, adGroupIds: s.adGroupIds.filter((id) => !removing.has(id)) }
        : s
    )
  }

  /** 새 세트 생성. 선택한 그룹이 있으면 임시 세트로 즉시 표시하고 응답 후 실제 데이터로 교체 */
  const createSet = useMutation({
    mutationFn: (body: { name: string; adGroupIds?: string[] }) =>
      api.createBiddingSet(body),
    onMutate: ({ name, adGroupIds = [] }) =>
      applyOptimistic((sets) => [
        ...withoutGroups(sets, adGroupIds),
        {
          id: `optimistic-${Date.now()}`,
          name,
          color: "bg-muted",
          enabled: true,
          adGroupIds,
        },
      ]),
    onError: (_err, _vars, ctx) => rollback(ctx),
    onSettled: invalidate,
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
    onMutate: ({ setId, adGroupIds }) =>
      applyOptimistic((sets) =>
        withoutGroups(sets, adGroupIds).map((s) =>
          s.id === setId
            ? { ...s, adGroupIds: [...s.adGroupIds, ...adGroupIds] }
            : s
        )
      ),
    onError: (_err, _vars, ctx) => rollback(ctx),
    onSettled: invalidate,
  })

  const unassignGroups = useMutation({
    mutationFn: (adGroupIds: string[]) =>
      api.unassignBiddingSetItems(adGroupIds),
    onMutate: (adGroupIds) =>
      applyOptimistic((sets) => withoutGroups(sets, adGroupIds)),
    onError: (_err, _vars, ctx) => rollback(ctx),
    onSettled: invalidate,
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
