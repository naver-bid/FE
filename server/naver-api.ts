/**
 * 네이버 검색광고 API 프록시 (Vite dev 미들웨어).
 *
 * 브라우저는 CORS와 Secret Key 노출 때문에 api.searchad.naver.com을 직접 호출할 수 없다.
 * 이 플러그인이 /api/* 요청을 받아 HMAC 서명을 붙여 네이버에 전달한다.
 *
 * 인증 정보는 프로세스 메모리에만 보관한다(브라우저에 저장하지 않음).
 * .env 의 NAVER_API_KEY / NAVER_SECRET_KEY / NAVER_CUSTOMER_ID 가 있으면 초기값으로 사용.
 */
import { createHmac } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import type { IncomingMessage, ServerResponse } from "node:http"
import path from "node:path"
import type { Plugin } from "vite"

const NAVER_BASE_URL = "https://api.searchad.naver.com"
const DATA_DIR = path.resolve(process.cwd(), ".data")
const ADGROUPS_FILE = path.join(DATA_DIR, "adgroups.json")

interface Credentials {
  apiKey: string
  secretKey: string
  customerId: string
}

interface AdGroup {
  id: string
  campaignId: string
  campaignName: string
  name: string
  siteUrl: string
  syncEnabled: boolean
}

class NaverApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

let credentials: Credentials | null = null

function credentialsFromEnv(env: Record<string, string | undefined>): Credentials | null {
  const { NAVER_API_KEY, NAVER_SECRET_KEY, NAVER_CUSTOMER_ID } = env
  if (NAVER_API_KEY && NAVER_SECRET_KEY && NAVER_CUSTOMER_ID) {
    return { apiKey: NAVER_API_KEY, secretKey: NAVER_SECRET_KEY, customerId: NAVER_CUSTOMER_ID }
  }
  return null
}

// ---------- 네이버 호출 ----------

function sign(secretKey: string, timestamp: string, method: string, uri: string) {
  return createHmac("sha256", secretKey).update(`${timestamp}.${method}.${uri}`).digest("base64")
}

async function naverFetch<T>(
  creds: Credentials,
  method: "GET" | "POST" | "PUT" | "DELETE",
  uri: string,
  query?: Record<string, string>,
  body?: unknown
): Promise<T> {
  const timestamp = Date.now().toString()
  const url = new URL(NAVER_BASE_URL + uri)
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v)

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Timestamp": timestamp,
      "X-API-KEY": creds.apiKey,
      "X-Customer": creds.customerId,
      "X-Signature": sign(creds.secretKey, timestamp, method, uri),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await res.text()
  let json: unknown
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }

  console.log(`[naver] ${method} ${uri} -> ${res.status}`)
  if (!res.ok) {
    const detail =
      json && typeof json === "object" && "title" in json
        ? String((json as { title: unknown }).title)
        : text.slice(0, 200)
    throw new NaverApiError(res.status, `네이버 API ${res.status}: ${detail}`, json)
  }
  return json as T
}

// ---------- 네이버 응답 타입 (필요한 필드만) ----------

interface NaverCampaign {
  nccCampaignId: string
  name: string
  campaignTp: string
  userLock: boolean
}
interface NaverAdGroup {
  nccAdgroupId: string
  nccCampaignId: string
  name: string
  pcChannelId?: string
  mobileChannelId?: string
  userLock: boolean
}
interface NaverChannel {
  nccBusinessChannelId: string
  channelTp: string
  channelKey: string
  name?: string
}
interface NaverBizmoney {
  customerId?: number
  bizmoney?: number
}
interface NaverCustomerLink {
  managerLoginId?: string
  clientLoginId?: string
  managerCustomerId?: number
  clientCustomerId?: number
}

// ---------- 도메인 로직 ----------

async function fetchAccount(creds: Credentials) {
  // 인증 확인 겸 가장 가벼운 조회. 실패하면 키가 틀린 것.
  const [bizmoney, links] = await Promise.all([
    naverFetch<NaverBizmoney>(creds, "GET", "/billing/bizmoney").catch((e: NaverApiError) => {
      if (e.status === 401 || e.status === 403) throw e
      console.warn("[naver] bizmoney 조회 실패 (무시):", e.message)
      return null
    }),
    naverFetch<NaverCustomerLink[]>(creds, "GET", "/customer-links", { type: "MYCLIENTS" }).catch(
      (e: NaverApiError) => {
        if (e.status === 401 || e.status === 403) throw e
        return []
      }
    ),
  ])

  const myId = Number(creds.customerId)
  const link = links.find((l) => l.managerCustomerId === myId || l.clientCustomerId === myId)
  const loginId =
    (link?.managerCustomerId === myId ? link.managerLoginId : link?.clientLoginId) ??
    links[0]?.managerLoginId ??
    creds.customerId

  return {
    customerId: creds.customerId,
    loginId,
    balance: bizmoney?.bizmoney ?? null,
    spent: null as number | null, // TODO: /stats 또는 /billing/bizmoney/cost 로 기간 소진액 조회
    updatedAt: new Date().toISOString(),
  }
}

