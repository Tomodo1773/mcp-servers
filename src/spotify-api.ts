import type { Env, SpotifyTokens } from "./types";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export async function search(
  token: string,
  query: string,
  type: string,
  limit: number
): Promise<SpotifySearchResult> {
  const params = new URLSearchParams({ q: query, type, limit: String(limit) });
  const res = await fetch(`${SPOTIFY_API_BASE}/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new SpotifyApiError(res.status, errorBody);
  }
  return res.json();
}

export async function refreshAccessToken(
  env: Env,
  userId: string
): Promise<string> {
  const stored = await env.SPOTIFY_TOKENS.get<SpotifyTokens>(userId, "json");
  if (!stored?.refresh_token) {
    throw new Error("No refresh token available. Re-authorization required.");
  }

  const credentials = btoa(
    `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
  );
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: stored.refresh_token,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${errorBody}`);
  }

  const data: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  } = await res.json();

  const updated: SpotifyTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? stored.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  await env.SPOTIFY_TOKENS.put(userId, JSON.stringify(updated));
  return updated.access_token;
}

export async function getValidToken(
  env: Env,
  userId: string
): Promise<string> {
  const stored = await env.SPOTIFY_TOKENS.get<SpotifyTokens>(userId, "json");
  if (!stored) {
    throw new Error("No Spotify tokens found. Re-authorization required.");
  }

  // Refresh if token expires within 5 minutes
  if (stored.expires_at - Date.now() < 5 * 60 * 1000) {
    return refreshAccessToken(env, userId);
  }
  return stored.access_token;
}

export function formatSearchResults(
  data: SpotifySearchResult,
  type: string
): string {
  const lines: string[] = [];

  if (type === "track" && data.tracks) {
    for (const t of data.tracks.items) {
      const artists = t.artists.map((a: SpotifyArtist) => a.name).join(", ");
      lines.push(`${t.name} - ${artists} (${t.album.name}) [spotify:track:${t.id}]`);
    }
  }

  if (type === "album" && data.albums) {
    for (const a of data.albums.items) {
      const artists = a.artists.map((ar: SpotifyArtist) => ar.name).join(", ");
      const year = a.release_date?.substring(0, 4) ?? "Unknown";
      lines.push(`${a.name} - ${artists} (${year}) [spotify:album:${a.id}]`);
    }
  }

  if (type === "artist" && data.artists) {
    for (const a of data.artists.items) {
      const genres = a.genres?.length ? a.genres.join(", ") : "N/A";
      lines.push(`${a.name} (${genres}) [spotify:artist:${a.id}]`);
    }
  }

  if (type === "playlist" && data.playlists) {
    for (const p of data.playlists.items) {
      const owner = p.owner?.display_name ?? "Unknown";
      lines.push(
        `${p.name} by ${owner} (${p.tracks.total} tracks) [spotify:playlist:${p.id}]`
      );
    }
  }

  return lines.length > 0 ? lines.join("\n") : "No results found.";
}

export class SpotifyApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`Spotify API error: ${status}`);
  }
}

// Type definitions for Spotify API responses
interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
}

interface SpotifySearchResult {
  tracks?: {
    items: Array<{
      id: string;
      name: string;
      artists: SpotifyArtist[];
      album: { name: string };
    }>;
  };
  albums?: {
    items: Array<{
      id: string;
      name: string;
      artists: SpotifyArtist[];
      release_date?: string;
    }>;
  };
  artists?: {
    items: SpotifyArtist[];
  };
  playlists?: {
    items: Array<{
      id: string;
      name: string;
      owner: { display_name?: string };
      tracks: { total: number };
    }>;
  };
}
