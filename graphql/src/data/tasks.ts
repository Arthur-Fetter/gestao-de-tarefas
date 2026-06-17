export interface Task {
  id: string
  title: string
  description: string
  done: boolean
}

let nextId = 5

let tasks: Task[] = [
  { id: '1', title: 'Task A', description: 'Description of task A', done: false },
  { id: '2', title: 'Task B', description: 'Description of task B', done: false },
  { id: '3', title: 'Task C', description: 'Description of task C', done: true },
  { id: '4', title: 'Task D', description: 'Description of task D', done: false },
]

export function getAllTasks(): Task[] {
  return tasks
}

export function getTaskById(id: string): Task | undefined {
  return tasks.find(t => t.id === id)
}

export function createTask(input: { title: string; description: string; done: boolean }): Task {
  const task: Task = { id: String(nextId++), ...input }
  tasks.push(task)
  return task
}

export function updateTask(id: string, input: { title?: string; description?: string; done?: boolean }): Task {
  const index = tasks.findIndex(t => t.id === id)
  if (index === -1) throw new Error(`Task ${id} not found`)
  tasks[index] = { ...tasks[index], ...input }
  return tasks[index]
}

export function deleteTask(id: string): boolean {
  const index = tasks.findIndex(t => t.id === id)
  if (index === -1) return false
  tasks.splice(index, 1)
  return true
}
