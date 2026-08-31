import type { StatsPeriod } from "@/types/ads"

export const queryKeys = {
  me: ["me"] as const,
  adGroups: (customerId: string) => ["adGroups", customerId] as const,
  /** period 를 빼면 해당 그룹의 모든 기간 키워드 쿼리에 매칭 (무효화용) */
  adGroupKeywords: (adGroupId: string, period?: StatsPeriod) =>
    period
      ? (["adGroupKeywords", adGroupId, period] as const)
      : (["adGroupKeywords", adGroupId] as const),
  biddingSets: (customerId: string) => ["biddingSets", customerId] as const,
}
