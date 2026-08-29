import { Gavel, LayoutList, type LucideIcon } from "lucide-react"

export type PageKey = "basic" | "bidding"

export const pages: { key: PageKey; title: string; icon: LucideIcon }[] = [
  { key: "basic", title: "기본 화면", icon: LayoutList },
  { key: "bidding", title: "자동 입찰", icon: Gavel },
]
