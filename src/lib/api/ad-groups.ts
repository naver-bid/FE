/** 광고 그룹·키워드 조회 — /api/adgroups/* */
import type {
  AdGroup,
  AdGroupKeyword,
  AdGroupSetting,
  Device,
  StatsPeriod,
} from "@/types/ads"

import { request } from "./client"

export const getAdGroups = () => request<AdGroup[]>("GET", "/api/adgroups")

/** 그룹 하나의 설정 수정. device 에 null 을 보내면 미입력(서버 기본값)으로 되돌린다. */
export const patchAdGroupSetting = (
  id: string,
  patch: { device: Device | null }
) =>
  request<AdGroupSetting>(
    "PATCH",
    `/api/adgroups/${encodeURIComponent(id)}/settings`,
    patch
  )

/**
 * 네이버에서 실시간 조회한 키워드 + 사용자 입찰 설정(bidSetting) + 기간 통계(stats) 병합.
 * period 는 통계 집계 기간 (기본 last7days).
 */
export const getAdGroupKeywords = (id: string, period: StatsPeriod) =>
  request<AdGroupKeyword[]>(
    "GET",
    `/api/adgroups/${encodeURIComponent(id)}/keywords?period=${period}`
  )
