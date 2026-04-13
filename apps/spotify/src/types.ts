export interface Env {
  OAUTH_KV: KVNamespace;
  SPOTIFY_TOKENS: KVNamespace;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  OAUTH_PROVIDER: OAuthHelpers;
}

export interface OAuthHelpers {
  parseAuthRequest(request: Request): Promise<OAuthReqInfo>;
  lookupClient(clientId: string): Promise<ClientInfo | null>;
  completeAuthorization(options: {
    request: OAuthReqInfo;
    userId: string;
    metadata?: Record<string, unknown>;
    scope: string[];
    props: Record<string, unknown>;
  }): Promise<{ redirectTo: string }>;
}

export interface OAuthReqInfo {
  responseType: string;
  clientId: string;
  redirectUri: string;
  scope: string[];
  state: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

export interface ClientInfo {
  clientId: string;
  clientName?: string;
  redirectUris?: string[];
}

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export type SpotifyAuthProps = Record<string, string> & {
  userId: string;
};
