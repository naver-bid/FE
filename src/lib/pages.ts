import { Gavel, LayoutList, type LucideIcon } from "lucide-react"

export const routes = {
  login: "/login",
  signup: "/signup",
  adGroups: "/ad-groups",
  bidding: "/bidding",
} as const

export type PageKey = "adGroups" | "bidding"

/** 사이드바 메뉴 (로그인 후 화면) */
export const pages: {
  key: PageKey
  path: string
  title: string
  icon: LucideIcon
}[] = [
  {
    key: "adGroups",
    path: routes.adGroups,
    title: "광고 그룹",
    icon: LayoutList,
  },
  { key: "bidding", path: routes.bidding, title: "자동 입찰", icon: Gavel },
]
