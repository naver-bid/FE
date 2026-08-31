export interface AdGroup {
  /** nccAdgroupId */
  id: string
  /** nccCampaignId */
  campaignId: string
  campaignName: string
  name: string
  siteUrl: string
  /** @deprecated 세트 소속(setId)으로 대체됨 */
  syncEnabled: boolean
  /** 속한 자동입찰 세트. 미배정이면 null */
  setId: string | null
}

/**
 * 키워드별 자동입찰 설정 (사용자 입력값). 세 값 모두 미입력이면 null.
 * 서버 스키마: BidSettingRead
 */
export interface BidSetting {
  /** nccKeywordId */
  keywordId: string
  /** 희망순위 */
  targetRank: number | null
  /** 입찰가 한도 (원) */
  maxBid: number | null
  /** 가감액 (원/회) */
  bidAdjust: number | null
  /** 마지막 저장 시각 (ISO) */
  updatedAt: string
}

/** 사용자가 입력하는 세 값. 서버 스키마: BidSettingPatch / BidSettingItem 의 값 부분 */
export type BidSettingValues = Pick<
  BidSetting,
  "targetRank" | "maxBid" | "bidAdjust"
>

/** 키워드 통계 집계 기간 — GET /api/adgroups/{id}/keywords?period= */
export type StatsPeriod = "today" | "yesterday" | "last7days" | "last30days"

/**
 * 키워드 기간 통계. 네이버 /stats 집계라 실시간이 아니고 수 시간 지연된다.
 * 서버 스키마: KeywordStats
 */
export interface KeywordStats {
  period: StatsPeriod
  /** 노출수 */
  impressions: number
  /** 클릭수 */
  clicks: number
  /** 비용 (원) */
  cost: number
  /** 클릭률. 노출이 없으면 null */
  ctr: number | null
  /** 클릭당 비용 (원). 클릭이 없으면 null */
  cpc: number | null
  /** 기간 평균 노출 순위. 노출이 없으면 null */
  avgRank: number | null
}

/** 광고 그룹에 등록된 키워드 (네이버 실시간 조회 + 사용자 설정·기간 통계 병합) — GET /api/adgroups/{id}/keywords */
export interface AdGroupKeyword {
  /** nccKeywordId */
  id: string
  adGroupId: string
  campaignId: string | null
  customerId: string | null
  keyword: string
  /** 키워드 입찰가 (원) */
  bidAmt: number
  /** true 면 bidAmt 대신 그룹 기본 입찰가 사용 */
  useGroupBidAmt: boolean
  /** ELIGIBLE / PAUSED / DELETED … */
  status: string
  statusReason: string | null
  /** 검수 상태: APPROVED / UNDER_REVIEW / LIMITED … */
  inspectStatus: string | null
  /** true 면 사용자가 OFF 한 상태 */
  userLock: boolean
  /** 품질지수 1~7 */
  qualityIndex: number | null
  links: Record<string, unknown> | null
  /** 등록 시각 (ISO) */
  regTm: string | null
  /** 수정 시각 (ISO) */
  editTm: string | null
  /** 현재 노출 가능 여부 (네이버 기준) */
  exposable: boolean
  /** 사용자 자동입찰 설정. 한 번도 입력하지 않았거나 초기화했으면 null */
  bidSetting: BidSetting | null
  /** 기간 통계. 통계 조회가 실패하면 null (목록은 정상) */
  stats: KeywordStats | null
}

export interface AccountCredentials {
  apiKey: string
  secretKey: string
  customerId: string
}

export interface Account {
  customerId: string
  /** 표시용 로그인 ID (customer-links 에서 조회, 없으면 customerId) */
  loginId: string
  /** 비즈머니 잔액. 조회 실패 시 null */
  balance: number | null
  /** 기간 소진액. 아직 미구현 */
  spent: number | null
  updatedAt: string
}

export interface SyncResult {
  campaigns: number
  adGroups: number
  syncedAt: string
}
