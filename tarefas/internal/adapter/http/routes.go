package http

import (
	"github.com/gestao-tarefas/tarefas/internal/adapter/http/middleware"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	httpSwagger "github.com/swaggo/http-swagger"
)

func NewRouter(handler *Handler, jwtSecret string) *chi.Mux {
	r := chi.NewRouter()
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.SetHeader("Content-Type", "application/json"))

	// Swagger UI — public, no auth required
	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(jwtSecret))
		registerRoutes(r, handler)
	})

	return r
}

// NewRouterWithoutAuth creates a router without JWT middleware — for use in tests only.
func NewRouterWithoutAuth(handler *Handler) *chi.Mux {
	r := chi.NewRouter()
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.SetHeader("Content-Type", "application/json"))
	registerRoutes(r, handler)
	return r
}

func registerRoutes(r chi.Router, handler *Handler) {
	r.Route("/tasks", func(r chi.Router) {
		r.Post("/", handler.CreateTask)
		r.Get("/", handler.ListTasks)
		r.Get("/{id}", handler.GetTask)
		r.Put("/{id}", handler.UpdateTask)
		r.Delete("/{id}", handler.DeleteTask)
	})
}
