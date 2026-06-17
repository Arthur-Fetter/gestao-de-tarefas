import { getDb } from './index.js'
import { randomUUID } from 'crypto'

export type Role = 'ADMIN' | 'USER' | 'GUEST'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  providerId?: string
}

interface DbUser {
  id: string
  name: string
  email: string
  role: string
  provider_id: string | null
  password_hash: string | null
  created_at: Date
  updated_at: Date
}

function toUser(row: DbUser): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as Role,
    providerId: row.provider_id ?? undefined,
  }
}

export async function getAllUsers(): Promise<User[]> {
  const sql = getDb()
  const rows = await sql<DbUser[]>`SELECT * FROM users ORDER BY created_at ASC`
  return rows.map(toUser)
}

export async function getUserById(id: string): Promise<User | undefined> {
  const sql = getDb()
  const rows = await sql<DbUser[]>`SELECT * FROM users WHERE id = ${id} LIMIT 1`
  return rows[0] ? toUser(rows[0]) : undefined
}

export async function getUserByProviderId(providerId: string): Promise<User | undefined> {
  const sql = getDb()
  const rows = await sql<DbUser[]>`SELECT * FROM users WHERE provider_id = ${providerId} LIMIT 1`
  return rows[0] ? toUser(rows[0]) : undefined
}

export async function getUserByEmailWithHash(email: string): Promise<(User & { passwordHash: string | null }) | undefined> {
  const sql = getDb()
  const rows = await sql<DbUser[]>`SELECT * FROM users WHERE email = ${email} LIMIT 1`
  if (!rows[0]) return undefined
  return { ...toUser(rows[0]), passwordHash: rows[0].password_hash }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const sql = getDb()
  const rows = await sql<DbUser[]>`SELECT * FROM users WHERE email = ${email} LIMIT 1`
  return rows[0] ? toUser(rows[0]) : undefined
}

export async function createUser(input: {
  name: string
  email: string
  role: Role
  providerId?: string
  passwordHash?: string
}): Promise<User> {
  const sql = getDb()
  const id = randomUUID()
  const rows = await sql<DbUser[]>`
    INSERT INTO users (id, name, email, role, provider_id, password_hash)
    VALUES (${id}, ${input.name}, ${input.email}, ${input.role}, ${input.providerId ?? null}, ${input.passwordHash ?? null})
    RETURNING *
  `
  return toUser(rows[0])
}

export async function updateUser(id: string, input: { name?: string; email?: string; role?: Role }): Promise<User> {
  const sql = getDb()
  const existing = await getUserById(id)
  if (!existing) throw new Error(`User ${id} not found`)

  const rows = await sql<DbUser[]>`
    UPDATE users SET
      name       = ${input.name ?? existing.name},
      email      = ${input.email ?? existing.email},
      role       = ${input.role ?? existing.role},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return toUser(rows[0])
}

export async function deleteUser(id: string): Promise<boolean> {
  const sql = getDb()
  const result = await sql`DELETE FROM users WHERE id = ${id}`
  return result.count > 0
}