async function loadStoredGroups(): Promise<AdGroup[]> {
  try {
    return JSON.parse(await readFile(ADGROUPS_FILE, "utf8")) as AdGroup[]
  } catch {
    return []
  }
}

async function saveStoredGroups(groups: AdGroup[]) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(ADGROUPS_FILE, JSON.stringify(groups, null, 2))
}

async function syncAccount(creds: Credentials) {
  const [campaigns, adgroups, channels] = await Promise.all([
    naverFetch<NaverCampaign[]>(creds, "GET", "/ncc/campaigns"),
    naverFetch<NaverAdGroup[]>(creds, "GET", "/ncc/adgroups"),
    naverFetch<NaverChannel[]>(creds, "GET", "/ncc/channels"),
  ])

  const campaignById = new Map(campaigns.map((c) => [c.nccCampaignId, c]))
  const channelById = new Map(channels.map((c) => [c.nccBusinessChannelId, c]))
  const previous = new Set((await loadStoredGroups()).filter((g) => g.syncEnabled).map((g) => g.id))

  const groups: AdGroup[] = adgroups
    .map((g) => {
      const channel =
        (g.mobileChannelId && channelById.get(g.mobileChannelId)) ||
        (g.pcChannelId && channelById.get(g.pcChannelId)) ||
        null
      return {
        id: g.nccAdgroupId,
        campaignId: g.nccCampaignId,
        campaignName: campaignById.get(g.nccCampaignId)?.name ?? g.nccCampaignId,
        name: g.name,
        siteUrl: channel?.channelKey ?? "",
        syncEnabled: previous.has(g.nccAdgroupId),
      }
    })
    .sort((a, b) => a.campaignName.localeCompare(b.campaignName, "ko") || a.name.localeCompare(b.name, "ko"))

  await saveStoredGroups(groups)
  return { campaigns: campaigns.length, adGroups: groups.length, syncedAt: new Date().toISOString() }
}

// ---------- HTTP 유틸 ----------

function readJson<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let data = ""
    req.on("data", (chunk) => (data += chunk))
    req.on("end", () => {
      try {
        resolve((data ? JSON.parse(data) : {}) as T)
      } catch (e) {
        reject(e)
      }
    })
    req.on("error", reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.end(JSON.stringify(body))
}

function requireCredentials() {
  if (!credentials) throw new NaverApiError(401, "계정이 연결되지 않았습니다.")
  return credentials
}

// ---------- 라우팅 ----------

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost")
  const route = `${req.method} ${url.pathname}`

  if (route === "POST /api/auth/login") {
    const body = await readJson<Partial<Credentials>>(req)
    const { apiKey, secretKey, customerId } = body
    if (!apiKey || !secretKey || !customerId) {
      throw new NaverApiError(400, "API Key, Secret Key, Customer ID를 모두 입력하세요.")
    }
    const creds = { apiKey, secretKey, customerId }
    const account = await fetchAccount(creds)
    credentials = creds
    return sendJson(res, 200, account)
  }

  if (route === "GET /api/auth/me") {
    if (!credentials) return sendJson(res, 200, null)
    return sendJson(res, 200, await fetchAccount(credentials))
  }

  if (route === "POST /api/auth/logout") {
    credentials = null
    return sendJson(res, 200, { ok: true })
  }

  if (route === "POST /api/sync/account") {
    return sendJson(res, 200, await syncAccount(requireCredentials()))
  }

  if (route === "GET /api/adgroups") {
    requireCredentials()
    return sendJson(res, 200, await loadStoredGroups())
  }

  const patch = url.pathname.match(/^\/api\/adgroups\/([^/]+)$/)
  if (req.method === "PATCH" && patch) {
    requireCredentials()
    const id = decodeURIComponent(patch[1])
    const body = await readJson<{ syncEnabled?: boolean }>(req)
    const groups = await loadStoredGroups()
    const idx = groups.findIndex((g) => g.id === id)
    if (idx < 0) throw new NaverApiError(404, "그룹을 찾을 수 없습니다.")
    groups[idx] = { ...groups[idx], syncEnabled: body.syncEnabled ?? groups[idx].syncEnabled }
    await saveStoredGroups(groups)
    return sendJson(res, 200, groups[idx])
  }

  throw new NaverApiError(404, `알 수 없는 경로: ${route}`)
}

export function naverApiPlugin(): Plugin {
  return {
    name: "naver-api-proxy",
    configureServer(server) {
      credentials = credentialsFromEnv(process.env)
      if (credentials) console.log("[naver] .env 의 인증 정보로 시작합니다.")

      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next()
        handle(req, res).catch((err: unknown) => {
          const status = err instanceof NaverApiError ? err.status : 500
          const message = err instanceof Error ? err.message : String(err)
          if (status >= 500) console.error("[naver]", err)
          sendJson(res, status, { error: message })
        })
      })
    },
  }
}
