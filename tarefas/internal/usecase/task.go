package usecase

import (
	"context"
	"time"

	"github.com/gestao-tarefas/tarefas/internal/domain"
	"github.com/gestao-tarefas/tarefas/internal/port"
	"github.com/google/uuid"
)

type Caller struct {
	UserID string
	Role   string
}

type TaskService struct {
	repo port.TaskRepository
}

func NewTaskService(repo port.TaskRepository) *TaskService {
	return &TaskService{repo: repo}
}

func (s *TaskService) Create(ctx context.Context, caller *Caller, title, description, status, assignedTo string) (*domain.Task, error) {
	if status == "" {
		status = domain.StatusPending
	}

	// Users can only create tasks assigned to themselves; admins can assign to anyone
	if caller.Role != "admin" {
		assignedTo = caller.UserID
	}

	task := &domain.Task{
		ID:          uuid.New().String(),
		Title:       title,
		Description: description,
		Status:      status,
		AssignedTo:  assignedTo,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := task.Validate(); err != nil {
		return nil, err
	}

	if err := s.repo.Create(ctx, task); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *TaskService) GetByID(ctx context.Context, caller *Caller, id string) (*domain.Task, error) {
	task, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, domain.NewNotFoundError("task", id)
	}
	return task, nil
}

func (s *TaskService) ListByUser(ctx context.Context, caller *Caller, userID string) ([]*domain.Task, error) {
	// Non-admin users can only list their own tasks
	if caller.Role != "admin" && userID != caller.UserID {
		return nil, domain.NewValidationError("you can only view your own tasks")
	}
	return s.repo.ListByUser(ctx, userID)
}

func (s *TaskService) Update(ctx context.Context, caller *Caller, id string, title, description, status, assignedTo *string) (*domain.Task, error) {
	task, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, domain.NewNotFoundError("task", id)
	}

	// Non-admin users can only update their own tasks
	if caller.Role != "admin" && task.AssignedTo != caller.UserID {
		return nil, domain.NewValidationError("you can only update your own tasks")
	}

	if title != nil {
		task.Title = *title
	}
	if description != nil {
		task.Description = *description
	}
	if status != nil {
		task.Status = *status
	}
	if assignedTo != nil {
		// Only admins can reassign tasks
		if caller.Role != "admin" {
			return nil, domain.NewValidationError("only admins can reassign tasks")
		}
		task.AssignedTo = *assignedTo
	}
	task.UpdatedAt = time.Now()

	if err := task.Validate(); err != nil {
		return nil, err
	}

	if err := s.repo.Update(ctx, task); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *TaskService) Delete(ctx context.Context, caller *Caller, id string) error {
	task, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if task == nil {
		return domain.NewNotFoundError("task", id)
	}

	// Non-admin users can only delete their own tasks
	if caller.Role != "admin" && task.AssignedTo != caller.UserID {
		return domain.NewValidationError("you can only delete your own tasks")
	}

	return s.repo.Delete(ctx, id)
}
