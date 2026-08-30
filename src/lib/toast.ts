import type { NavigateFunction } from "react-router"

import { routes } from "@/lib/pages"

/** mutation 에러에서 사용자에게 보여줄 메시지 */
export function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback
}

/** 세트 관련 토스트에 붙이는 "자동 입찰로 이동" 액션 */
export function goToBiddingAction(navigate: NavigateFunction) {
  return {
    label: "자동 입찰로 이동",
    onClick: () => void navigate(routes.bidding),
  }
}
