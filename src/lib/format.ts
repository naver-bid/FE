export const formatNumber = (n: number) => n.toLocaleString("ko-KR")

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  const mm = d.getMonth() + 1
  const dd = d.getDate()
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${mm}월${dd}일 ${hh}시${mi}분`
}
