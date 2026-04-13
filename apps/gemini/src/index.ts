import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { GoogleGenAI } from "@google/genai";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { fetchUrlSummary, generateImage, transcribeYoutube } from "./gemini";
import { GitHubHandler } from "./github-handler";
import type { Props } from "./utils";

export type { Props };

export class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "gemini-mcp",
    version: "0.1.0",
  });

  async init() {
    const ai = new GoogleGenAI({ apiKey: this.env.GEMINI_API_KEY });

    this.server.tool(
      "fetch_url",
      "指定した URL の内容を Gemini が取得し、日本語で要約します。",
      { url: z.string().url().describe("要約したいページの URL") },
      async ({ url }) => {
        const text = await fetchUrlSummary(ai, url);
        return { content: [{ type: "text", text }] };
      },
    );

    this.server.tool(
      "transcribe_youtube",
      "YouTube 動画の URL を受け取り、Gemini が動画を文字起こしします。",
      { url: z.string().url().describe("文字起こしする YouTube 動画の URL") },
      async ({ url }) => {
        const text = await transcribeYoutube(ai, url);
        return { content: [{ type: "text", text }] };
      },
    );

    this.server.tool(
      "generate_image",
      "Nano Banana Pro (gemini-3-pro-image-preview) でテキストから画像を生成し、R2 に保存して URL を返します。",
      { prompt: z.string().min(1).describe("生成したい画像の説明") },
      async ({ prompt }) => {
        const { base64, mimeType } = await generateImage(ai, prompt);
        const ext = mimeType.split("/")[1] ?? "png";
        const key = `${crypto.randomUUID()}.${ext}`;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        await this.env.IMAGES.put(key, bytes, {
          httpMetadata: { contentType: mimeType },
        });
        return {
          content: [
            { type: "text", text: `${this.env.PUBLIC_BASE_URL}/images/${key}` },
          ],
        };
      },
    );
  }
}

export default new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: MyMCP.serve("/mcp") as any,
  defaultHandler: GitHubHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
