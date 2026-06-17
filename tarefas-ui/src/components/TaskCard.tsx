import { useState, useEffect } from 'react'
import './TaskCard.css'

const STATUS_CYCLE: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'done',
  done: 'pending',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  done: 'Concluida',
}

interface User {
  id: string
  name: string
  email: string
}

interface TaskCardProps {
  title: string
  description: string
  status: string
  assigneeName?: string | null
  assigneeEmail?: string | null
  canDelete: boolean
  canReassign: boolean
  users: User[]
  assignedTo: string
  onCycleStatus: () => void
  onDelete: () => void
  onUpdate: (fields: { title?: string; description?: string; assignedTo?: string }) => void
}

export function TaskCard({
  title, description, status,
  assigneeName, assigneeEmail,
  canDelete, canReassign,
  users, assignedTo,
  onCycleStatus, onDelete, onUpdate,
}: TaskCardProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [editingAssignee, setEditingAssignee] = useState(false)
  const [titleValue, setTitleValue] = useState(title)
  const [descriptionValue, setDescriptionValue] = useState(description)

  useEffect(() => { if (!editingTitle) setTitleValue(title) }, [title, editingTitle])
  useEffect(() => { if (!editingDescription) setDescriptionValue(description) }, [description, editingDescription])

  function commitTitle() {
    setEditingTitle(false)
    if (titleValue !== title) onUpdate({ title: titleValue })
  }

  function commitDescription() {
    setEditingDescription(false)
    if (descriptionValue !== description) onUpdate({ description: descriptionValue })
  }

  function handleReassign(newUserId: string) {
    setEditingAssignee(false)
    if (newUserId !== assignedTo) onUpdate({ assignedTo: newUserId })
  }

  const displayName = assigneeName ?? assigneeEmail ?? assignedTo

  return (
    <div className={`task-card task-card--${status}`}>
      <div className="task-card__content">
        {editingTitle ? (
          <input
            className="task-card__input task-card__input--title"
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => e.key === 'Enter' && commitTitle()}
            autoFocus
          />
        ) : (
          <h3 className="task-card__title" onClick={() => setEditingTitle(true)}>
            {title}
          </h3>
        )}
        {editingDescription ? (
          <input
            className="task-card__input task-card__input--description"
            value={descriptionValue}
            onChange={e => setDescriptionValue(e.target.value)}
            onBlur={commitDescription}
            onKeyDown={e => e.key === 'Enter' && commitDescription()}
            autoFocus
          />
        ) : (
          <p className="task-card__description" onClick={() => setEditingDescription(true)}>
            {description}
          </p>
        )}

        {/* Assignee */}
        <div className="task-card__assignee">
          {editingAssignee && canReassign ? (
            <select
              className="task-card__assignee-select"
              value={assignedTo}
              onChange={e => handleReassign(e.target.value)}
              onBlur={() => setEditingAssignee(false)}
              autoFocus
            >
              {users.map(u => (
                <option key={u.id} value={u.id} title={u.email}>
                  {u.name}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={`task-card__assignee-name ${canReassign ? 'task-card__assignee-name--editable' : ''}`}
              onClick={() => canReassign && setEditingAssignee(true)}
              title={assigneeEmail ?? undefined}
            >
              {displayName}
            </span>
          )}
        </div>
      </div>

      <div className="task-card__actions">
        <button
          className={`task-card__btn task-card__status-btn task-card__status-btn--${status}`}
          onClick={onCycleStatus}
          title={`Status: ${STATUS_LABELS[status] ?? status} — clique para avancar`}
        >
          <span className="task-card__status-label">{STATUS_LABELS[status] ?? status}</span>
        </button>
        {canDelete && (
          <button
            className="task-card__btn task-card__btn--delete"
            onClick={onDelete}
            title="Remover tarefa"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export { STATUS_CYCLE }
