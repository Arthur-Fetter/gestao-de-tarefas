import { useState } from 'react'
import { useQuery, useMutation } from 'urql'
import { TaskCard, STATUS_CYCLE } from './components/TaskCard'
import { LoginPage } from './components/LoginPage'
import { UserFilter } from './components/UserFilter'
import { useAuth } from './auth'
import {
  TASKS_QUERY,
  USERS_QUERY,
  CREATE_TASK_MUTATION,
  UPDATE_TASK_MUTATION,
  DELETE_TASK_MUTATION,
} from './graphql/operations'
import './App.css'

interface Task {
  id: string
  title: string
  description: string
  status: string
  assignedTo: string
  assigneeName?: string | null
  assigneeEmail?: string | null
  createdAt: string
  updatedAt: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

function TasksPage() {
  const { user, logout, isAdmin, isGuest, token } = useAuth()
  const [selectedUserId, setSelectedUserId] = useState<string>(user?.id ?? '')

  const [{ data: usersData }] = useQuery<{ users: User[] }>({
    query: USERS_QUERY,
    pause: !token,
  })

  const [{ data, fetching, error }, refetch] = useQuery<{ tasks: Task[] }>({
    query: TASKS_QUERY,
    variables: { assignedTo: selectedUserId || (user?.id ?? '') },
    requestPolicy: 'network-only',
    pause: !token,
  })

  const [, createTask] = useMutation(CREATE_TASK_MUTATION)
  const [, updateTask] = useMutation(UPDATE_TASK_MUTATION)
  const [, deleteTask] = useMutation(DELETE_TASK_MUTATION)

  const users = usersData?.users ?? []

  function handleCycleStatus(task: Task) {
    const nextStatus = STATUS_CYCLE[task.status] ?? 'pending'
    updateTask({ id: task.id, input: { status: nextStatus } })
      .then(() => refetch({ requestPolicy: 'network-only' }))
  }

  function handleUpdate(task: Task, fields: { title?: string; description?: string; assignedTo?: string }) {
    updateTask({ id: task.id, input: fields })
      .then(() => refetch({ requestPolicy: 'network-only' }))
  }

  function handleDelete(id: string) {
    deleteTask({ id })
      .then(() => refetch({ requestPolicy: 'network-only' }))
  }

  function handleAdd() {
    createTask({ input: { title: 'Nova tarefa', description: 'Descricao da tarefa', assignedTo: selectedUserId || user?.id } })
      .then(() => refetch({ requestPolicy: 'network-only' }))
  }

  if (fetching) return <div className="app"><p>Carregando...</p></div>
  if (error) return (
    <div className="app">
      <p className="app__error">Erro ao carregar tarefas: {error.message}</p>
    </div>
  )

  const tasks = data?.tasks ?? []

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Gestao de Tarefas</h1>
        <div className="app__user">
          <span className="app__user-name">{user?.name}</span>
          <span className="app__user-role">{user?.role}</span>
          <button className="app__logout-btn" onClick={logout}>Sair</button>
        </div>
      </header>

      <UserFilter
        selectedUserId={selectedUserId || (user?.id ?? '')}
        currentUserId={user?.id ?? ''}
        currentUserName={user?.name ?? ''}
        isAdmin={isAdmin}
        onChange={setSelectedUserId}
      />

      <div className="task-list">
        {tasks.length === 0 && (
          <p className="app__empty">Nenhuma tarefa. {!isGuest && 'Crie uma abaixo!'}</p>
        )}
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            title={task.title}
            description={task.description}
            status={task.status}
            assignedTo={task.assignedTo}
            assigneeName={task.assigneeName}
            assigneeEmail={task.assigneeEmail}
            canDelete={isAdmin}
            canReassign={isAdmin}
            users={users}
            onCycleStatus={() => handleCycleStatus(task)}
            onDelete={() => handleDelete(task.id)}
            onUpdate={(fields) => handleUpdate(task, fields)}
          />
        ))}
      </div>

      {!isGuest && (
        <button className="add-task-btn" onClick={handleAdd}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar tarefa
        </button>
      )}
    </div>
  )
}

function App() {
  const { token } = useAuth()
  if (!token) return <LoginPage />
  return <TasksPage />
}

export default App
