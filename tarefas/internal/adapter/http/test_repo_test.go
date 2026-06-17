package http_test

import (
	"context"
	"errors"
	"sync"

	"github.com/gestao-tarefas/tarefas/internal/domain"
)

type testRepo struct {
	mu    sync.RWMutex
	tasks map[string]*domain.Task
}

func newTestRepo() *testRepo {
	return &testRepo{tasks: make(map[string]*domain.Task)}
}

func (r *testRepo) Create(ctx context.Context, task *domain.Task) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tasks[task.ID] = task
	return nil
}

func (r *testRepo) GetByID(ctx context.Context, id string) (*domain.Task, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	t, ok := r.tasks[id]
	if !ok {
		return nil, nil
	}
	copy := *t
	return &copy, nil
}

func (r *testRepo) ListByUser(ctx context.Context, userID string) ([]*domain.Task, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*domain.Task
	for _, t := range r.tasks {
		if t.AssignedTo == userID {
			copy := *t
			result = append(result, &copy)
		}
	}
	return result, nil
}

func (r *testRepo) Update(ctx context.Context, task *domain.Task) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.tasks[task.ID]; !ok {
		return errors.New("not found")
	}
	r.tasks[task.ID] = task
	return nil
}

func (r *testRepo) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.tasks, id)
	return nil
}
