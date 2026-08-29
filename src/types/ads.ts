export interface AdGroup {
  /** nccAdgroupId */
  id: string
  /** nccCampaignId */
  campaignId: string
  campaignName: string
  name: string
  siteUrl: string
  /** 자동입찰 대상으로 체크됐는지 */
  syncEnabled: boolean
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
