import { createClient, cacheExchange, fetchExchange } from 'urql'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/'

function getToken(): string | null {
  return localStorage.getItem('gestao_tarefas_token')
}

export const client = createClient({
  url: API_URL,
  exchanges: [cacheExchange, fetchExchange],
  preferGetMethod: false,
  fetchOptions: () => {
    const token = getToken()
    return {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'apollo-require-preflight': 'true',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    }
  },
})
