# Serviço de Gestão de Tarefas

Microsserviço REST em Go para criação e gestão de tarefas colaborativas. Segue Clean Architecture com separação entre domínio, casos de uso e adaptadores.

## Tecnologias

- **Go** — linguagem principal
- **chi** — roteador HTTP
- **pgx** — driver PostgreSQL
- **JWT (golang-jwt)** — autenticação via Bearer token
- **Swagger (swaggo)** — documentação da API
- **Docker** — containerização

## Estrutura do Projeto

```
tarefas/
├── cmd/server/         # Entrypoint da aplicação
├── internal/
│   ├── domain/         # Entidade Task, validações e erros de domínio
│   ├── usecase/        # Lógica de negócio (TaskService)
│   ├── port/           # Interface do repositório
│   └── adapter/
│       ├── http/       # Handlers, rotas e middleware JWT
│       └── postgres/   # Repositório PostgreSQL e migrações
├── docs/               # Swagger gerado pelo swag
└── bruno/              # Coleção de requisições para testes manuais
```

## Modelo de Domínio

```json
{
  "id":          "550e8400-e29b-41d4-a716-446655440000",
  "title":       "Implementar autenticação",
  "description": "Adicionar JWT ao backend da API",
  "status":      "pending",
  "assignedTo":  "user-uuid",
  "createdAt":   "2026-01-01T00:00:00Z",
  "updatedAt":   "2026-01-01T00:00:00Z"
}
```

**Status válidos:** `pending` · `in_progress` · `done`

## Endpoints

Todos os endpoints exigem `Authorization: Bearer <token>`.

| Método   | Rota          | Descrição                                      |
|----------|---------------|------------------------------------------------|
| `POST`   | `/tasks`      | Criar uma nova tarefa                          |
| `GET`    | `/tasks`      | Listar tarefas de um usuário (`?assignedTo=`)  |
| `GET`    | `/tasks/{id}` | Obter detalhes de uma tarefa                   |
| `PUT`    | `/tasks/{id}` | Atualizar título, descrição, status ou dono    |
| `DELETE` | `/tasks/{id}` | Remover uma tarefa                             |

### Controle de acesso

- Usuários regulares só podem criar, ver, atualizar e remover as **suas próprias** tarefas.
- Administradores (`role: admin`) podem operar sobre tarefas de qualquer usuário e reatribuí-las.

## Configuração

| Variável de Ambiente | Padrão                                                        | Descrição             |
|----------------------|---------------------------------------------------------------|-----------------------|
| `DATABASE_URL`       | `postgres://tarefas:tarefas@localhost:5432/tarefas?sslmode=disable` | URL de conexão com o PostgreSQL |
| `PORT`               | `8080`                                                        | Porta HTTP            |
| `JWT_SECRET`         | `dev-jwt-secret-change-in-production`                         | Segredo HMAC do JWT   |

## Executar Localmente

```bash
# Subir banco de dados
docker run -d \
  -e POSTGRES_USER=tarefas \
  -e POSTGRES_PASSWORD=tarefas \
  -e POSTGRES_DB=tarefas \
  -p 5432:5432 postgres:16-alpine

# Rodar o serviço
go run ./cmd/server
```

As migrações são aplicadas automaticamente na inicialização.

## Docker

```bash
docker build -t tarefas .
docker run -p 8080:8080 \
  -e DATABASE_URL="postgres://tarefas:tarefas@host.docker.internal:5432/tarefas?sslmode=disable" \
  -e JWT_SECRET="segredo-seguro" \
  tarefas
```

## Documentação Swagger

Com o serviço rodando, acesse:

```
http://localhost:8080/swagger/
```

Para regenerar após alterações nos comentários:

```bash
swag init -g cmd/server/main.go
```

## Testes

```bash
go test ./...
```

Os testes de handler usam um repositório in-memory. Os testes de caso de uso usam mock gerado manualmente.
