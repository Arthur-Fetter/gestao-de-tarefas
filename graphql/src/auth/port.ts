// AuthProvider port — abstracts the OAuth2 identity provider
// Implement this interface for Google, Microsoft, GitHub, etc.

export interface AuthResult {
  providerId: string    // unique user ID from the provider (e.g., Google's sub)
  email: string
  name: string
  accessToken: string   // provider's access token (for calendar API, etc.)
  refreshToken?: string // for long-lived access to provider APIs
  suggestedRole?: string // optional: only used by mock adapter for seeding test roles
}

export interface AuthProvider {
  // Returns the URL to redirect the user to for login
  getAuthURL(state: string): string

  // Exchanges an authorization code for user info + tokens
  exchangeCode(code: string): Promise<AuthResult>
}
