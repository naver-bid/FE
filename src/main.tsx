import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AccountProvider } from "@/hooks/use-account"
import { OverlayProvider } from "overlay-kit"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <AccountProvider>
          <OverlayProvider>
            <App />
          </OverlayProvider>
        </AccountProvider>
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)
