import * as tarefasApi from '../datasources/tarefas.js'
import { getUserById } from '../db/users.js'
import { requireAuth, requireRole, isAdmin, type Context } from '../auth/index.js'
import { GraphQLError } from 'graphql'

async function withAssignee(task: tarefasApi.Task) {
  const user = await getUserById(task.assignedTo)
  return {
    ...task,
    assigneeName: user?.name ?? null,
    assigneeEmail: user?.email ?? null,
  }
}

export const taskResolvers = {
  Query: {
    tasks: async (_: unknown, { assignedTo }: { assignedTo?: string }, context: Context) => {
      const caller = requireAuth(context.user)

      // Determine which user's tasks to fetch
      let targetUserId: string
      if (assignedTo && isAdmin(caller)) {
        // Admin can query any user's tasks
        targetUserId = assignedTo
      } else {
        // Everyone else always sees their own tasks
        targetUserId = caller.userId
      }

      const tasks = await tarefasApi.listTasksByUser(targetUserId, context.token!)
      return Promise.all(tasks.map(withAssignee))
    },

    task: async (_: unknown, { id }: { id: string }, context: Context) => {
      requireAuth(context.user)
      const task = await tarefasApi.getTaskById(id, context.token!)
      if (!task) return null
      return withAssignee(task)
    },
  },

  Mutation: {
    createTask: async (_: unknown, { input }: { input: { title: string; description: string; status?: string; assignedTo?: string } }, context: Context) => {
      const caller = requireRole(context.user, 'admin', 'user')

      // Admin can assign to anyone; others always assign to themselves
      const assignedTo = (input.assignedTo && isAdmin(caller))
        ? input.assignedTo
        : caller.userId

      const task = await tarefasApi.createTask({
        title: input.title,
        description: input.description,
        status: input.status,
        assignedTo,
      }, context.token!)
      return withAssignee(task)
    },

    updateTask: async (_: unknown, { id, input }: { id: string; input: { title?: string; description?: string; status?: string; assignedTo?: string } }, context: Context) => {
      const caller = requireRole(context.user, 'admin', 'user')

      // Only admins can reassign
      const updateInput = {
        title: input.title,
        description: input.description,
        status: input.status,
        assignedTo: (input.assignedTo && isAdmin(caller)) ? input.assignedTo : undefined,
      }

      const task = await tarefasApi.updateTask(id, updateInput, context.token!)
      return withAssignee(task)
    },

    deleteTask: async (_: unknown, { id }: { id: string }, context: Context) => {
      const caller = requireAuth(context.user)
      if (!isAdmin(caller)) {
        throw new GraphQLError('Apenas administradores podem remover tarefas', {
          extensions: { code: 'FORBIDDEN' },
        })
      }
      return tarefasApi.deleteTask(id, context.token!)
    },
  },
}
