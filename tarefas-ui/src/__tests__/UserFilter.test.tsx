import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UserFilter } from '../components/UserFilter'

// Mock urql useQuery
vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{
    data: {
      users: [
        { id: 'user-1', name: 'Alice', email: 'alice@test.com', role: 'ADMIN' },
        { id: 'user-2', name: 'Bob', email: 'bob@test.com', role: 'USER' },
      ]
    },
    fetching: false,
    error: undefined,
  }]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
}))

vi.mock('../graphql/operations', () => ({
  USERS_QUERY: 'query Users { users { id name email role } }',
}))

describe('UserFilter', () => {
  it('shows "Minhas tarefas" for non-admin', () => {
    render(
      <UserFilter
        selectedUserId="user-1"
        currentUserId="user-1"
        currentUserName="Alice"
        isAdmin={false}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Minhas tarefas')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows dropdown for admin', () => {
    render(
      <UserFilter
        selectedUserId="user-1"
        currentUserId="user-1"
        currentUserName="Alice"
        isAdmin={true}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('admin dropdown has current user as first option', () => {
    render(
      <UserFilter
        selectedUserId="user-1"
        currentUserId="user-1"
        currentUserName="Alice"
        isAdmin={true}
        onChange={vi.fn()}
      />
    )
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveTextContent('Alice (eu)')
  })

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn()
    render(
      <UserFilter
        selectedUserId="user-1"
        currentUserId="user-1"
        currentUserName="Alice"
        isAdmin={true}
        onChange={onChange}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'user-2' } })
    expect(onChange).toHaveBeenCalledWith('user-2')
  })
})
