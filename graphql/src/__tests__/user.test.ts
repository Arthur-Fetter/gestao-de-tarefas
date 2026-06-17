import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GraphQLError } from 'graphql'
import { userResolvers } from '../resolvers/user.js'

vi.mock('../db/users.js', () => ({
  getAllUsers: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  getUserByEmailWithHash: vi.fn(),
}))

vi.mock('../auth/index.js', () => ({
  requireAuth: vi.fn((user) => {
    if (!user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } })
    return user
  }),
  requireRole: vi.fn((user, ...roles) => {
    if (!user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } })
    if (!roles.includes(user.role)) throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } })
    return user
  }),
}))

import * as usersDb from '../db/users.js'

const mockUser = { id: 'user-1', name: 'Test User', email: 'test@test.com', role: 'USER' as const }
const adminCtx = { user: { userId: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin' }, token: 'token' }
const userCtx = { user: { userId: 'user-1', email: 'user@test.com', name: 'User', role: 'user' }, token: 'token' }
const anonCtx = { user: null, token: null }

beforeEach(() => vi.clearAllMocks())

// ---- users query ----

describe('users query', () => {
  it('returns users list for authenticated user', async () => {
    vi.mocked(usersDb.getAllUsers).mockResolvedValue([mockUser])

    const result = await userResolvers.Query.users(undefined, undefined, userCtx as any)

    expect(result).toHaveLength(1)
    expect(result[0].email).toBe('test@test.com')
  })

  it('throws when not authenticated', async () => {
    await expect(
      userResolvers.Query.users(undefined, undefined, anonCtx as any)
    ).rejects.toThrow(GraphQLError)
  })
})

// ---- createUser mutation ----

describe('createUser mutation', () => {
  it('allows admin to create a user', async () => {
    vi.mocked(usersDb.createUser).mockResolvedValue(mockUser)

    await userResolvers.Mutation.createUser(
      undefined,
      { input: { name: 'New', email: 'new@test.com', role: 'USER' } },
      adminCtx as any
    )

    expect(usersDb.createUser).toHaveBeenCalled()
  })

  it('throws for non-admin', async () => {
    await expect(
      userResolvers.Mutation.createUser(
        undefined,
        { input: { name: 'New', email: 'new@test.com', role: 'USER' } },
        userCtx as any
      )
    ).rejects.toThrow(GraphQLError)
  })
})

// ---- updateUser mutation ----

describe('updateUser mutation', () => {
  it('allows a user to update themselves', async () => {
    vi.mocked(usersDb.updateUser).mockResolvedValue({ ...mockUser, name: 'Updated' })

    const result = await userResolvers.Mutation.updateUser(
      undefined,
      { id: 'user-1', input: { name: 'Updated' } },
      userCtx as any
    )

    expect(result.name).toBe('Updated')
  })

  it('throws when a user tries to update someone else', async () => {
    await expect(
      userResolvers.Mutation.updateUser(
        undefined,
        { id: 'other-user', input: { name: 'Hacked' } },
        userCtx as any
      )
    ).rejects.toThrow(GraphQLError)
  })

  it('allows admin to update any user', async () => {
    vi.mocked(usersDb.updateUser).mockResolvedValue(mockUser)

    await userResolvers.Mutation.updateUser(
      undefined,
      { id: 'user-1', input: { name: 'By Admin' } },
      adminCtx as any
    )

    expect(usersDb.updateUser).toHaveBeenCalled()
  })
})

// ---- deleteUser mutation ----

describe('deleteUser mutation', () => {
  it('allows admin to delete a user', async () => {
    vi.mocked(usersDb.deleteUser).mockResolvedValue(true)

    const result = await userResolvers.Mutation.deleteUser(
      undefined, { id: 'user-1' }, adminCtx as any
    )

    expect(result).toBe(true)
  })

  it('throws for non-admin', async () => {
    await expect(
      userResolvers.Mutation.deleteUser(undefined, { id: 'user-1' }, userCtx as any)
    ).rejects.toThrow(GraphQLError)
  })
})
