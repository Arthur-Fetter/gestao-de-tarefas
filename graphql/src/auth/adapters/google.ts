import type { AuthProvider, AuthResult } from '../port.js'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

export class GoogleAuthAdapter implements AuthProvider {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.redirectUri = redirectUri
  }

  getAuthURL(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return `${GOOGLE_AUTH_URL}?${params.toString()}`
  }

  async exchangeCode(code: string): Promise<AuthResult> {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      throw new Error(`Token exchange failed: ${error}`)
    }

    const tokens = await tokenResponse.json() as {
      access_token: string
      refresh_token?: string
      id_token: string
    }

    // Get user info
    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Google')
    }

    const userInfo = await userInfoResponse.json() as {
      sub: string
      email: string
      name: string
    }

    return {
      providerId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    }
  }
}
