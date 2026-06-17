import type { AuthProvider, AuthResult } from '../port.js'

// Mock adapter for testing without a real OAuth2 provider.
// Simulates login by accepting any code and returning a configurable user.

interface MockUser {
  providerId: string
  email: string
  name: string
  suggestedRole: string
}

const MOCK_USERS: Record<string, MockUser> = {
  'admin': { providerId: 'mock-admin-001', email: 'admin@test.local', name: 'Admin User', suggestedRole: 'ADMIN' },
  'user':  { providerId: 'mock-user-001',  email: 'usuario@test.local', name: 'Regular User', suggestedRole: 'USER' },
  'guest': { providerId: 'mock-guest-001', email: 'convidado@test.local', name: 'Guest User', suggestedRole: 'GUEST' },
}

export class MockAuthAdapter implements AuthProvider {
  getAuthURL(state: string): string {
    // In mock mode, redirect directly to callback with a code
    return `/auth/callback?code=mock-admin&state=${state}`
  }

  async exchangeCode(code: string): Promise<AuthResult> {
    // The "code" is the mock user key (admin, user, guest)
    const mockKey = code.replace('mock-', '')
    const user = MOCK_USERS[mockKey]

    if (!user) {
      throw new Error(`Mock user not found for code: ${code}`)
    }

    return {
      providerId: user.providerId,
      email: user.email,
      name: user.name,
      accessToken: `mock-access-token-${mockKey}`,
      refreshToken: `mock-refresh-token-${mockKey}`,
      suggestedRole: user.suggestedRole,
    }
  }
}
