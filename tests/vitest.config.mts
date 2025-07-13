import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  esbuild: {
    target: "esnext",
  },
  test: {
    setupFiles: [], // No database setup needed for mail tests
    poolOptions: {
      workers: {
        singleWorker: true,
        wrangler: {
          configPath: "../wrangler.jsonc",
        },
        miniflare: {
          compatibilityFlags: ["experimental", "nodejs_compat"],
          bindings: {
            // No database bindings needed
          },
        },
      },
    },
  },
}); 