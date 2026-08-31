import type { StatsPeriod } from "@/types/ads"

/** 기간 선택 UI 에 보여줄 프리셋 목록 (표시 순서) */
export const STATS_PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "yesterday", label: "어제" },
  { value: "last7days", label: "최근 7일" },
  { value: "last30days", label: "최근 30일" },
  { value: "lastweek", label: "지난주" },
  { value: "lastmonth", label: "지난달" },
  { value: "lastquarter", label: "지난 분기" },
]

export const statsPeriodLabel = (period: StatsPeriod) =>
  STATS_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period

const isStatsPeriod = (v: unknown): v is StatsPeriod =>
  STATS_PERIOD_OPTIONS.some((o) => o.value === v)

/** 실적 통계 집계 기간 기본값 (저장된 선택이 없을 때) */
export const DEFAULT_STATS_PERIOD: StatsPeriod = "last7days"

const STORAGE_KEY = "bidding-stats-period"

/**
 * 마지막으로 고른 실적 기간. 브라우저(localStorage)에 저장해 다음 방문에도 같은 기간으로 연다.
 * 저장값이 없거나 더 이상 유효한 프리셋이 아니면(옵션 변경 등) 기본값.
 */
export function loadStatsPeriod(): StatsPeriod {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isStatsPeriod(stored) ? stored : DEFAULT_STATS_PERIOD
  } catch {
    // 스토리지 접근이 막힌 환경(사생활 보호 모드 등)에서는 기본값
    return DEFAULT_STATS_PERIOD
  }
}

export function saveStatsPeriod(period: StatsPeriod) {
  try {
    localStorage.setItem(STORAGE_KEY, period)
  } catch {
    // 저장 실패는 조용히 무시 — 이번 세션에서는 상태로 유지된다
  }
}

/**
 * 네이버 datePreset 이 실제로 가리키는 날짜 구간을 오늘 기준으로 계산한다.
 * 네이버 집계는 "오늘"을 제외한다 — last7days 는 어제까지 7일, last30days 는 어제까지 30일.
 * (today 만 예외로 오늘 하루.) lastweek 는 지난 월~일, lastmonth/lastquarter 는 지난 달/분기 전체.
 */
export function statsPeriodRange(
  period: StatsPeriod,
  today: Date = new Date()
): { since: Date; until: Date } {
  const day = (offset: number) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)

  switch (period) {
    case "today":
      return { since: day(0), until: day(0) }
    case "yesterday":
      return { since: day(-1), until: day(-1) }
    case "last7days":
      return { since: day(-7), until: day(-1) }
    case "last30days":
      return { since: day(-30), until: day(-1) }
    case "lastweek": {
      // 지난주 월요일 ~ 일요일 (getDay: 일=0)
      const dow = today.getDay() === 0 ? 7 : today.getDay()
      return { since: day(-dow - 6), until: day(-dow) }
    }
    case "lastmonth":
      return {
        since: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        until: new Date(today.getFullYear(), today.getMonth(), 0),
      }
    case "lastquarter": {
      const startMonth = Math.floor(today.getMonth() / 3) * 3 - 3
      return {
        since: new Date(today.getFullYear(), startMonth, 1),
        until: new Date(today.getFullYear(), startMonth + 3, 0),
      }
    }
  }
}

/** 08.24 형식 (연도 생략) */
const formatMonthDay = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`

/** "08.24 ~ 08.30" — 하루짜리 구간이면 "08.30" 하나만 */
export function formatStatsPeriod(
  period: StatsPeriod,
  today: Date = new Date()
): string {
  const { since, until } = statsPeriodRange(period, today)
  const from = formatMonthDay(since)
  const to = formatMonthDay(until)
  return from === to ? to : `${from} ~ ${to}`
}
