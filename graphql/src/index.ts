import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { resolvers } from './resolvers/index.js'
import { authenticateRequest, type Context } from './auth/index.js'
import { runMigrations } from './db/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const projectRoot = join(__dirname, '..')
const schemaDir = join(projectRoot, 'src', 'schema')

const taskTypeDefs = readFileSync(join(schemaDir, 'task.graphql'), 'utf-8')
const userTypeDefs = readFileSync(join(schemaDir, 'user.graphql'), 'utf-8')
const authTypeDefs = readFileSync(join(schemaDir, 'auth.graphql'), 'utf-8')
const typeDefs = mergeTypeDefs([taskTypeDefs, userTypeDefs, authTypeDefs])

// Run database migrations
await runMigrations()

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
  introspection: true,
})

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }): Promise<Context> => {
    const authHeader = req.headers.authorization
    const user = await authenticateRequest(authHeader)
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    return { user, token }
  },
})

console.log(`GraphQL gateway running at ${url}`)
