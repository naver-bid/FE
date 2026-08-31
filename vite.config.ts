import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  // 백엔드(FastAPI) 주소. 로컬 개발 서버 없이 항상 배포된 백엔드(vercel.json 과 동일)를 본다.
  // 다른 서버를 쓰려면 .env 의 API_URL 로 바꿀 수 있다.
  const apiUrl = env.API_URL || "https://naver-autobid-api.fly.dev"

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": { target: apiUrl, changeOrigin: true },
      },
    },
  }
})
