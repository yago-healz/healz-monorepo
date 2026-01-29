# Stack Tecnológica

## Backend

- **Runtime**: Node.js com NestJS + TypeScript
- **Banco de dados**: PostgreSQL
- **ORM**: Drizzle
- **Mensageria**: BullMQ + Redis
- **IA**: LangChain (orquestração de IA)
- **WhatsApp**: Evolution API

## Frontend (Dashboard Clínicas)

- **Framework**: React + Vite
- **State**: TanStack Query
- **UI**: ShadcnUI + Tailwind CSS

## Infraestrutura

Definir

## Decisões técnicas importantes

### Por que Evolution API ao invés de Meta Cloud API/Twilio?

- ✅ Open source e self-hosted
- ✅ Maior flexibilidade e customização
- ✅ Sem restrições de templates
- ✅ Custo mais controlável

### Por que LangChain?

- ✅ Orquestração robusta de modelos de IA
- ✅ Ferramentas e integrações prontas
- ✅ Escalabilidade para múltiplos agentes
- ✅ Abstrações úteis para RAG e memória

### Por que Drizzle ao invés de Prisma/TypeORM?

- ✅ Performance superior
- ✅ Type-safety completo
- ✅ SQL-first approach (mais controle)
- ✅ Migrations mais transparentes
