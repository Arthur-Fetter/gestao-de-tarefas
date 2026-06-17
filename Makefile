# gestao-de-tarefas - Development Makefile

CLUSTER_NAME := gestao-tarefas
K3D_PORT_HTTP := 8080
K3D_PORT_HTTPS := 8443

.PHONY: help \
        cluster-up cluster-down \
        build build-graphql build-tarefas build-ui \
        deploy deploy-graphql deploy-tarefas deploy-tarefas-ui \
        test test-tarefas test-graphql test-ui \
        swagger status

# ============================================================
# Help
# ============================================================

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ============================================================
# Cluster
# ============================================================

cluster-up: ## Create the k3d cluster (idempotent)
	@if k3d cluster list | grep -q $(CLUSTER_NAME); then \
		echo "Cluster '$(CLUSTER_NAME)' already exists."; \
	else \
		echo "Creating k3d cluster '$(CLUSTER_NAME)'..."; \
		k3d cluster create $(CLUSTER_NAME) \
			--port "$(K3D_PORT_HTTP):80@loadbalancer" \
			--port "$(K3D_PORT_HTTPS):443@loadbalancer"; \
		echo "Cluster created. Waiting for Traefik to be ready..."; \
		kubectl wait --for=condition=available --timeout=120s deployment/traefik -n kube-system 2>/dev/null || true; \
	fi

cluster-down: ## Delete the k3d cluster (WARNING: destroys all data)
	k3d cluster delete $(CLUSTER_NAME)

# ============================================================
# Build
# ============================================================

build-graphql: ## Build GraphQL gateway Docker image
	docker build -t graphql:latest ./graphql

build-tarefas: ## Build tarefas backend Docker image (regenerates Swagger docs first)
	cd tarefas && $(shell go env GOPATH)/bin/swag init -g cmd/server/main.go --output docs --quiet 2>/dev/null || true
	docker build -t tarefas:latest ./tarefas

build-ui: ## Build frontend Docker image
	docker build -t tarefas-ui:latest ./tarefas-ui

build: build-graphql build-tarefas build-ui ## Build all Docker images

# ============================================================
# Deploy
# ============================================================

deploy-graphql: cluster-up build-graphql ## Build and deploy the GraphQL gateway
	k3d image import graphql:latest -c $(CLUSTER_NAME)
	kubectl apply -f k8s/graphql.yaml
	kubectl rollout restart deployment/graphql
	kubectl rollout status deployment/graphql --timeout=60s

deploy-tarefas: cluster-up build-tarefas ## Build and deploy the tarefas backend
	k3d image import tarefas:latest -c $(CLUSTER_NAME)
	kubectl apply -f k8s/postgres-tarefas.yaml
	kubectl apply -f k8s/tarefas.yaml
	kubectl rollout restart deployment/tarefas
	kubectl rollout status deployment/tarefas --timeout=60s

deploy-tarefas-ui: cluster-up build-ui ## Build and deploy the frontend
	k3d image import tarefas-ui:latest -c $(CLUSTER_NAME)
	kubectl apply -f k8s/tarefas-ui.yaml
	kubectl rollout restart deployment/tarefas-ui
	kubectl rollout status deployment/tarefas-ui --timeout=60s

deploy: cluster-up build ## Build and deploy all services to k3d
	k3d image import graphql:latest tarefas:latest tarefas-ui:latest -c $(CLUSTER_NAME)
	kubectl apply -f k8s/postgres-tarefas.yaml
	kubectl apply -f k8s/tarefas.yaml
	kubectl apply -f k8s/graphql.yaml
	kubectl apply -f k8s/tarefas-ui.yaml
	kubectl rollout restart deployment/graphql deployment/tarefas deployment/tarefas-ui
	kubectl rollout status deployment/graphql deployment/tarefas deployment/tarefas-ui --timeout=60s
	@echo ""
	@echo "Deployed. URLs:"
	@echo "  Frontend:    http://tarefas-ui.localhost:$(K3D_PORT_HTTP)/"
	@echo "  GraphQL API: http://graphql.localhost:$(K3D_PORT_HTTP)/"

# ============================================================
# Tests
# ============================================================

test-tarefas: ## Run Go backend tests
	cd tarefas && go test ./... -v

test-graphql: ## Run GraphQL gateway tests
	cd graphql && npm test

test-ui: ## Run frontend tests
	cd tarefas-ui && npm test

test: test-tarefas test-graphql test-ui ## Run all tests

# ============================================================
# Utilities
# ============================================================

swagger: ## Open Swagger UI for the tarefas API (port-forwards to localhost:9090)
	@echo "Swagger UI available at http://localhost:9090/swagger/index.html"
	@echo "Press Ctrl+C to stop"
	kubectl port-forward svc/tarefas 9090:80

status: ## Show status of all pods, services and ingresses
	kubectl get pods,svc,ingress
