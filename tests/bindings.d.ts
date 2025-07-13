import type { D1Migration } from "cloudflare:test";

export type Env = {
  TEMPLATES_KV: KVNamespace;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  MIGRATIONS?: D1Migration[];
};

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}
