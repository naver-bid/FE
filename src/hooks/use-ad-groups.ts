import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import * as api from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  AdGroup,
  AdGroupKeyword,
  BidSettingValues,
  Device,
  StatsPeriod,
} from "@/types/ads"

export function useAdGroups(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adGroups(customerId ?? ""),
    queryFn: api.getAdGroups,
    enabled: !!customerId,
  })
}

/** 광고 그룹의 키워드 목록 (+ 입찰 설정, period 기간 통계). adGroupId 가 없으면 조회하지 않는다. */
export function useAdGroupKeywords(
  adGroupId: string | null,
  period: StatsPeriod = "last7days"
) {
  return useQuery({
    queryKey: queryKeys.adGroupKeywords(adGroupId ?? "", period),
    queryFn: () => api.getAdGroupKeywords(adGroupId!, period),
    enabled: !!adGroupId,
    staleTime: 60_000,
  })
}

/**
 * 키워드 입찰 설정(희망순위·입찰가 한도·가감액) 부분 수정.
 * 해당 그룹의 모든 기간 캐시에 낙관적으로 반영하고, 실패하면 되돌린다.
 * 키워드 목록 재조회는 네이버 실시간 호출이라 무효화하지 않고 서버 응답으로 캐시를 갱신한다.
 */
export function useUpdateKeywordSetting(adGroupId: string | null) {
  const queryClient = useQueryClient()
  // period 없이 → 이 그룹의 모든 기간 쿼리
  const key = queryKeys.adGroupKeywords(adGroupId ?? "")

  const patchCache = (
    keywordId: string,
    update: (k: AdGroupKeyword) => AdGroupKeyword
  ) =>
    queryClient.setQueriesData<AdGroupKeyword[]>({ queryKey: key }, (prev) =>
      prev?.map((k) => (k.id === keywordId ? update(k) : k))
    )

  return useMutation({
    mutationFn: ({
      keywordId,
      patch,
    }: {
      keywordId: string
      patch: Partial<BidSettingValues>
    }) => api.patchKeywordSetting(adGroupId!, keywordId, patch),
    onMutate: async ({ keywordId, patch }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueriesData<AdGroupKeyword[]>({
        queryKey: key,
      })
      patchCache(keywordId, (k) => ({
        ...k,
        bidSetting: {
          keywordId,
          targetRank: null,
          maxBid: null,
          bidAdjust: null,
          updatedAt: new Date().toISOString(),
          ...k.bidSetting,
          ...patch,
        },
      }))
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      for (const [k, data] of ctx?.previous ?? [])
        queryClient.setQueryData(k, data)
    },
    onSuccess: (setting, { keywordId }) => {
      patchCache(keywordId, (k) => ({ ...k, bidSetting: setting }))
    },
  })
}

/**
 * 여러 키워드의 입찰 설정을 한 번에 저장 (PUT upsert).
 * 서버가 항목마다 세 값을 통째로 덮어쓰므로, 호출부는 바꾸지 않을 값도 기존 값으로 채워 보내야 한다.
 * 성공하면 응답으로 받은 설정을 해당 그룹의 모든 기간 캐시에 반영한다.
 */
export function useBulkUpdateKeywordSettings(adGroupId: string | null) {
  const queryClient = useQueryClient()
  const key = queryKeys.adGroupKeywords(adGroupId ?? "")

  return useMutation({
    mutationFn: (items: (BidSettingValues & { keywordId: string })[]) =>
      api.bulkUpsertKeywordSettings(adGroupId!, items),
    onSuccess: (settings) => {
      const byId = new Map(settings.map((s) => [s.keywordId, s]))
      queryClient.setQueriesData<AdGroupKeyword[]>({ queryKey: key }, (prev) =>
        prev?.map((k) => {
          const setting = byId.get(k.id)
          return setting ? { ...k, bidSetting: setting } : k
        })
      )
    },
  })
}

/** 광고 그룹 하나의 기기(device)를 낙관적으로 수정한다. 실패하면 되돌린다. */
export function useUpdateAdGroupDevice(customerId: string | undefined) {
  const queryClient = useQueryClient()
  const key = queryKeys.adGroups(customerId ?? "")

  return useMutation({
    mutationFn: ({
      adGroupId,
      device,
    }: {
      adGroupId: string
      device: Device | null
    }) => api.patchAdGroupSetting(adGroupId, { device }),
    onMutate: async ({ adGroupId, device }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<AdGroup[]>(key)
      queryClient.setQueryData<AdGroup[]>(key, (prev) =>
        prev?.map((g) => (g.id === adGroupId ? { ...g, device } : g))
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous)
    },
  })
}

/** 계정의 모든 광고 그룹에 같은 기기를 일괄 저장하고 목록을 다시 불러온다 */
export function useApplyDeviceToAll(customerId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (device: Device | null) =>
      api.applyAdGroupSettingToAll({ device }),
    onSuccess: async () => {
      if (customerId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.adGroups(customerId),
        })
      }
    },
  })
}

export function useSyncAccount(customerId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.syncAccount,
    onSuccess: async () => {
      if (customerId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.adGroups(customerId),
        })
      }
    },
  })
}
