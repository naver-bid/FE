import { formatNumber } from "@/lib/format"
import type { BidSettingValues } from "@/types/ads"

/** 네이버 제약 (백엔드 BidSettingFields 와 동일): 입찰가 70원~100,000원 10원 단위, 가감액 10원~100,000원 10원 단위, 순위 1~15 */
export const NAVER_MIN_BID = 70
export const NAVER_MAX_BID = 100_000
export const BID_UNIT = 10
export const RANK_MIN = 1
export const RANK_MAX = 15

/** 화면 표시용 라벨 */
export const BID_SETTING_LABELS: Record<keyof BidSettingValues, string> = {
  targetRank: "희망순위",
  maxBid: "입찰가 한도",
  bidAdjust: "가감액",
}

/** 입력 가능한 값의 범위 안내 (placeholder·설명용) */
export const BID_SETTING_HINTS: Record<keyof BidSettingValues, string> = {
  targetRank: `${RANK_MIN}~${RANK_MAX}`,
  maxBid: `${formatNumber(NAVER_MIN_BID)}~${formatNumber(NAVER_MAX_BID)}원, ${BID_UNIT}원 단위`,
  bidAdjust: `${formatNumber(BID_UNIT)}~${formatNumber(NAVER_MAX_BID)}원, ${BID_UNIT}원 단위`,
}

/**
 * 입찰 설정 값 검증 규칙. 값이 규칙에 맞으면 null, 아니면 오류 메시지.
 * 키워드 그리드의 셀 편집과 일괄 설정 다이얼로그가 함께 쓴다.
 */
export const BID_SETTING_RULES: Record<
  keyof BidSettingValues,
  (v: number) => string | null
> = {
  targetRank: (v) =>
    Number.isInteger(v) && v >= RANK_MIN && v <= RANK_MAX
      ? null
      : `희망순위는 ${RANK_MIN}~${RANK_MAX} 사이의 정수여야 합니다.`,
  maxBid: (v) =>
    v >= NAVER_MIN_BID && v <= NAVER_MAX_BID && v % BID_UNIT === 0
      ? null
      : `입찰가 한도는 ${formatNumber(NAVER_MIN_BID)}~${formatNumber(NAVER_MAX_BID)}원 사이의 ${BID_UNIT}원 단위여야 합니다.`,
  bidAdjust: (v) =>
    v >= BID_UNIT && v <= NAVER_MAX_BID && v % BID_UNIT === 0
      ? null
      : `가감액은 ${formatNumber(BID_UNIT)}~${formatNumber(NAVER_MAX_BID)}원 사이의 ${BID_UNIT}원 단위여야 합니다.`,
}

/** 편집기·입력창이 돌려주는 값을 설정값으로. 빈 값은 null(미입력) */
export function toSettingValue(raw: unknown): number | null {
  if (raw === "" || raw == null) return null
  const n = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(n) ? Math.round(n) : null
}
