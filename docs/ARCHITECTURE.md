# Gestão de Tarefas Colaborativas

## O que é

Uma aplicação web para gerenciar tarefas em equipe. Usuários podem criar tarefas, atribuí-las a outros membros, acompanhar o progresso e controlar quem pode fazer o quê — dependendo do papel de cada um no sistema.

O projeto foi desenvolvido como trabalho acadêmico para a disciplina de Engenharia de Software: Arquitetura e Padrões, com foco em boas práticas arquiteturais, testes automatizados e deploy em Kubernetes.

---

## Estrutura do projeto

O sistema é composto por três serviços que rodam em Kubernetes local:

**tarefas** é o backend em Go. Cuida do CRUD de tarefas, aplica as regras de negócio (quem pode editar o quê) e persiste tudo no PostgreSQL. Expõe uma API REST.

**graphql** é o gateway em TypeScript. É por onde o frontend conversa — autentica os usuários, emite os tokens JWT e traduz as operações GraphQL em chamadas HTTP para o backend. Também é quem junta as informações de tarefas com os dados dos usuários antes de devolver para o frontend.

**tarefas-ui** é a interface React. Servida pelo nginx, consome o gateway GraphQL.

Os três serviços rodam em Kubernetes local usando k3d. O Traefik já vem instalado no k3d como ingress controller, então os serviços ficam acessíveis por subdomínios como `tarefas-ui.localhost:8080`.

---

## Como rodar

### Requisitos

- Docker Desktop rodando
- k3d, kubectl e helm instalados:

```bash
brew install k3d kubectl helm
```

### Deploy completo

```bash
make deploy
```

Isso constrói as imagens Docker, importa para o cluster k3d e aplica todos os manifestos. Na primeira vez demora um pouco mais porque vai baixar as imagens base.

Depois de rodar, acesse:

- Frontend: http://tarefas-ui.localhost:8080
- GraphQL: http://graphql.localhost:8080
- Swagger (API REST): `make swagger` depois acesse http://localhost:9090/swagger/index.html

### Outros comandos úteis

```bash
make test            # roda todos os testes
make status          # mostra o estado dos pods
make deploy-graphql  # rebuild e redeploy só do gateway
make deploy-tarefas  # rebuild e redeploy só do backend Go
make cluster-down    # destrói o cluster (e os dados)
```

---

## Decisões arquiteturais

Estão documentadas no arquivo `docs/ADR-001.md` com o raciocínio por trás de cada escolha — incluindo o que foi tentado e não funcionou.

---

## Modelo de dados

Duas tabelas, no mesmo PostgreSQL:

**tasks** — gerenciada pelo serviço Go

| Campo | Tipo | Notas |
|-------|------|-------|
| id | VARCHAR(36) | UUID gerado no Go |
| title | VARCHAR(255) | obrigatório |
| description | TEXT | |
| status | VARCHAR(50) | pending, in_progress, done |
| assigned_to | VARCHAR(36) | ID do usuário responsável |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**users** — gerenciada pelo gateway GraphQL

| Campo | Tipo | Notas |
|-------|------|-------|
| id | VARCHAR(36) | UUID gerado no gateway |
| name | VARCHAR(255) | |
| email | VARCHAR(255) | único |
| role | VARCHAR(50) | ADMIN, USER, GUEST |
| provider_id | VARCHAR(255) | reservado para OAuth2 futuro |
| password_hash | VARCHAR(255) | bcrypt, 10 rounds |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Diagrama

```
┌─────────────────────────────┐       ┌──────────────────────────────┐
│           tasks             │       │            users             │
├─────────────────────────────┤       ├──────────────────────────────┤
│ id          VARCHAR(36) PK  │       │ id          VARCHAR(36) PK   │
│ title       VARCHAR(255)    │       │ name        VARCHAR(255)     │
│ description TEXT            │       │ email       VARCHAR(255) UQ  │
│ status      VARCHAR(50)     │       │ role        VARCHAR(50)      │
│ assigned_to VARCHAR(36) ────┼───────│ id          (referência)     │
│ created_at  TIMESTAMP       │       │ provider_id VARCHAR(255)     │
│ updated_at  TIMESTAMP       │       │ password_hash VARCHAR(255)   │
└─────────────────────────────┘       │ created_at  TIMESTAMP        │
                                      │ updated_at  TIMESTAMP        │
                                      └──────────────────────────────┘
```

