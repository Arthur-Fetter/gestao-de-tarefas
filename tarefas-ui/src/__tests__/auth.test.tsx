import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../auth'

function TestConsumer() {
  const { user, token, isAdmin, isGuest } = useAuth()
  return (
    <div>
      <span data-testid="token">{token ?? 'none'}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <span data-testid="isAdmin">{String(isAdmin)}</span>
      <span data-testid="isGuest">{String(isGuest)}</span>
    </div>
  )
}

function LoginConsumer() {
  const { login, logout } = useAuth()
  return (
    <>
      <button onClick={() => login('test-token', { id: '1', email: 'a@b.com', name: 'A', role: 'ADMIN' })}>
        login
      </button>
      <button onClick={logout}>logout</button>
    </>
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('AuthProvider', () => {
  it('starts with no token when localStorage is empty', () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    expect(screen.getByTestId('token')).toHaveTextContent('none')
  })

  it('loads token from localStorage on mount', () => {
    localStorage.setItem('gestao_tarefas_token', 'existing-token')
    localStorage.setItem('gestao_tarefas_user', JSON.stringify({
      id: '1', email: 'a@b.com', name: 'A', role: 'USER'
    }))

    render(<AuthProvider><TestConsumer /></AuthProvider>)

    expect(screen.getByTestId('token')).toHaveTextContent('existing-token')
    expect(screen.getByTestId('email')).toHaveTextContent('a@b.com')
  })

  it('login stores token in state and localStorage', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
        <LoginConsumer />
      </AuthProvider>
    )

    act(() => screen.getByText('login').click())

    expect(screen.getByTestId('token')).toHaveTextContent('test-token')
    expect(screen.getByTestId('email')).toHaveTextContent('a@b.com')
    expect(localStorage.getItem('gestao_tarefas_token')).toBe('test-token')
  })

  it('logout clears token from state and localStorage', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
        <LoginConsumer />
      </AuthProvider>
    )

    act(() => screen.getByText('login').click())
    act(() => screen.getByText('logout').click())

    expect(screen.getByTestId('token')).toHaveTextContent('none')
    expect(localStorage.getItem('gestao_tarefas_token')).toBeNull()
  })

  it('isAdmin is true when role is ADMIN (case-insensitive)', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
        <LoginConsumer />
      </AuthProvider>
    )

    act(() => screen.getByText('login').click())

    expect(screen.getByTestId('isAdmin')).toHaveTextContent('true')
    expect(screen.getByTestId('isGuest')).toHaveTextContent('false')
  })
})
