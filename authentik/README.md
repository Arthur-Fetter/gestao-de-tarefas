# Authentik (Desenvolvimento Local)

Provedor de identidade da plataforma gestao-de-tarefas, implantado via Helm em um cluster k3d local.

## Pre-requisitos

Instale as seguintes ferramentas (macOS via Homebrew):

- k3d 
- kubectl 
- helm

Tambem e necessario ter o **Docker Desktop** em execucao.

## Inicio Rapido

A partir da raiz do projeto:

```bash
make authentik-up
```

Isso deve:
1. Criar um cluster k3d chamado `gestao-tarefas` (se ainda nao existir)
2. Adicionar o repositorio Helm do authentik
3. Instalar o authentik no namespace `authentik`

## Acesso

Quando os pods estiverem rodando, abra:

```
http://authentik.localhost:8080/if/flow/initial-setup/
```

Voce sera solicitado a criar a conta de administrador inicial.

Para verificar o status dos pods:

```bash
kubectl get pods -n authentik
```

## Remover

Remover authentik (o cluster permanece ativo).

```bash
make authentik-down
```

Para remover o cluster inteiro:

```bash
make cluster-down
```
