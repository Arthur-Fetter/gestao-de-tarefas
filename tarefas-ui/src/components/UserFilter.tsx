import { useQuery } from 'urql'
import { USERS_QUERY } from '../graphql/operations'
import './UserFilter.css'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface UserFilterProps {
  selectedUserId: string
  currentUserId: string
  currentUserName: string
  isAdmin: boolean
  onChange: (userId: string) => void
}

export function UserFilter({ selectedUserId, currentUserId, currentUserName, isAdmin, onChange }: UserFilterProps) {
  const [{ data }] = useQuery<{ users: User[] }>({
    query: USERS_QUERY,
    pause: !isAdmin,
  })

  if (!isAdmin) {
    return (
      <div className="user-filter user-filter--readonly">
        <span className="user-filter__label">Minhas tarefas</span>
      </div>
    )
  }

  const users = data?.users ?? []
  // Other users excluding the current user (they're shown as first option)
  const otherUsers = users.filter(u => u.id !== currentUserId)

  return (
    <div className="user-filter">
      <label className="user-filter__label">Visualizando tarefas de:</label>
      <select
        className="user-filter__select"
        value={selectedUserId}
        onChange={e => onChange(e.target.value)}
      >
        <option value={currentUserId}>
          {currentUserName} (eu)
        </option>
        {otherUsers.map(u => (
          <option key={u.id} value={u.id} title={u.email}>
            {u.name} ({u.role})
          </option>
        ))}
      </select>
    </div>
  )
}
