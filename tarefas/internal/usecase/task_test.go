package usecase_test

import (
	"context"
	"testing"

	"github.com/gestao-tarefas/tarefas/internal/domain"
	"github.com/gestao-tarefas/tarefas/internal/usecase"
)

var ctx = context.Background()

func adminCaller(userID string) *usecase.Caller {
	return &usecase.Caller{UserID: userID, Role: "admin"}
}

func userCaller(userID string) *usecase.Caller {
	return &usecase.Caller{UserID: userID, Role: "user"}
}

func guestCaller(userID string) *usecase.Caller {
	return &usecase.Caller{UserID: userID, Role: "guest"}
}

func seedTask(id, title, assignedTo, status string) *domain.Task {
	return &domain.Task{
		ID:          id,
		Title:       title,
		Description: "desc",
		Status:      status,
		AssignedTo:  assignedTo,
	}
}

// ---- Create ----

func TestCreate_Success(t *testing.T) {
	svc := usecase.NewTaskService(newMockRepo())
	task, err := svc.Create(ctx, userCaller("user-1"), "My Task", "desc", "pending", "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if task.Title != "My Task" {
		t.Errorf("expected title %q, got %q", "My Task", task.Title)
	}
	if task.AssignedTo != "user-1" {
		t.Errorf("expected assignedTo %q, got %q", "user-1", task.AssignedTo)
	}
}

func TestCreate_NonAdminForcedSelfAssign(t *testing.T) {
	svc := usecase.NewTaskService(newMockRepo())
	// Regular user tries to assign to someone else — should be forced to self
	task, err := svc.Create(ctx, userCaller("user-1"), "Task", "desc", "pending", "other-user")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if task.AssignedTo != "user-1" {
		t.Errorf("expected non-admin to be forced to own ID, got %q", task.AssignedTo)
	}
}

func TestCreate_AdminCanAssignToAnyone(t *testing.T) {
	svc := usecase.NewTaskService(newMockRepo())
	task, err := svc.Create(ctx, adminCaller("admin-1"), "Task", "desc", "pending", "user-2")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if task.AssignedTo != "user-2" {
		t.Errorf("expected admin to assign to user-2, got %q", task.AssignedTo)
	}
}

func TestCreate_DefaultsStatusToPending(t *testing.T) {
	svc := usecase.NewTaskService(newMockRepo())
	task, err := svc.Create(ctx, userCaller("user-1"), "Task", "desc", "", "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if task.Status != domain.StatusPending {
		t.Errorf("expected default status %q, got %q", domain.StatusPending, task.Status)
	}
}

func TestCreate_MissingTitle(t *testing.T) {
	svc := usecase.NewTaskService(newMockRepo())
	_, err := svc.Create(ctx, userCaller("user-1"), "", "desc", "pending", "user-1")
	if err == nil {
		t.Fatal("expected validation error, got nil")
	}
	var valErr *domain.ValidationError
	if !isValidationError(err, &valErr) {
		t.Errorf("expected ValidationError, got %T: %v", err, err)
	}
}

func TestCreate_InvalidStatus(t *testing.T) {
	svc := usecase.NewTaskService(newMockRepo())
	_, err := svc.Create(ctx, userCaller("user-1"), "Task", "desc", "invalid", "user-1")
	if err == nil {
		t.Fatal("expected validation error, got nil")
	}
}

// ---- GetByID ----

func TestGetByID_Found(t *testing.T) {
	task := seedTask("task-1", "Task A", "user-1", "pending")
	svc := usecase.NewTaskService(newMockRepo(task))

	result, err := svc.GetByID(ctx, adminCaller("admin-1"), "task-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ID != "task-1" {
		t.Errorf("expected task ID task-1, got %q", result.ID)
	}
}

func TestGetByID_NotFound(t *testing.T) {
	svc := usecase.NewTaskService(newMockRepo())
	_, err := svc.GetByID(ctx, adminCaller("admin-1"), "nonexistent")
	if err == nil {
		t.Fatal("expected not found error, got nil")
	}
	var notFound *domain.NotFoundError
	if !isNotFoundError(err, &notFound) {
		t.Errorf("expected NotFoundError, got %T: %v", err, err)
	}
}

// ---- ListByUser ----

func TestListByUser_UserSeesOwnTasks(t *testing.T) {
	tasks := []*domain.Task{
		seedTask("t1", "Task 1", "user-1", "pending"),
		seedTask("t2", "Task 2", "user-1", "done"),
		seedTask("t3", "Task 3", "user-2", "pending"),
	}
	svc := usecase.NewTaskService(newMockRepo(tasks...))

	results, err := svc.ListByUser(ctx, userCaller("user-1"), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 2 {
		t.Errorf("expected 2 tasks for user-1, got %d", len(results))
	}
}

func TestListByUser_NonAdminCannotQueryOthers(t *testing.T) {
	tasks := []*domain.Task{
		seedTask("t1", "Task 1", "user-2", "pending"),
	}
	svc := usecase.NewTaskService(newMockRepo(tasks...))

	// user-1 tries to query user-2's tasks
	_, err := svc.ListByUser(ctx, userCaller("user-1"), "user-2")
	if err == nil {
		t.Fatal("expected authorization error, got nil")
	}
}

func TestListByUser_AdminCanQueryAnyone(t *testing.T) {
	tasks := []*domain.Task{
		seedTask("t1", "Task 1", "user-2", "pending"),
	}
	svc := usecase.NewTaskService(newMockRepo(tasks...))

	results, err := svc.ListByUser(ctx, adminCaller("admin-1"), "user-2")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Errorf("expected 1 task, got %d", len(results))
	}
}

