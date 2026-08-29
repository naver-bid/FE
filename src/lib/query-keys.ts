export const queryKeys = {
  me: ["me"] as const,
  adGroups: (customerId: string) => ["adGroups", customerId] as const,
  adGroupKeywords: (adGroupId: string) => ["adGroupKeywords", adGroupId] as const,
  biddingSets: (customerId: string) => ["biddingSets", customerId] as const,
}
