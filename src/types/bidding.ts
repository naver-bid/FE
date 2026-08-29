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
  /** 다른 세트에서 이동된 그룹 수 */
  moved: number
}

/** adGroupId → setId. 한 그룹은 하나의 세트에만 속한다. */
export type BiddingMembership = Record<string, string>
