import { getAllUsers, getUserById, createUser, updateUser, deleteUser, type Role } from '../db/users.js'
import { requireAuth, requireRole, type Context } from '../auth/index.js'

export const userResolvers = {
  Query: {
    users: async (_: unknown, __: unknown, context: Context) => {
      requireAuth(context.user)
      return getAllUsers()
    },
    user: async (_: unknown, { id }: { id: string }, context: Context) => {
      requireAuth(context.user)
      return getUserById(id)
    },
  },
  Mutation: {
    createUser: async (_: unknown, { input }: { input: { name: string; email: string; role: Role } }, context: Context) => {
      requireRole(context.user, 'admin')
      return createUser(input)
    },
    updateUser: async (_: unknown, { id, input }: { id: string; input: { name?: string; email?: string; role?: Role } }, context: Context) => {
      const user = requireAuth(context.user)
      if (user.role !== 'admin' && user.userId !== id) {
        requireRole(context.user, 'admin')
      }
      return updateUser(id, input)
    },
    deleteUser: async (_: unknown, { id }: { id: string }, context: Context) => {
      requireRole(context.user, 'admin')
      return deleteUser(id)
    },
  },
}
