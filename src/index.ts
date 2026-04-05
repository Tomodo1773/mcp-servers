import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { SpotifyHandler } from "./spotify-handler";
import { SpotifyMcpServer } from "./mcp-server";

export { SpotifyMcpServer };

export default new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: SpotifyMcpServer.serve("/mcp"),
  defaultHandler: SpotifyHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
  tokenExchangeCallback: async (options) => {
    return options.props as Record<string, string>;
  },
});
