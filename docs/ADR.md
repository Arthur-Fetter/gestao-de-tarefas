# Decisões de arquitetura

## Arquitetura inicial proposta

O desenho original do sistema tinha os seguintes componentes:

- **tarefas-ui** — frontend React
- **graphql** — gateway GraphQL (BFF)
- **tarefas** — backend de tarefas (Go, REST)
- **gestao-usuarios** — backend de usuários (Go ou Java, REST)
- **authentik** — IdP self-hosted para autenticação e autorização
- **integração Google Calendar/Outlook** — criar eventos quando tarefa tem data
- **integração Slack/Discord** — webhooks disparados em eventos de tarefas
- **PostgreSQL** — um por serviço (tarefas, usuarios, authentik)

O fluxo completo seria:

```
Usuário → Login via Authentik (OAuth2/OIDC) → JWT com roles e grupos
       → Frontend React → Gateway GraphQL
       → GraphQL chama tarefas + gestao-usuarios via REST
       → Ao criar tarefa com data → adapter de calendário cria evento no Google Calendar
       → Ao mudar status da tarefa → dispatcher envia webhook pro Slack/Discord
```

---

## O que foi cortado e por quê

### gestao-usuarios como serviço separado

- O plano era ter um serviço Go separado para users
- Na prática, users é usado quase exclusivamente pelo gateway (login, register, lookup)
- Criar um serviço separado adicionava um pod, um banco e endpoints extras sem ganho real
- Users ficou como tabela no mesmo PostgreSQL, gerenciado pelo gateway
- Se precisar escalar ou separar no futuro, a tabela pode virar seu próprio serviço

### Authentik

- Deploy no k3d funcionou
- Configuração como código (blueprints) não funcionou: a tag `!Find` silenciosamente falha quando o blueprint é montado via ConfigMap (bug da versão 2026.5)
- Tentamos via API, funcionou parcialmente mas dependia de scripts pós-deploy
- Consumiu muito tempo de debug sem retorno proporcional
- Decisão: remover e fazer login próprio

### Google OAuth2

- Implementado: adapter `GoogleAuthProvider`, fluxo completo de authorization code
- Problema: Google aceita `http://localhost` como redirect URI mas não `http://tarefas-ui.localhost`
- Resultado: callback chega em uma origem (`localhost:8080`), frontend está em outra (`tarefas-ui.localhost:8080`), localStorage não é compartilhado entre origens
- Tentativas de contornar (token via hash na URL) geraram problemas de timing no React
- Decisão: manter o adapter no código para uso futuro, usar login próprio por enquanto

### Integração com calendário

- Não implementada
- A estrutura está preparada: campo `provider_id` na tabela users, interface `AuthProvider` aceita novos adapters
- Próximo passo seria: campo `dueDate` na tarefa, armazenar refresh token do Google por usuário, adapter `CalendarProvider`

### Webhooks para Slack/Discord

- Não implementado
- Design pensado: tabela `webhooks(id, user_id, url, events[])`, dispatcher que faz POST nos eventos configurados

---

## O que ficou

### Clean Architecture no backend Go

- A autorização (quem pode editar a tarefa de quem) é lógica de negócio, não lógica de HTTP
- Se ficasse no handler, só testaria subindo servidor
- No use case, testa com mock de repositório, sem banco, sem HTTP
- Camadas: domain → port → usecase → adapter (http, postgres)

### Gateway GraphQL separado do backend

- Frontend precisa de dados de duas fontes (tarefas + users) e de join server-side (ex: nome do responsável na tarefa)
- Centraliza autenticação e autorização coarse-grained
- Backend Go fica independente — recebe JWT, aplica suas próprias regras

### Login próprio (email + senha)

- bcrypt 10 rounds para hash
- JWT HS256 com 1h de expiração
- Cada serviço valida o JWT independentemente (não confia em headers)
- Interface `AuthProvider` mantida para plugar Google OAuth2 quando necessário

### PostgreSQL compartilhado

- Uma instância para dev, tabelas separadas por responsabilidade
- Em produção seria banco separado por serviço (Azure Database for PostgreSQL)

### Kubernetes local com k3d

- Mesmos manifestos que iriam para AKS
- Traefik como ingress, subdomínios `*.localhost`
- Imagens carregadas diretamente no cluster sem registry

---

## Papéis de usuário

- Escolhido no cadastro
- Admin: faz tudo, vê tarefas de qualquer pessoa, pode reatribuir e deletar
- User: cria e gerencia só suas tarefas
- Guest: só visualiza tarefas atribuídas a ele

Autorização aplicada em duas camadas:
- Gateway bloqueia operações impossíveis antes de chamar o backend (ex: guest não pode criar tarefa)
- Backend verifica propriedade no use case (ex: user-1 não pode editar tarefa do user-2)

---

## Resultado final

| Componente | Status |
|---|---|
| tarefas (Go, Clean Architecture, PostgreSQL, REST + Swagger) | implementado |
| graphql (TypeScript, Apollo, JWT, resolvers com role check) | implementado |
| tarefas-ui (React, Vite, login, task list, role-based UI) | implementado |
| Sistema de permissões (admin/user/guest) | implementado |
| Testes automatizados (90 testes, 3 suítes) | implementado |
| Deploy em k3d (Kubernetes local) | implementado |
| gestao-usuarios (serviço separado) | descartado — virou tabela no gateway |
| Authentik | descartado — bug nos blueprints |
| Google OAuth2 | adapter pronto, fluxo bloqueado por cross-origin |
| Integração calendário | não implementado (estrutura preparada) |
| Webhooks Slack/Discord | não implementado |
