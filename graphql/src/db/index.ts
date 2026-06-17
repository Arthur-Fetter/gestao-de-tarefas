import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://tarefas:tarefas@localhost:5432/tarefas'

let _sql: ReturnType<typeof postgres> | null = null

export function getDb(): ReturnType<typeof postgres> {
  if (!_sql) {
    _sql = postgres(DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
    })
  }
  return _sql
}

export async function runMigrations(): Promise<void> {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            VARCHAR(36) PRIMARY KEY,
      name          VARCHAR(255) NOT NULL,
      email         VARCHAR(255) NOT NULL UNIQUE,
      role          VARCHAR(50) NOT NULL DEFAULT 'USER',
      provider_id   VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255),
      created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider_id)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `
  // Add password_hash column if it doesn't exist (for existing deployments)
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
  `
  console.log('User migrations applied')
}
