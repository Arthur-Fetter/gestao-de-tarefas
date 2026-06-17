## Gateway GraphQL

O gateway é um servidor Apollo Server em TypeScript. Ele faz três coisas:

1. Registro e login com email/senha e emissão de JWT
2. Bloqueia guests de fazer mutations e bloqueia delete para usuários que não forem admins
3. Resolve os campos "assigneeName" e "assigneeEmail" juntando dados de usuários do banco PostgreSQL com as tarefas do backend
