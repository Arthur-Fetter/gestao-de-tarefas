package usecase_test

import (
	"context"
	"errors"
	"sync"

	"github.com/gestao-tarefas/tarefas/internal/domain"
)

// mockRepo is an in-memory implementation of port.TaskRepository for testing.
type mockRepo struct {
	mu    sync.RWMutex
	tasks map[string]*domain.Task
}

func newMockRepo(tasks ...*domain.Task) *mockRepo {
	m := &mockRepo{tasks: make(map[string]*domain.Task)}
	for _, t := range tasks {
		m.tasks[t.ID] = t
	}
	return m
}

func (m *mockRepo) Create(ctx context.Context, task *domain.Task) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.tasks[task.ID] = task
	return nil
}

func (m *mockRepo) GetByID(ctx context.Context, id string) (*domain.Task, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	t, ok := m.tasks[id]
	if !ok {
		return nil, nil
	}
	copy := *t
	return &copy, nil
}

func (m *mockRepo) ListByUser(ctx context.Context, userID string) ([]*domain.Task, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []*domain.Task
	for _, t := range m.tasks {
		if t.AssignedTo == userID {
			copy := *t
			result = append(result, &copy)
		}
	}
	return result, nil
}

func (m *mockRepo) Update(ctx context.Context, task *domain.Task) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.tasks[task.ID]; !ok {
		return errors.New("not found")
	}
	m.tasks[task.ID] = task
	return nil
}

func (m *mockRepo) Delete(ctx context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.tasks, id)
	return nil
}
