import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { createSpotifyMcpHandler } from "./mcp-server";
import { SpotifyHandler } from "./spotify-handler";
import type { Env } from "./types";

const oauthProvider = new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: createSpotifyMcpHandler(),
  // biome-ignore lint/suspicious/noExplicitAny: SpotifyHandler (Hono app) is not assignable to OAuthProvider's defaultHandler type
  defaultHandler: SpotifyHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
  tokenExchangeCallback: async (options) => {
    return options.props as Record<string, string>;
  },
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Cloudflare Tunnel経由だとリクエストURLがhttp://になるため、
    // X-Forwarded-Protoヘッダーを元にhttps://に書き換える
    const proto = request.headers.get("x-forwarded-proto");
    if (proto === "https" && new URL(request.url).protocol === "http:") {
      const url = new URL(request.url);
      url.protocol = "https:";
      request = new Request(url.toString(), request);
    }
    return oauthProvider.fetch(request, env, ctx);
  },
};
