import { GraphQLError } from 'graphql'
import type { TokenPayload } from './jwt.js'

export function requireAuth(user: TokenPayload | null): TokenPayload {
  if (!user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return user
}

export function requireRole(user: TokenPayload | null, ...allowedRoles: string[]): TokenPayload {
  const authedUser = requireAuth(user)
  if (!allowedRoles.includes(authedUser.role)) {
    throw new GraphQLError(`Forbidden: requires one of [${allowedRoles.join(', ')}]`, {
      extensions: { code: 'FORBIDDEN' },
    })
  }
  return authedUser
}

export function isAdmin(user: TokenPayload): boolean {
  return user.role === 'admin'
}
