export interface AdGroup {
  /** nccAdgroupId */
  id: string
  /** nccCampaignId */
  campaignId: string
  campaignName: string
  name: string
  siteUrl: string
  /** 속한 자동입찰 세트 목록. 여러 세트에 속할 수 있으며 미배정이면 빈 배열 */
  setIds: string[]
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

/**
 * 키워드 통계 집계 기간 (네이버 datePreset) — GET /api/adgroups/{id}/keywords?period=
 * 서버는 since/until(YYYY-MM-DD, KST) 로 임의 기간도 받는다. 그 경우 period 는 무시된다.
 */
export type StatsPeriod =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "lastweek"
  | "lastmonth"
  | "lastquarter"

/**
 * 키워드 기간 통계 — 네이버 GET /stats 가 주는 키워드 통계 전부.
 * 실시간이 아니라 네이버 집계(수 시간 지연)이며 period 기준.
 * 카운트/금액은 실적이 없으면 0, 비율/평균(순위·CPC·전환율·ROAS 등)은 네이버가 주지 않으면 null.
 * 서버 스키마: KeywordStats
 */
export interface KeywordStats {
  period: string
  /** 네이버 집계 시각 (ISO). 모르면 null */
  updatedAt: string | null
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
  /** 최근 평균 노출 순위 */
  recentAvgRank: number | null
  /** 최근 평균 CPC (원) */
  recentAvgCpc: number | null
  /** PC 평균 노출 순위 */
  pcAvgRank: number | null
  /** 모바일 평균 노출 순위 */
  mobileAvgRank: number | null
  /** 전환수 */
  conversions: number
  /** 전환율 */
  conversionRate: number | null
  /** 전환 매출 (원) */
  conversionAmount: number
  /** 광고수익률 */
  roas: number | null
  /** 전환당 비용 (원) */
  costPerConversion: number | null
  /** 구매 전환수 */
  purchaseConversions: number
  /** 구매 전환 매출 (원) */
  purchaseConversionAmount: number
  /** 구매 ROAS */
  purchaseRoas: number | null
  /** 동영상 조회수 */
  videoViews: number
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
