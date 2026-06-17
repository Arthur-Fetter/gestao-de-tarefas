import bcrypt from 'bcrypt'
import { GraphQLError } from 'graphql'
import { issueToken, requireAuth, type Context } from '../auth/index.js'
import { getUserByEmailWithHash, createUser, type Role } from '../db/users.js'

const BCRYPT_ROUNDS = 10

function authPayload(user: { id: string; email: string; name: string; role: string }, token: string) {
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  }
}

export const authResolvers = {
  Query: {
    me: (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context.user)
      return {
        id: user.userId,
        email: user.email,
        name: user.name,
        role: user.role.toUpperCase(),
      }
    },
  },
  Mutation: {
    register: async (_: unknown, { name, email, password, role }: { name: string; email: string; password: string; role?: string }) => {
      // Check if email already exists
      const existing = await getUserByEmailWithHash(email)
      if (existing) {
        throw new GraphQLError('Este email já está em uso', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

      const validRoles = ['ADMIN', 'USER', 'GUEST']
      const assignedRole = (role && validRoles.includes(role.toUpperCase()))
        ? role.toUpperCase() as Role
        : 'USER'

      const user = await createUser({
        name,
        email,
        role: assignedRole,
        passwordHash,
      })

      const token = await issueToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
      })

      return authPayload(user, token)
    },

    login: async (_: unknown, { email, password }: { email: string; password: string }) => {
      const user = await getUserByEmailWithHash(email)

      if (!user || !user.passwordHash) {
        throw new GraphQLError('Email ou senha inválidos', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        throw new GraphQLError('Email ou senha inválidos', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const token = await issueToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role.toLowerCase(),
      })

      return authPayload(user, token)
    },
  },
}
