/** 자동입찰 세트 — 같은 입찰 전략을 적용할 광고 그룹 묶음 */
export interface BiddingSet {
  id: string
  name: string
  /** 표시용 색상 (tailwind bg-* 클래스). 서버가 생성 시 배정 */
  color: string
  enabled: boolean
  /** 이 세트에 속한 광고 그룹 ID (nccAdgroupId) */
  adGroupIds: string[]
}

/** PUT /api/bidding-sets/{id}/items 응답 */
export interface BiddingSetAssignResult extends BiddingSet {
  /** 이 세트에 새로 추가된 그룹 수 (이미 있던 그룹 제외) */
  added: number
}

/** adGroupId → 속한 setId 목록. 한 그룹은 여러 세트에 속할 수 있다. */
export type BiddingMembership = Record<string, string[]>
