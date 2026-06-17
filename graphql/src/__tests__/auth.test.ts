import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GraphQLError } from 'graphql'
import { authResolvers } from '../resolvers/auth.js'

// Mock the DB module
vi.mock('../db/users.js', () => ({
  getUserByEmailWithHash: vi.fn(),
  createUser: vi.fn(),
}))

// Mock bcrypt to skip slow hashing in tests
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn(),
  },
}))

// Mock JWT issuance
vi.mock('../auth/index.js', () => ({
  issueToken: vi.fn().mockResolvedValue('mock.jwt.token'),
  requireAuth: vi.fn((user) => {
    if (!user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } })
    return user
  }),
}))

import * as usersDb from '../db/users.js'
import bcrypt from 'bcrypt'

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@test.com',
  role: 'USER' as const,
  passwordHash: 'hashed_password',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---- register ----

describe('register', () => {
  it('creates a new user and returns a token', async () => {
    vi.mocked(usersDb.getUserByEmailWithHash).mockResolvedValue(undefined)
    vi.mocked(usersDb.createUser).mockResolvedValue(mockUser)

    const result = await authResolvers.Mutation.register(
      undefined, { name: 'Test User', email: 'test@test.com', password: 'secret123' }, undefined as any
    )

    expect(result.token).toBe('mock.jwt.token')
    expect(result.user.email).toBe('test@test.com')
    expect(usersDb.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@test.com', role: 'USER' })
    )
  })

  it('throws when email is already in use', async () => {
    vi.mocked(usersDb.getUserByEmailWithHash).mockResolvedValue(mockUser)

    await expect(
      authResolvers.Mutation.register(
        undefined, { name: 'X', email: 'test@test.com', password: 'secret' }, undefined as any
      )
    ).rejects.toThrow(GraphQLError)
  })

  it('assigns ADMIN role when specified', async () => {
    vi.mocked(usersDb.getUserByEmailWithHash).mockResolvedValue(undefined)
    vi.mocked(usersDb.createUser).mockResolvedValue({ ...mockUser, role: 'ADMIN' })

    await authResolvers.Mutation.register(
      undefined, { name: 'Admin', email: 'admin@test.com', password: 'secret', role: 'ADMIN' }, undefined as any
    )

    expect(usersDb.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'ADMIN' })
    )
  })

  it('defaults to USER role for unknown role value', async () => {
    vi.mocked(usersDb.getUserByEmailWithHash).mockResolvedValue(undefined)
    vi.mocked(usersDb.createUser).mockResolvedValue(mockUser)

    await authResolvers.Mutation.register(
      undefined, { name: 'X', email: 'x@test.com', password: 'secret', role: 'SUPERADMIN' }, undefined as any
    )

    expect(usersDb.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'USER' })
    )
  })
})

// ---- login ----

describe('login', () => {
  it('returns a token for valid credentials', async () => {
    vi.mocked(usersDb.getUserByEmailWithHash).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const result = await authResolvers.Mutation.login(
      undefined, { email: 'test@test.com', password: 'secret123' }, undefined as any
    )

    expect(result.token).toBe('mock.jwt.token')
    expect(result.user.email).toBe('test@test.com')
  })

  it('throws for unknown email', async () => {
    vi.mocked(usersDb.getUserByEmailWithHash).mockResolvedValue(undefined)

    await expect(
      authResolvers.Mutation.login(
        undefined, { email: 'nobody@test.com', password: 'secret' }, undefined as any
      )
    ).rejects.toThrow(GraphQLError)
  })

  it('throws for wrong password', async () => {
    vi.mocked(usersDb.getUserByEmailWithHash).mockResolvedValue(mockUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    await expect(
      authResolvers.Mutation.login(
        undefined, { email: 'test@test.com', password: 'wrong' }, undefined as any
      )
    ).rejects.toThrow(GraphQLError)
  })
})

// ---- me ----

describe('me', () => {
  it('returns the authenticated user', () => {
    const context = {
      user: { userId: 'user-1', email: 'test@test.com', name: 'Test', role: 'user' },
      token: 'token',
    }

    const result = authResolvers.Query.me(undefined, undefined, context as any)
    expect(result.email).toBe('test@test.com')
    expect(result.role).toBe('USER')
  })

  it('throws when not authenticated', () => {
    const context = { user: null, token: null }
    expect(() => authResolvers.Query.me(undefined, undefined, context as any)).toThrow(GraphQLError)
  })
})