// ---- Update ----

func TestUpdate_OwnerCanUpdateOwnTask(t *testing.T) {
	task := seedTask("t1", "Original", "user-1", "pending")
	svc := usecase.NewTaskService(newMockRepo(task))

	title := "Updated"
	result, err := svc.Update(ctx, userCaller("user-1"), "t1", &title, nil, nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Title != "Updated" {
		t.Errorf("expected title %q, got %q", "Updated", result.Title)
	}
}

func TestUpdate_NonOwnerCannotUpdateOthersTask(t *testing.T) {
	task := seedTask("t1", "Task", "user-1", "pending")
	svc := usecase.NewTaskService(newMockRepo(task))

	title := "Hacked"
	_, err := svc.Update(ctx, userCaller("user-2"), "t1", &title, nil, nil, nil)
	if err == nil {
		t.Fatal("expected authorization error, got nil")
	}
}

func TestUpdate_AdminCanUpdateAnyTask(t *testing.T) {
	task := seedTask("t1", "Task", "user-1", "pending")
	svc := usecase.NewTaskService(newMockRepo(task))

	title := "Admin updated"
	result, err := svc.Update(ctx, adminCaller("admin-1"), "t1", &title, nil, nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Title != "Admin updated" {
		t.Errorf("expected title %q, got %q", "Admin updated", result.Title)
	}
}

func TestUpdate_NonAdminCannotReassign(t *testing.T) {
	task := seedTask("t1", "Task", "user-1", "pending")
	svc := usecase.NewTaskService(newMockRepo(task))

	newAssignee := "user-2"
	_, err := svc.Update(ctx, userCaller("user-1"), "t1", nil, nil, nil, &newAssignee)
	if err == nil {
		t.Fatal("expected error when non-admin tries to reassign, got nil")
	}
}

func TestUpdate_AdminCanReassign(t *testing.T) {
	task := seedTask("t1", "Task", "user-1", "pending")
	svc := usecase.NewTaskService(newMockRepo(task))

	newAssignee := "user-2"
	result, err := svc.Update(ctx, adminCaller("admin-1"), "t1", nil, nil, nil, &newAssignee)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.AssignedTo != "user-2" {
		t.Errorf("expected assignedTo %q, got %q", "user-2", result.AssignedTo)
	}
}

func TestUpdate_NotFound(t *testing.T) {
	svc := usecase.NewTaskService(newMockRepo())
	title := "title"
	_, err := svc.Update(ctx, adminCaller("admin-1"), "nonexistent", &title, nil, nil, nil)
	if err == nil {
		t.Fatal("expected not found error, got nil")
	}
}

// ---- Delete ----

func TestDelete_OwnerCanDeleteOwnTask(t *testing.T) {
	task := seedTask("t1", "Task", "user-1", "pending")
	svc := usecase.NewTaskService(newMockRepo(task))

	err := svc.Delete(ctx, userCaller("user-1"), "t1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDelete_NonOwnerCannotDeleteOthersTask(t *testing.T) {
	task := seedTask("t1", "Task", "user-1", "pending")
	svc := usecase.NewTaskService(newMockRepo(task))

	err := svc.Delete(ctx, userCaller("user-2"), "t1")
	if err == nil {
		t.Fatal("expected authorization error, got nil")
	}
}

func TestDelete_AdminCanDeleteAnyTask(t *testing.T) {
	task := seedTask("t1", "Task", "user-1", "pending")
	svc := usecase.NewTaskService(newMockRepo(task))

	err := svc.Delete(ctx, adminCaller("admin-1"), "t1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDelete_NotFound(t *testing.T) {
	svc := usecase.NewTaskService(newMockRepo())
	err := svc.Delete(ctx, adminCaller("admin-1"), "nonexistent")
	if err == nil {
		t.Fatal("expected not found error, got nil")
	}
}

// ---- helpers ----

func isValidationError(err error, target **domain.ValidationError) bool {
	if err == nil {
		return false
	}
	var ve *domain.ValidationError
	ok := (err == ve) || (err.(*domain.ValidationError) != nil)
	_ = ok
	if e, ok := err.(*domain.ValidationError); ok {
		*target = e
		return true
	}
	return false
}

func isNotFoundError(err error, target **domain.NotFoundError) bool {
	if e, ok := err.(*domain.NotFoundError); ok {
		*target = e
		return true
	}
	return false
}
