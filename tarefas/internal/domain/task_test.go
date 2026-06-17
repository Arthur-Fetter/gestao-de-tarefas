package domain_test

import (
	"testing"

	"github.com/gestao-tarefas/tarefas/internal/domain"
)

func TestIsValidStatus(t *testing.T) {
	valid := []string{"pending", "in_progress", "done"}
	for _, s := range valid {
		if !domain.IsValidStatus(s) {
			t.Errorf("expected %q to be a valid status", s)
		}
	}

	invalid := []string{"", "invalid", "DONE", "Pending", "completed"}
	for _, s := range invalid {
		if domain.IsValidStatus(s) {
			t.Errorf("expected %q to be an invalid status", s)
		}
	}
}

func TestTaskValidate(t *testing.T) {
	tests := []struct {
		name    string
		task    domain.Task
		wantErr bool
		errMsg  string
	}{
		{
			name:    "valid task",
			task:    domain.Task{Title: "My task", Status: "pending", AssignedTo: "user-1"},
			wantErr: false,
		},
		{
			name:    "valid task with in_progress status",
			task:    domain.Task{Title: "Task", Status: "in_progress", AssignedTo: "user-1"},
			wantErr: false,
		},
		{
			name:    "valid task with empty status (defaults allowed)",
			task:    domain.Task{Title: "Task", Status: "", AssignedTo: "user-1"},
			wantErr: false,
		},
		{
			name:    "missing title",
			task:    domain.Task{Title: "", Status: "pending", AssignedTo: "user-1"},
			wantErr: true,
			errMsg:  "title is required",
		},
		{
			name:    "invalid status",
			task:    domain.Task{Title: "Task", Status: "invalid", AssignedTo: "user-1"},
			wantErr: true,
			errMsg:  "invalid status",
		},
		{
			name:    "missing assignedTo",
			task:    domain.Task{Title: "Task", Status: "pending", AssignedTo: ""},
			wantErr: true,
			errMsg:  "assignedTo is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.task.Validate()
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", tt.errMsg)
				}
				if tt.errMsg != "" {
					valErr, ok := err.(*domain.ValidationError)
					if !ok {
						t.Fatalf("expected *ValidationError, got %T", err)
					}
					if len(valErr.Message) == 0 {
						t.Errorf("expected error message containing %q, got empty", tt.errMsg)
					}
				}
			} else {
				if err != nil {
					t.Fatalf("expected no error, got %v", err)
				}
			}
		})
	}
}

func TestNotFoundError(t *testing.T) {
	err := domain.NewNotFoundError("task", "abc-123")
	if err.Error() != "task with id 'abc-123' not found" {
		t.Errorf("unexpected error message: %s", err.Error())
	}
}

func TestValidationError(t *testing.T) {
	err := domain.NewValidationError("field %s is required", "title")
	if err.Error() != "field title is required" {
		t.Errorf("unexpected error message: %s", err.Error())
	}
}
