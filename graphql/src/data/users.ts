export type Role = 'ADMIN' | 'USER' | 'GUEST'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  providerId?: string  // OAuth2 provider's unique user ID
}

let nextId = 4

let users: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', providerId: 'mock-admin-001' },
  { id: '2', name: 'Regular User', email: 'user@example.com', role: 'USER', providerId: 'mock-user-001' },
  { id: '3', name: 'Guest User', email: 'guest@example.com', role: 'GUEST', providerId: 'mock-guest-001' },
]

export function getAllUsers(): User[] {
  return users
}

export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id)
}

export function getUserByProviderId(providerId: string): User | undefined {
  return users.find(u => u.providerId === providerId)
}

export function createUser(input: { name: string; email: string; role: Role; providerId?: string }): User {
  const user: User = { id: String(nextId++), ...input }
  users.push(user)
  return user
}

export function updateUser(id: string, input: { name?: string; email?: string; role?: Role }): User {
  const index = users.findIndex(u => u.id === id)
  if (index === -1) throw new Error(`User ${id} not found`)
  users[index] = { ...users[index], ...input }
  return users[index]
}

export function deleteUser(id: string): boolean {
  const index = users.findIndex(u => u.id === id)
  if (index === -1) return false
  users.splice(index, 1)
  return true
}
