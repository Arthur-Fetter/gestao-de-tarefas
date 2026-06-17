package postgres

import (
	"context"
	"embed"
	"fmt"

	"github.com/gestao-tarefas/tarefas/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

type TaskRepository struct {
	pool *pgxpool.Pool
}

func NewTaskRepository(pool *pgxpool.Pool) *TaskRepository {
	return &TaskRepository{pool: pool}
}

func (r *TaskRepository) RunMigrations(ctx context.Context) error {
	sql, err := migrationsFS.ReadFile("migrations/001_create_tasks.sql")
	if err != nil {
		return fmt.Errorf("reading migration: %w", err)
	}
	_, err = r.pool.Exec(ctx, string(sql))
	if err != nil {
		return fmt.Errorf("running migration: %w", err)
	}
	return nil
}

func (r *TaskRepository) Create(ctx context.Context, task *domain.Task) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO tasks (id, title, description, status, assigned_to, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		task.ID, task.Title, task.Description, task.Status, task.AssignedTo, task.CreatedAt, task.UpdatedAt,
	)
	return err
}

func (r *TaskRepository) GetByID(ctx context.Context, id string) (*domain.Task, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, title, description, status, assigned_to, created_at, updated_at
		 FROM tasks WHERE id = $1`, id,
	)

	var task domain.Task
	err := row.Scan(&task.ID, &task.Title, &task.Description, &task.Status, &task.AssignedTo, &task.CreatedAt, &task.UpdatedAt)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	return &task, nil
}

func (r *TaskRepository) ListByUser(ctx context.Context, userID string) ([]*domain.Task, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, title, description, status, assigned_to, created_at, updated_at
		 FROM tasks WHERE assigned_to = $1 ORDER BY created_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []*domain.Task
	for rows.Next() {
		var task domain.Task
		if err := rows.Scan(&task.ID, &task.Title, &task.Description, &task.Status, &task.AssignedTo, &task.CreatedAt, &task.UpdatedAt); err != nil {
			return nil, err
		}
		tasks = append(tasks, &task)
	}
	return tasks, rows.Err()
}

func (r *TaskRepository) Update(ctx context.Context, task *domain.Task) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE tasks SET title = $2, description = $3, status = $4, assigned_to = $5, updated_at = $6
		 WHERE id = $1`,
		task.ID, task.Title, task.Description, task.Status, task.AssignedTo, task.UpdatedAt,
	)
	return err
}

func (r *TaskRepository) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM tasks WHERE id = $1`, id)
	return err
}
