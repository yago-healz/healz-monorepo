# Healz Monorepo

Plataforma de gestão de saúde multi-tenant com NestJS e React.

## Estrutura

```
healz-monorepo/
├── apps/
│   ├── api/          # NestJS API
│   └── web/          # React + Vite
├── packages/
│   └── shared/       # Tipos compartilhados
├── docker/           # Docker Compose
└── docs/            # Documentação técnica
```

## Pré-requisitos

- Node.js 18+
- pnpm 9.15.0
- Docker e Docker Compose

## Setup Inicial

```bash
# Instalar dependências
pnpm install

# Subir infraestrutura local (PostgreSQL + Redis)
pnpm docker:up

# Copiar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
```

## Desenvolvimento

```bash
# Rodar todos os apps em modo desenvolvimento
pnpm dev

# Rodar apenas a API
pnpm --filter @healz/api dev

# Rodar apenas o frontend
pnpm --filter @healz/web dev
```

## Build

```bash
# Build de todos os apps
pnpm build

# Build da API
pnpm --filter @healz/api build

# Build do frontend
pnpm --filter @healz/web build
```

## Banco de Dados

```bash
# Push do schema para o banco
pnpm db:push

# Gerar migrações
pnpm db:migrate

# Abrir Drizzle Studio
pnpm db:studio
```

## Docker

```bash
# Subir containers
pnpm docker:up

# Parar containers
pnpm docker:down

# Ver logs
pnpm docker:logs
```

## API Endpoints

Depois de rodar `pnpm dev`, a API estará disponível em:

- **Health Check**: http://localhost:3001/health

## Frontend

Frontend disponível em: http://localhost:3000

## Documentação

Consulte a pasta `/docs` para documentação técnica detalhada:

- [Decisões Técnicas](docs/TECHNICAL_DECISIONS.md)
- [Modelagem de Dados](docs/DATA_MODELING.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Setup do Monorepo](docs/IMPLEMENTATION_SETUP.md)
- [Deploy Strategy](docs/IMPLEMENTATION_DEPLOYMENT.md)
