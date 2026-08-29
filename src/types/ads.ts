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

/** 광고 그룹에 등록된 키워드 (네이버 동기화 데이터, 읽기 전용) — GET /api/adgroups/{id}/keywords */
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
