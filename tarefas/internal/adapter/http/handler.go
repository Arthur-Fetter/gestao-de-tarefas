package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gestao-tarefas/tarefas/internal/adapter/http/middleware"
	"github.com/gestao-tarefas/tarefas/internal/domain"
	"github.com/gestao-tarefas/tarefas/internal/usecase"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service *usecase.TaskService
}

func NewHandler(service *usecase.TaskService) *Handler {
	return &Handler{service: service}
}

// createTaskRequest represents the request body for creating a task.
type createTaskRequest struct {
	Title       string `json:"title"       example:"Implementar autenticação"`
	Description string `json:"description" example:"Adicionar JWT ao backend"`
	Status      string `json:"status"      example:"pending"`
	AssignedTo  string `json:"assignedTo"  example:"user-uuid"`
}

// updateTaskRequest represents the request body for updating a task.
type updateTaskRequest struct {
	Title       *string `json:"title"       example:"Título atualizado"`
	Description *string `json:"description" example:"Nova descrição"`
	Status      *string `json:"status"      example:"in_progress"`
	AssignedTo  *string `json:"assignedTo"  example:"user-uuid"`
}

type errorResponse struct {
	Error string `json:"error" example:"mensagem de erro"`
}

func getCaller(r *http.Request) *usecase.Caller {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		return &usecase.Caller{}
	}
	return &usecase.Caller{
		UserID: user.UserID,
		Role:   user.Role,
	}
}

// CreateTask godoc
//
//	@Summary		Criar uma nova tarefa
//	@Description	Cria uma nova tarefa. Usuários regulares só podem criar tarefas para si mesmos. Administradores podem atribuir a qualquer usuário.
//	@Tags			tasks
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			task	body		createTaskRequest	true	"Dados da tarefa"
//	@Success		201		{object}	domain.Task
//	@Failure		400		{object}	errorResponse	"Dados inválidos"
//	@Failure		401		{object}	errorResponse	"Não autenticado"
//	@Failure		500		{object}	errorResponse	"Erro interno"
//	@Router			/tasks [post]
func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
	var req createTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}

	caller := getCaller(r)
	assignedTo := req.AssignedTo
	if assignedTo == "" {
		assignedTo = caller.UserID
	}

	task, err := h.service.Create(r.Context(), caller, req.Title, req.Description, req.Status, assignedTo)
	if err != nil {
		handleError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, task)
}

// GetTask godoc
//
//	@Summary		Obter detalhes de uma tarefa
//	@Description	Retorna os detalhes de uma tarefa pelo seu ID.
//	@Tags			tasks
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id	path		string	true	"ID da tarefa"
//	@Success		200	{object}	domain.Task
//	@Failure		401	{object}	errorResponse	"Não autenticado"
//	@Failure		404	{object}	errorResponse	"Tarefa não encontrada"
//	@Router			/tasks/{id} [get]
func (h *Handler) GetTask(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	caller := getCaller(r)

	task, err := h.service.GetByID(r.Context(), caller, id)
	if err != nil {
		handleError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, task)
}

// ListTasks godoc
//
//	@Summary		Listar tarefas atribuídas a um usuário
//	@Description	Retorna todas as tarefas atribuídas a um usuário. Usuários regulares só podem listar suas próprias tarefas. Administradores podem listar de qualquer usuário.
//	@Tags			tasks
//	@Produce		json
//	@Security		BearerAuth
//	@Param			assignedTo	query		string	true	"ID do usuário"
//	@Success		200			{array}		domain.Task
//	@Failure		400			{object}	errorResponse	"Parâmetro assignedTo ausente"
//	@Failure		401			{object}	errorResponse	"Não autenticado"
//	@Failure		403			{object}	errorResponse	"Sem permissão"
//	@Router			/tasks [get]
func (h *Handler) ListTasks(w http.ResponseWriter, r *http.Request) {
	assignedTo := r.URL.Query().Get("assignedTo")
	if assignedTo == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "query parameter 'assignedTo' is required"})
		return
	}

	caller := getCaller(r)
	tasks, err := h.service.ListByUser(r.Context(), caller, assignedTo)
	if err != nil {
		handleError(w, err)
		return
	}

	if tasks == nil {
		tasks = []*domain.Task{}
	}

	writeJSON(w, http.StatusOK, tasks)
}

// UpdateTask godoc
//
//	@Summary		Atualizar informações da tarefa
//	@Description	Atualiza o título, descrição, status ou responsável de uma tarefa. Usuários regulares só podem atualizar suas próprias tarefas. Apenas administradores podem reatribuir tarefas.
//	@Tags			tasks
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id		path		string				true	"ID da tarefa"
//	@Param			task	body		updateTaskRequest	true	"Campos a atualizar (todos opcionais)"
//	@Success		200		{object}	domain.Task
//	@Failure		400		{object}	errorResponse	"Dados inválidos"
//	@Failure		401		{object}	errorResponse	"Não autenticado"
//	@Failure		403		{object}	errorResponse	"Sem permissão"
//	@Failure		404		{object}	errorResponse	"Tarefa não encontrada"
//	@Router			/tasks/{id} [put]
func (h *Handler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	caller := getCaller(r)

	var req updateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}

	task, err := h.service.Update(r.Context(), caller, id, req.Title, req.Description, req.Status, req.AssignedTo)
	if err != nil {
		handleError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, task)
}

// DeleteTask godoc
//
//	@Summary		Remover uma tarefa
//	@Description	Remove uma tarefa pelo seu ID. Usuários regulares só podem remover suas próprias tarefas. Administradores podem remover qualquer tarefa.
//	@Tags			tasks
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id	path	string	true	"ID da tarefa"
//	@Success		204	"Tarefa removida com sucesso"
//	@Failure		401	{object}	errorResponse	"Não autenticado"
//	@Failure		403	{object}	errorResponse	"Sem permissão"
//	@Failure		404	{object}	errorResponse	"Tarefa não encontrada"
//	@Router			/tasks/{id} [delete]
func (h *Handler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	caller := getCaller(r)

	if err := h.service.Delete(r.Context(), caller, id); err != nil {
		handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func handleError(w http.ResponseWriter, err error) {
	var validationErr *domain.ValidationError
	var notFoundErr *domain.NotFoundError

	switch {
	case errors.As(err, &validationErr):
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: validationErr.Message})
	case errors.As(err, &notFoundErr):
		writeJSON(w, http.StatusNotFound, errorResponse{Error: notFoundErr.Error()})
	default:
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
	}
}
