import { SignJWT, jwtVerify } from 'jose'

export interface TokenPayload {
  userId: string
  email: string
  name: string
  role: string
}

export interface Context {
  user: TokenPayload | null
  token: string | null  // raw JWT for forwarding to backend services
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production'
)
const JWT_ISSUER = 'gestao-tarefas'
const JWT_EXPIRATION = '1h'

export async function issueToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setSubject(payload.userId)
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET)
}

export async function validateToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    })

    return {
      userId: payload.sub || '',
      email: (payload.email as string) || '',
      name: (payload.name as string) || '',
      role: (payload.role as string) || 'guest',
    }
  } catch {
    return null
  }
}

export async function authenticateRequest(authHeader: string | undefined): Promise<TokenPayload | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return validateToken(authHeader.slice(7))
}
