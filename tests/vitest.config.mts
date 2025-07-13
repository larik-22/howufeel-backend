import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  esbuild: {
    target: "esnext",
  },
  test: {
    setupFiles: [],
    poolOptions: {
      workers: {
        singleWorker: true,
        miniflare: {
          compatibilityFlags: ["experimental", "nodejs_compat", "export_commonjs_default"],
          bindings: {
            SMTP_HOST: "smtp.hostinger.com",
            SMTP_PORT: "465",
            SMTP_USER: "test@howufeelingtoday.online",
            SMTP_PASSWORD: "test-password",
          },
          kvNamespaces: ["TEMPLATES_KV"],
        },
      },
    },
  },
}); 