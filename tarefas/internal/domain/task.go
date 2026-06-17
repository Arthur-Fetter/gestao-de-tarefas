package domain

import "time"

const (
	StatusPending    = "pending"
	StatusInProgress = "in_progress"
	StatusDone       = "done"
)

var ValidStatuses = []string{StatusPending, StatusInProgress, StatusDone}

type Task struct {
	ID          string    `json:"id"          example:"550e8400-e29b-41d4-a716-446655440000"`
	Title       string    `json:"title"       example:"Implementar autenticação"`
	Description string    `json:"description" example:"Adicionar JWT ao backend da API"`
	Status      string    `json:"status"      example:"pending"      enums:"pending,in_progress,done"`
	AssignedTo  string    `json:"assignedTo"  example:"user-uuid"`
	CreatedAt   time.Time `json:"createdAt"   example:"2026-01-01T00:00:00Z"`
	UpdatedAt   time.Time `json:"updatedAt"   example:"2026-01-01T00:00:00Z"`
}

func IsValidStatus(status string) bool {
	for _, s := range ValidStatuses {
		if s == status {
			return true
		}
	}
	return false
}

func (t *Task) Validate() error {
	if t.Title == "" {
		return NewValidationError("title is required")
	}
	if t.Status != "" && !IsValidStatus(t.Status) {
		return NewValidationError("invalid status: %s (valid: %v)", t.Status, ValidStatuses)
	}
	if t.AssignedTo == "" {
		return NewValidationError("assignedTo is required")
	}
	return nil
}
