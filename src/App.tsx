import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAccount } from "@/hooks/use-account"
import { pages, routes } from "@/lib/pages"
import { AdGroupsPage } from "@/pages/ad-groups-page"
import { BiddingPage } from "@/pages/bidding-page"
import { LoginPage } from "@/pages/login-page"
import { SignupPage } from "@/pages/signup-page"

/** 로그인 필요. 세션 확인 중에는 빈 화면, 미로그인이면 /login 으로 (원래 경로를 state 로 전달) */
function ProtectedRoute() {
  const { user, ready } = useAccount()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    )
  }
  if (!user) {
    return (
      <Navigate
        to={routes.login}
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }
  return <Outlet />
}

function Layout() {
  const { pathname } = useLocation()
  const { account } = useAccount()
  const title = pages.find((p) => pathname.startsWith(p.path))?.title
  const updatedAt = account ? new Date(account.updatedAt) : null

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2" />
          <span className="text-sm font-medium">{title}</span>
          {updatedAt && (
            <span className="ml-auto text-xs text-muted-foreground">
              계정 정보{" "}
              {updatedAt.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              기준
            </span>
          )}
        </header>
        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={routes.login} element={<LoginPage />} />
        <Route path={routes.signup} element={<SignupPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to={routes.adGroups} replace />} />
            <Route path={routes.adGroups} element={<AdGroupsPage />} />
            <Route path={routes.bidding} element={<BiddingPage />} />
            <Route
              path="*"
              element={<Navigate to={routes.adGroups} replace />}
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
