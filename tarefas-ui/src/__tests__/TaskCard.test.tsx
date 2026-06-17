import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskCard } from '../components/TaskCard'

const defaultProps = {
  title: 'My Task',
  description: 'A description',
  status: 'pending',
  assignedTo: 'user-1',
  assigneeName: 'Test User',
  assigneeEmail: 'test@test.com',
  canDelete: false,
  canReassign: false,
  users: [],
  onCycleStatus: vi.fn(),
  onDelete: vi.fn(),
  onUpdate: vi.fn(),
}

describe('TaskCard', () => {
  it('renders title and description', () => {
    render(<TaskCard {...defaultProps} />)
    expect(screen.getByText('My Task')).toBeInTheDocument()
    expect(screen.getByText('A description')).toBeInTheDocument()
  })

  it('renders assignee name', () => {
    render(<TaskCard {...defaultProps} />)
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('renders status badge with correct label', () => {
    render(<TaskCard {...defaultProps} status="pending" />)
    expect(screen.getByText('Pendente')).toBeInTheDocument()
  })

  it('renders in_progress status label', () => {
    render(<TaskCard {...defaultProps} status="in_progress" />)
    expect(screen.getByText('Em andamento')).toBeInTheDocument()
  })

  it('renders done status label', () => {
    render(<TaskCard {...defaultProps} status="done" />)
    expect(screen.getByText('Concluida')).toBeInTheDocument()
  })

  it('calls onCycleStatus when status button is clicked', () => {
    const onCycleStatus = vi.fn()
    render(<TaskCard {...defaultProps} onCycleStatus={onCycleStatus} />)
    fireEvent.click(screen.getByText('Pendente'))
    expect(onCycleStatus).toHaveBeenCalledOnce()
  })

  it('does not show delete button when canDelete is false', () => {
    render(<TaskCard {...defaultProps} canDelete={false} />)
    expect(screen.queryByTitle('Remover tarefa')).not.toBeInTheDocument()
  })

  it('shows delete button when canDelete is true', () => {
    render(<TaskCard {...defaultProps} canDelete={true} />)
    expect(screen.getByTitle('Remover tarefa')).toBeInTheDocument()
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<TaskCard {...defaultProps} canDelete={true} onDelete={onDelete} />)
    fireEvent.click(screen.getByTitle('Remover tarefa'))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('calls onUpdate with new title when edited', () => {
    const onUpdate = vi.fn()
    render(<TaskCard {...defaultProps} onUpdate={onUpdate} />)

    // Click title to start editing
    fireEvent.click(screen.getByText('My Task'))

    const input = screen.getByDisplayValue('My Task')
    fireEvent.change(input, { target: { value: 'Updated Title' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onUpdate).toHaveBeenCalledWith({ title: 'Updated Title' })
  })

  it('does not call onUpdate if title unchanged', () => {
    const onUpdate = vi.fn()
    render(<TaskCard {...defaultProps} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByText('My Task'))
    const input = screen.getByDisplayValue('My Task')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('shows assignee dropdown for admin when clicked', () => {
    const users = [
      { id: 'user-1', name: 'Test User', email: 'test@test.com' },
      { id: 'user-2', name: 'Other User', email: 'other@test.com' },
    ]
    render(<TaskCard {...defaultProps} canReassign={true} users={users} />)

    fireEvent.click(screen.getByText('Test User'))
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
