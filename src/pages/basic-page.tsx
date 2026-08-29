import { useCallback, useEffect, useState } from "react"
import { RefreshCw, UserPlus } from "lucide-react"

import { openAccountDialog } from "@/lib/overlays"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAccount } from "@/hooks/use-account"
import * as api from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import type { AdGroup } from "@/types/ads"

export function BasicPage() {
  const { account } = useAccount()
  const [groups, setGroups] = useState<AdGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const loadGroups = useCallback(() => {
    return api
      .getAdGroups()
      .then(setGroups)
      .finally(() => setLoading(false))
  }, [])

  const customerId = account?.customerId
  useEffect(() => {
    if (!customerId) return
    let active = true
    api.getAdGroups().then((data) => {
      if (active) {
        setGroups(data)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [customerId])

  async function handleSync() {
    setSyncing(true)
    setStatus("계정 동기화 중...")
    try {
      const result = await api.syncAccount()
      await loadGroups()
      setStatus(
        `계정 동기화 완료 (${formatDateTime(result.syncedAt)}) — 캠페인 ${result.campaigns}개, 그룹 ${result.adGroups}개. 입찰할 그룹을 체크하고 [그룹 동기화] 버튼을 클릭하세요.`
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "동기화에 실패했습니다.")
    } finally {
      setSyncing(false)
    }
  }

  async function handleToggle(group: AdGroup, checked: boolean) {
    // 낙관적 업데이트
    setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, syncEnabled: checked } : g)))
    try {
      await api.updateAdGroup(group.id, { syncEnabled: checked })
    } catch {
      setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, syncEnabled: !checked } : g)))
    }
  }

  const visibleGroups = account ? groups : []
  const checkedCount = visibleGroups.filter((g) => g.syncEnabled).length

  if (!account) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <UserPlus className="size-5 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium">네이버 광고 계정이 연결되지 않았습니다</p>
          <p className="text-sm text-muted-foreground">
            계정을 연결하면 캠페인과 광고 그룹을 불러올 수 있습니다.
          </p>
        </div>
        <Button onClick={() => void openAccountDialog()}>계정 연결</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-medium">운영중인 광고 그룹 리스트</h2>
        {groups.length > 0 && (
          <Badge variant="secondary">
            {checkedCount} / {groups.length} 선택
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            세팅 저장
          </Button>
          <Button variant="outline" size="sm" disabled>
            세팅 로드
          </Button>
          <Button size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={syncing ? "animate-spin" : undefined} />
            {syncing ? "동기화 중..." : "계정 동기화"}
          </Button>
          <Button size="sm" variant="secondary" disabled={checkedCount === 0}>
            그룹 동기화
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">No</TableHead>
              <TableHead>캠페인명</TableHead>
              <TableHead>사이트주소</TableHead>
              <TableHead>그룹명</TableHead>
              <TableHead className="w-16 text-center">동기화</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  {loading
                    ? "불러오는 중..."
                    : "[계정 동기화] 버튼을 눌러 캠페인과 광고 그룹을 불러오세요."}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((g, i) => (
                <TableRow key={g.id} data-state={g.syncEnabled ? "selected" : undefined}>
                  <TableCell className="text-center tabular-nums text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  <TableCell>{g.campaignName}</TableCell>
                  <TableCell className="text-muted-foreground">{g.siteUrl}</TableCell>
                  <TableCell>{g.name}</TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={g.syncEnabled}
                      onCheckedChange={(checked) => handleToggle(g, checked === true)}
                      aria-label={`${g.name} 동기화`}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {status && (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {status}
        </p>
      )}
    </div>
  )
}
