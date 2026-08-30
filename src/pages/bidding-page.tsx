import { useState } from "react"
import { ArrowRight, Gavel } from "lucide-react"
import { useNavigate } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAccount } from "@/hooks/use-account"
import { useAdGroups } from "@/hooks/use-ad-groups"
import { useBiddingSets } from "@/hooks/use-bidding-sets"
import { routes } from "@/lib/pages"

/** 자동 입찰 — 세트를 골라 입찰 전략을 설정하고 실행 상태를 본다. 세트 구성은 광고 그룹 페이지에서. */
export function BiddingPage() {
  const navigate = useNavigate()
  const goAdGroups = () => void navigate(routes.adGroups)
  const { account } = useAccount()
  const { data: groups = [] } = useAdGroups(account?.customerId)
  const { sets, membership, isLoading } = useBiddingSets()
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)

  const activeSet = sets.find((s) => s.id === selectedSetId) ?? sets[0]
  const groupsBySet = (setId: string) => groups.filter((g) => membership[g.id] === setId)
  const activeGroups = activeSet ? groupsBySet(activeSet.id) : []

  if (!account) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        계정을 연결하면 자동 입찰을 설정할 수 있습니다.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    )
  }

  if (sets.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Gavel className="size-5 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium">자동입찰 세트가 없습니다</p>
          <p className="text-sm text-muted-foreground">
            광고 그룹 페이지에서 그룹을 선택해 세트로 묶으세요.
          </p>
        </div>
        <Button variant="outline" onClick={goAdGroups}>
          광고 그룹으로 이동
          <ArrowRight />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Tabs
        value={activeSet?.id ?? ""}
        onValueChange={(value) => setSelectedSetId(String(value))}
        className="flex-1"
      >
        <TabsList>
          {sets.map((set) => (
            <TabsTrigger key={set.id} value={set.id}>
              {set.name}
              <span className="text-xs tabular-nums text-muted-foreground">
                {groupsBySet(set.id).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {activeSet && (
          <TabsContent value={activeSet.id} className="flex flex-col gap-4">
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              입찰 설정(목표 순위, 최대 입찰가, 스케줄)과 실행 상태는 준비 중입니다.
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">입찰 대상 그룹</h3>
                <Badge variant="secondary">{activeGroups.length}개</Badge>
              </div>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={goAdGroups}>
                광고 그룹에서 편집
                <ArrowRight />
              </Button>
            </div>

            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>캠페인명</TableHead>
                    <TableHead>그룹명</TableHead>
                    <TableHead>사이트주소</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        이 세트에 속한 그룹이 없습니다. 광고 그룹 페이지에서 추가하세요.
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeGroups.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>{g.campaignName}</TableCell>
                        <TableCell>{g.name}</TableCell>
                        <TableCell className="text-muted-foreground">{g.siteUrl}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
