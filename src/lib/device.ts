/** 광고 그룹의 기기(Device) 표시용 상수 — null 은 미입력(서버 기본값) */
import type { Device } from "@/types/ads"

export const DEVICE_OPTIONS: { value: Device | null; label: string }[] = [
  { value: null, label: "미입력" },
  { value: "PC", label: "PC" },
  { value: "MOBILE", label: "모바일" },
]

export function deviceLabel(device: Device | null | undefined): string {
  return DEVICE_OPTIONS.find((o) => o.value === (device ?? null))?.label ?? ""
}
