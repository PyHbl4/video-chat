import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    setupFiles: [],
    coverage: {
      enabled: false
    }
  },
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
      "@video-chat/contracts": new URL("../../packages/contracts/src/index.ts", import.meta.url).pathname,
      "@video-chat/web-auth": new URL("../../packages/web-auth/src/index.ts", import.meta.url).pathname
    }
  }
})
