// Package main is the entry point for the tarefas service.
//
//	@title			Tarefas API
//	@version		1.0
//	@description	REST API for collaborative task management. All endpoints require a valid JWT Bearer token.
//	@termsOfService	http://swagger.io/terms/
//
//	@contact.name	Gestao de Tarefas
//
//	@license.name	MIT
//
//	@host		localhost:8080
//	@BasePath	/
//
//	@securityDefinitions.apikey	BearerAuth
//	@in							header
//	@name						Authorization
//	@description				JWT Bearer token. Format: "Bearer {token}"
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	httpAdapter "github.com/gestao-tarefas/tarefas/internal/adapter/http"
	"github.com/gestao-tarefas/tarefas/internal/adapter/postgres"
	_ "github.com/gestao-tarefas/tarefas/docs"
	"github.com/gestao-tarefas/tarefas/internal/usecase"
)

func main() {
	ctx := context.Background()

	// Configuration from environment
	databaseURL := getEnv("DATABASE_URL", "postgres://tarefas:tarefas@localhost:5432/tarefas?sslmode=disable")
	port := getEnv("PORT", "8080")
	jwtSecret := getEnv("JWT_SECRET", "dev-jwt-secret-change-in-production")

	// Connect to PostgreSQL with retry
	pool, err := connectWithRetry(ctx, databaseURL, 10, 2*time.Second)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()
	log.Println("Connected to database")

	// Run migrations
	repo := postgres.NewTaskRepository(pool)
	if err := repo.RunMigrations(ctx); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("Migrations applied")

	// Wire dependencies (Clean Architecture DI)
	service := usecase.NewTaskService(repo)
	handler := httpAdapter.NewHandler(service)
	router := httpAdapter.NewRouter(handler, jwtSecret)

	// Start HTTP server
	addr := fmt.Sprintf(":%s", port)
	log.Printf("Tarefas service listening on %s", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func connectWithRetry(ctx context.Context, url string, maxAttempts int, delay time.Duration) (*pgxpool.Pool, error) {
	var pool *pgxpool.Pool
	var err error

	for i := 0; i < maxAttempts; i++ {
		pool, err = pgxpool.New(ctx, url)
		if err != nil {
			log.Printf("Attempt %d/%d: failed to create pool: %v", i+1, maxAttempts, err)
			time.Sleep(delay)
			continue
		}

		if err = pool.Ping(ctx); err != nil {
			pool.Close()
			log.Printf("Attempt %d/%d: failed to ping database: %v", i+1, maxAttempts, err)
			time.Sleep(delay)
			continue
		}

		return pool, nil
	}

	return nil, fmt.Errorf("failed to connect after %d attempts: %w", maxAttempts, err)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
