package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	httpAdapter "github.com/gestao-tarefas/tarefas/internal/adapter/http"
	"github.com/gestao-tarefas/tarefas/internal/adapter/http/middleware"
	"github.com/gestao-tarefas/tarefas/internal/domain"
	"github.com/gestao-tarefas/tarefas/internal/usecase"
)

// ---- helpers ----

func newTestRouter(role string) (*httpAdapter.Handler, http.Handler) {
	repo := newTestRepo()
	svc := usecase.NewTaskService(repo)
	handler := httpAdapter.NewHandler(svc)
	router := httpAdapter.NewRouterWithoutAuth(handler)

	// Inject a fake authenticated user into every request context
	wrapped := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := &middleware.UserClaims{
			UserID: "test-user-1",
			Email:  "test@test.com",
			Name:   "Test User",
			Role:   role,
		}
		ctx := context.WithValue(r.Context(), middleware.UserContextKey, claims)
		router.ServeHTTP(w, r.WithContext(ctx))
	})

	return handler, wrapped
}

func doRequest(t *testing.T, router http.Handler, method, path string, body interface{}) *httptest.ResponseRecorder {
	t.Helper()
	var req *http.Request
	if body != nil {
		b, _ := json.Marshal(body)
		req = httptest.NewRequest(method, path, bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)
	return rr
}

// ---- POST /tasks ----

func TestCreateTask_Success(t *testing.T) {
	_, router := newTestRouter("admin")

	rr := doRequest(t, router, "POST", "/tasks", map[string]string{
		"title":       "Test Task",
		"description": "A description",
		"status":      "pending",
		"assignedTo":  "test-user-1",
	})

	if rr.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var task domain.Task
	if err := json.NewDecoder(rr.Body).Decode(&task); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if task.Title != "Test Task" {
		t.Errorf("expected title %q, got %q", "Test Task", task.Title)
	}
	if task.ID == "" {
		t.Error("expected non-empty task ID")
	}
}

func TestCreateTask_MissingTitle(t *testing.T) {
	_, router := newTestRouter("user")

	rr := doRequest(t, router, "POST", "/tasks", map[string]string{
		"description": "desc",
		"assignedTo":  "test-user-1",
	})

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestCreateTask_InvalidStatus(t *testing.T) {
	_, router := newTestRouter("user")

	rr := doRequest(t, router, "POST", "/tasks", map[string]string{
		"title":      "Task",
		"assignedTo": "test-user-1",
		"status":     "invalid",
	})

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

// ---- GET /tasks/{id} ----

func TestGetTask_NotFound(t *testing.T) {
	_, router := newTestRouter("admin")

	rr := doRequest(t, router, "GET", "/tasks/nonexistent-id", nil)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

func TestGetTask_Found(t *testing.T) {
	_, router := newTestRouter("admin")

	// Create a task first
	createRR := doRequest(t, router, "POST", "/tasks", map[string]string{
		"title":      "Found Task",
		"assignedTo": "test-user-1",
	})
	if createRR.Code != http.StatusCreated {
		t.Fatalf("setup failed: %d %s", createRR.Code, createRR.Body.String())
	}

	var created domain.Task
	json.NewDecoder(createRR.Body).Decode(&created)

	rr := doRequest(t, router, "GET", "/tasks/"+created.ID, nil)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var task domain.Task
	json.NewDecoder(rr.Body).Decode(&task)
	if task.ID != created.ID {
		t.Errorf("expected task ID %q, got %q", created.ID, task.ID)
	}
}

// ---- GET /tasks?assignedTo=... ----

func TestListTasks_MissingParam(t *testing.T) {
	_, router := newTestRouter("user")

	rr := doRequest(t, router, "GET", "/tasks", nil)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestListTasks_Success(t *testing.T) {
	_, router := newTestRouter("admin")

	// Create a task
	doRequest(t, router, "POST", "/tasks", map[string]string{
		"title":      "Listed Task",
		"assignedTo": "test-user-1",
	})

	rr := doRequest(t, router, "GET", "/tasks?assignedTo=test-user-1", nil)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var tasks []*domain.Task
	json.NewDecoder(rr.Body).Decode(&tasks)
	if len(tasks) == 0 {
		t.Error("expected at least 1 task")
	}
}

// ---- PUT /tasks/{id} ----

func TestUpdateTask_Success(t *testing.T) {
	_, router := newTestRouter("user")

	// Create
	createRR := doRequest(t, router, "POST", "/tasks", map[string]string{
		"title":      "Original",
		"assignedTo": "test-user-1",
	})
	var created domain.Task
	json.NewDecoder(createRR.Body).Decode(&created)

	// Update
	rr := doRequest(t, router, "PUT", "/tasks/"+created.ID, map[string]string{
		"title": "Updated",
	})

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var updated domain.Task
	json.NewDecoder(rr.Body).Decode(&updated)
	if updated.Title != "Updated" {
		t.Errorf("expected title %q, got %q", "Updated", updated.Title)
	}
}

func TestUpdateTask_NotFound(t *testing.T) {
	_, router := newTestRouter("admin")

	rr := doRequest(t, router, "PUT", "/tasks/nonexistent", map[string]string{
		"title": "Updated",
	})

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

// ---- DELETE /tasks/{id} ----

func TestDeleteTask_Success(t *testing.T) {
	_, router := newTestRouter("admin")

	// Create
	createRR := doRequest(t, router, "POST", "/tasks", map[string]string{
		"title":      "To Delete",
		"assignedTo": "test-user-1",
	})
	var created domain.Task
	json.NewDecoder(createRR.Body).Decode(&created)

	// Delete
	rr := doRequest(t, router, "DELETE", "/tasks/"+created.ID, nil)

	if rr.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rr.Code)
	}
}

func TestDeleteTask_NotFound(t *testing.T) {
	_, router := newTestRouter("admin")

	rr := doRequest(t, router, "DELETE", "/tasks/nonexistent", nil)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}
