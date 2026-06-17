// HTTP client for the tarefas backend service

const TAREFAS_URL = process.env.TAREFAS_SERVICE_URL || 'http://localhost:9090'

export interface Task {
  id: string
  title: string
  description: string
  status: string
  assignedTo: string
  createdAt: string
  updatedAt: string
}

interface CreateTaskInput {
  title: string
  description: string
  status?: string
  assignedTo: string
}

interface UpdateTaskInput {
  title?: string
  description?: string
  status?: string
  assignedTo?: string
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${TAREFAS_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText })) as { error?: string }
    throw new Error(body.error || `HTTP ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function listTasksByUser(userId: string, token: string): Promise<Task[]> {
  return request<Task[]>(`/tasks?assignedTo=${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getTaskById(id: string, token: string): Promise<Task | null> {
  try {
    return await request<Task>(`/tasks/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (e) {
    if ((e as Error).message.includes('not found')) return null
    throw e
  }
}

export async function createTask(input: CreateTaskInput, token: string): Promise<Task> {
  return request<Task>('/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
}

export async function updateTask(id: string, input: UpdateTaskInput, token: string): Promise<Task> {
  return request<Task>(`/tasks/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
}

export async function deleteTask(id: string, token: string): Promise<boolean> {
  await request<void>(`/tasks/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return true
}
