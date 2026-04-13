// Supplement Cloudflare Env with secrets not captured by `wrangler types`
// (secrets cannot be declared in wrangler.jsonc and therefore are not auto-generated)
declare namespace Cloudflare {
  interface Env {
    GEMINI_API_KEY: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    COOKIE_ENCRYPTION_KEY: string;
  }
}
