import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

import { naverApiPlugin } from "./server/naver-api.ts"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // NAVER_* 는 VITE_ 접두사가 없어 클라이언트 번들에는 포함되지 않는다. 서버 플러그인만 사용.
  Object.assign(process.env, loadEnv(mode, process.cwd(), "NAVER_"))

  return {
    plugins: [react(), tailwindcss(), naverApiPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
