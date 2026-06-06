# gestao-de-tarefas - Development Makefile

CLUSTER_NAME := gestao-tarefas
AUTHENTIK_NAMESPACE := authentik
AUTHENTIK_VALUES := authentik/values.yaml
K3D_PORT_HTTP := 8080
K3D_PORT_HTTPS := 8443

.PHONY: help cluster-up cluster-down authentik-up authentik-down authentik-status

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

cluster-up: ## Create the k3d cluster
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

cluster-down:
	k3d cluster delete $(CLUSTER_NAME)

authentik-up:
	helm repo add authentik https://charts.goauthentik.io 2>/dev/null || true
	helm repo update
	helm upgrade --install authentik authentik/authentik \
		-f $(AUTHENTIK_VALUES) \
		--namespace $(AUTHENTIK_NAMESPACE) \
		--create-namespace
	@echo ""
	@echo "Authentik is deploying. Check status with: make authentik-status"
	@echo "Once ready, access: http://authentik.localhost:$(K3D_PORT_HTTP)/if/flow/initial-setup/"

authentik-down:
	helm uninstall authentik --namespace $(AUTHENTIK_NAMESPACE) || true
	kubectl delete namespace $(AUTHENTIK_NAMESPACE) || true

authentik-status:
	kubectl get pods -n $(AUTHENTIK_NAMESPACE)