`assigned_to` referencia o `id` de um usuário, mas sem foreign key formal — os dois serviços são independentes e não compartilham conexão de banco.

---

## API REST (tarefas)

Todos os endpoints exigem `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /tasks | Criar tarefa |
| GET | /tasks/{id} | Buscar por ID |
| GET | /tasks?assignedTo={userId} | Listar tarefas de um usuário |
| PUT | /tasks/{id} | Atualizar |
| DELETE | /tasks/{id} | Remover |

Exemplos completos com request/response estão no Swagger (`make swagger`) e na coleção Bruno em `tarefas/bruno/`.

### Exemplo rápido

Criar uma tarefa:

```bash
curl -X POST http://localhost:9090/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Revisar pull request",
    "description": "PR #42 esperando revisão",
    "status": "pending"
  }'
```

Resposta:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Revisar pull request",
  "description": "PR #42 esperando revisão",
  "status": "pending",
  "assignedTo": "user-uuid",
  "createdAt": "2026-06-17T00:00:00Z",
  "updatedAt": "2026-06-17T00:00:00Z"
}
```

---

## API GraphQL

Endpoint: `POST http://graphql.localhost:8080/`

Cabeçalhos necessários em todas as requisições:

```
Content-Type: application/json
apollo-require-preflight: true
Authorization: Bearer <token>   (exceto register e login)
```

### Autenticação

```graphql
# Cadastro — role pode ser ADMIN, USER ou GUEST
mutation {
  register(name: "Maria", email: "maria@exemplo.com", password: "senha123", role: "USER") {
    token
    user { id email role }
  }
}

# Login
mutation {
  login(email: "maria@exemplo.com", password: "senha123") {
    token
    user { id email role }
  }
}
```

### Tarefas

```graphql
# Listar tarefas de um usuário
query {
  tasks(assignedTo: "user-id") {
    id title description status
    assigneeName assigneeEmail
  }
}

# Criar tarefa (assignedTo é opcional — padrão é o próprio usuário)
mutation {
  createTask(input: { title: "Nova tarefa", description: "Descrição" }) {
    id title status assigneeName
  }
}

# Atualizar status
mutation {
  updateTask(id: "task-id", input: { status: "in_progress" }) {
    id title status
  }
}
```

---

## Permissões

O papel do usuário é definido no cadastro e não pode ser alterado pelo próprio usuário — só por um admin.

| Ação | Admin | Usuário | Convidado |
|------|-------|---------|-----------|
| Ver tarefas próprias | sim | sim | sim |
| Ver tarefas de outros | sim | não | não |
| Criar tarefas | sim | sim | não |
| Editar tarefas | qualquer | só as suas | não |
| Reatribuir tarefas | sim | não | não |
| Excluir tarefas | qualquer | só as suas | não |
| Gerenciar usuários | sim | não | não |

---

## Testes

```bash
make test
```

90 testes no total, distribuídos em três projetos:

**tarefas (Go) — 40 testes**

Três níveis: testes de domínio (validação das entidades, sem dependências), testes de use case (lógica de negócio e autorização usando repositório em memória), e testes de handler (endpoints HTTP com contexto de usuário injetado, sem banco de dados).

**graphql (TypeScript) — 29 testes**

Resolvers de autenticação, tarefas e usuários testados com banco e datasource mockados via Vitest. Cobrem os casos de sucesso e os cenários de erro mais importantes (email duplicado, senha errada, permissão negada).

**tarefas-ui (React) — 21 testes**

Componentes testados com Testing Library: contexto de autenticação (localStorage, login, logout), TaskCard (renderização, edição inline, botão de deletar condicional por role) e UserFilter (dropdown para admin, modo leitura para outros).

A estratégia geral foi não testar integrações reais (banco, rede) nos testes unitários. Os testes de handler Go injetam um usuário diretamente no contexto HTTP, sem JWT, sem banco. Os testes de resolver TypeScript mockam os módulos de banco e datasource. Isso mantém os testes rápidos e sem dependências de infraestrutura.
