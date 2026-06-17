import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GraphQLError } from 'graphql'
import { taskResolvers } from '../resolvers/task.js'

// Mock the tarefas datasource
vi.mock('../datasources/tarefas.js', () => ({
  listTasksByUser: vi.fn(),
  getTaskById: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}))

// Mock the users DB (for assignee resolution)
vi.mock('../db/users.js', () => ({
  getUserById: vi.fn().mockResolvedValue({ id: 'user-1', name: 'Test User', email: 'test@test.com', role: 'USER' }),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUserByEmailWithHash: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
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
  isAdmin: vi.fn((user) => user?.role === 'admin'),
}))

import * as tarefasApi from '../datasources/tarefas.js'

const mockTask = {
  id: 'task-1',
  title: 'Test Task',
  description: 'A description',
  status: 'pending',
  assignedTo: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const adminCtx = { user: { userId: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin' }, token: 'token' }
const userCtx = { user: { userId: 'user-1', email: 'user@test.com', name: 'User', role: 'user' }, token: 'token' }
const guestCtx = { user: { userId: 'guest-1', email: 'guest@test.com', name: 'Guest', role: 'guest' }, token: 'token' }
const anonCtx = { user: null, token: null }

beforeEach(() => {
  vi.clearAllMocks()
})

// ---- tasks query ----

describe('tasks query', () => {
  it('returns tasks for the authenticated user', async () => {
    vi.mocked(tarefasApi.listTasksByUser).mockResolvedValue([mockTask])

    const result = await taskResolvers.Query.tasks(undefined, {}, userCtx as any)

    expect(tarefasApi.listTasksByUser).toHaveBeenCalledWith('user-1', 'token')
    expect(result).toHaveLength(1)
  })

  it('allows admin to query another user\'s tasks', async () => {
    vi.mocked(tarefasApi.listTasksByUser).mockResolvedValue([mockTask])

    await taskResolvers.Query.tasks(undefined, { assignedTo: 'user-1' }, adminCtx as any)

    expect(tarefasApi.listTasksByUser).toHaveBeenCalledWith('user-1', 'token')
  })

  it('ignores assignedTo param for non-admin and uses own ID', async () => {
    vi.mocked(tarefasApi.listTasksByUser).mockResolvedValue([])

    await taskResolvers.Query.tasks(undefined, { assignedTo: 'some-other-user' }, userCtx as any)

    expect(tarefasApi.listTasksByUser).toHaveBeenCalledWith('user-1', 'token')
  })

  it('throws when not authenticated', async () => {
    await expect(
      taskResolvers.Query.tasks(undefined, {}, anonCtx as any)
    ).rejects.toThrow(GraphQLError)
  })
})

// ---- createTask mutation ----

describe('createTask mutation', () => {
  it('creates a task assigned to the caller', async () => {
    vi.mocked(tarefasApi.createTask).mockResolvedValue(mockTask)

    await taskResolvers.Mutation.createTask(
      undefined,
      { input: { title: 'Task', description: 'Desc' } },
      userCtx as any
    )

    expect(tarefasApi.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ assignedTo: 'user-1' }),
      'token'
    )
  })

  it('admin can assign task to another user', async () => {
    vi.mocked(tarefasApi.createTask).mockResolvedValue({ ...mockTask, assignedTo: 'user-2' })

    await taskResolvers.Mutation.createTask(
      undefined,
      { input: { title: 'Task', description: 'Desc', assignedTo: 'user-2' } },
      adminCtx as any
    )

    expect(tarefasApi.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ assignedTo: 'user-2' }),
      'token'
    )
  })

  it('throws for guest users', async () => {
    await expect(
      taskResolvers.Mutation.createTask(
        undefined,
        { input: { title: 'Task', description: 'Desc' } },
        guestCtx as any
      )
    ).rejects.toThrow(GraphQLError)
  })

  it('throws when not authenticated', async () => {
    await expect(
      taskResolvers.Mutation.createTask(
        undefined,
        { input: { title: 'Task', description: 'Desc' } },
        anonCtx as any
      )
    ).rejects.toThrow(GraphQLError)
  })
})

// ---- deleteTask mutation ----

describe('deleteTask mutation', () => {
  it('allows admin to delete a task', async () => {
    vi.mocked(tarefasApi.deleteTask).mockResolvedValue(true)

    const result = await taskResolvers.Mutation.deleteTask(
      undefined, { id: 'task-1' }, adminCtx as any
    )

    expect(result).toBe(true)
    expect(tarefasApi.deleteTask).toHaveBeenCalledWith('task-1', 'token')
  })

  it('throws for non-admin', async () => {
    await expect(
      taskResolvers.Mutation.deleteTask(undefined, { id: 'task-1' }, userCtx as any)
    ).rejects.toThrow(GraphQLError)
  })

  it('throws when not authenticated', async () => {
    await expect(
      taskResolvers.Mutation.deleteTask(undefined, { id: 'task-1' }, anonCtx as any)
    ).rejects.toThrow(GraphQLError)
  })
})
