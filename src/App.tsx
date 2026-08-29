import { useState } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAccount } from "@/hooks/use-account"
import { pages, type PageKey } from "@/lib/pages"
import { BasicPage } from "@/pages/basic-page"

export function App() {
  const [page, setPage] = useState<PageKey>("basic")
  const { account } = useAccount()
  const title = pages.find((p) => p.key === page)?.title
  const updatedAt = account ? new Date(account.updatedAt) : null

  return (
    <SidebarProvider>
      <AppSidebar page={page} onPageChange={setPage} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2" />
          <span className="text-sm font-medium">{title}</span>
          {updatedAt && (
            <span className="ml-auto text-xs text-muted-foreground">
              계정 정보 {updatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준
            </span>
          )}
        </header>
        <main className="flex flex-1 flex-col gap-4 p-6">
          {page === "basic" ? (
            <BasicPage />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              자동 입찰 화면은 아직 준비 중입니다.
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
