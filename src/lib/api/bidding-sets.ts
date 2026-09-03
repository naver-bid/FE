/** 자동입찰 세트 — /api/bidding-sets/*, /api/bidding-set-items */
import type { BiddingSet, BiddingSetAssignResult } from "@/types/bidding"

import { request } from "./client"

export const getBiddingSets = () =>
  request<BiddingSet[]>("GET", "/api/bidding-sets")

export const createBiddingSet = (body: {
  name: string
  adGroupIds?: string[]
}) => request<BiddingSet>("POST", "/api/bidding-sets", body)

export const updateBiddingSet = (
  id: string,
  patch: { name?: string; enabled?: boolean }
) =>
  request<BiddingSet>(
    "PATCH",
    `/api/bidding-sets/${encodeURIComponent(id)}`,
    patch
  )

/** 세트 표시 순서를 ids 순으로 저장 */
export const reorderBiddingSets = (ids: string[]) =>
  request<void>("PUT", "/api/bidding-sets/order", { ids })

export const deleteBiddingSet = (id: string) =>
  request<void>("DELETE", `/api/bidding-sets/${encodeURIComponent(id)}`)

/** 그룹들을 세트에 추가. 한 그룹은 여러 세트에 속할 수 있어 다른 세트 소속은 유지된다. */
export const assignBiddingSetItems = (id: string, adGroupIds: string[]) =>
  request<BiddingSetAssignResult>(
    "PUT",
    `/api/bidding-sets/${encodeURIComponent(id)}/items`,
    { adGroupIds }
  )

/** 특정 세트에서 그룹 제거 */
export const removeBiddingSetItems = (id: string, adGroupIds: string[]) =>
  request<void>("DELETE", `/api/bidding-sets/${encodeURIComponent(id)}/items`, {
    adGroupIds,
  })

/** 어느 세트에 있든 그룹 제거 */
export const unassignBiddingSetItems = (adGroupIds: string[]) =>
  request<void>("DELETE", "/api/bidding-set-items", { adGroupIds })
