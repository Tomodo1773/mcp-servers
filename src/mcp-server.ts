import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  search,
  formatSearchResults,
  getValidToken,
  refreshAccessToken,
  SpotifyApiError,
} from "./spotify-api";
import type { Env, SpotifyAuthProps } from "./types";

export class SpotifyMcpServer extends McpAgent<Env, unknown, SpotifyAuthProps> {
  server = new McpServer({
    name: "Spotify",
    version: "1.0.0",
  });

  async init() {
    this.server.tool(
      "spotify_search",
      "Search Spotify for tracks, albums, artists, or playlists",
      {
        query: z.string().describe("Search query"),
        type: z
          .enum(["track", "album", "artist", "playlist"])
          .default("track")
          .describe("Type of content to search for"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(10)
          .default(5)
          .describe("Number of results (max 10)"),
      },
      async ({ query, type, limit }) => {
        const userId = this.props?.userId;
        if (!userId) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: Not authenticated. Please reconnect to authorize with Spotify.",
              },
            ],
          };
        }

        try {
          let token = await getValidToken(this.env, userId);
          let result;

          try {
            result = await search(token, query, type, limit);
          } catch (err) {
            // If 401, try refreshing token once
            if (err instanceof SpotifyApiError && err.status === 401) {
              token = await refreshAccessToken(this.env, userId);
              result = await search(token, query, type, limit);
            } else {
              throw err;
            }
          }

          const formatted = formatSearchResults(result, type);
          return {
            content: [{ type: "text" as const, text: formatted }],
          };
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Unknown error occurred";
          return {
            content: [{ type: "text" as const, text: `Error: ${message}` }],
          };
        }
      }
    );
  }
}
