import { mergeResolvers } from '@graphql-tools/merge'
import { taskResolvers } from './task.js'
import { userResolvers } from './user.js'
import { authResolvers } from './auth.js'

export const resolvers = mergeResolvers([taskResolvers, userResolvers, authResolvers])
