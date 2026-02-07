# Plano de Implementação - Frontend Healz

**Status:** Proposta
**Data:** 2026-02-07
**Versão:** 1.0

## Visão Geral

Este plano foi dividido em múltiplos documentos para facilitar a navegação e implementação. Cada documento foca em um aspecto específico da implementação do frontend.

## Documentos do Plano

### 📋 [01 - Visão Geral e Estrutura do Projeto](./01-overview-and-structure.md)
- Visão geral do projeto
- Stack tecnológica
- Estado atual vs. a implementar
- Arquitetura de pastas completa
- Convenções de nomenclatura

### ⚙️ [02 - Configuração Inicial](./02-initial-configuration.md)
- Configuração do Axios com interceptors
- Token Service
- Endpoints constants
- Types globais da API (User, Auth, Organization, Clinic, etc.)

### 🎨 [03 - Componentes Shadcn/UI](./03-shadcn-components.md)
- Componentes já instalados
- Componentes adicionais necessários
- Blocks do Shadcn/UI a utilizar

### 🔐 [04 - Queries e Mutations - Auth & Organizations](./04-queries-mutations-auth-orgs.md)
- Auth Feature: queries e mutations
- Platform Admin - Organizations: queries e mutations

### 🏥 [05 - Queries e Mutations - Clinics & Users](./05-queries-mutations-clinics-users.md)
- Platform Admin - Clinics: queries e mutations
- Platform Admin - Users: queries e mutations

### 🔑 [06 - Implementação da Tela de Login](./06-login-implementation.md)
- Componente LoginForm
- Rota de Login
- Layout Público
- Guards de autenticação

### 📊 [07 - Implementação do Dashboard Admin](./07-dashboard-implementation.md)
- Layout Autenticado com Sidebar
- Sidebar Component
- Dashboard Overview
- Organizations Table e Page

### 📅 [08 - Cronograma e Notas Técnicas](./08-schedule-and-notes.md)
- Cronograma de implementação (8 fases)
- Notas técnicas importantes
- Próximos passos
- Apêndices e referências

## Como Usar Este Plano

1. **Leia primeiro** o documento [01 - Visão Geral e Estrutura](./01-overview-and-structure.md) para entender o contexto geral
2. **Configure a base** seguindo [02 - Configuração Inicial](./02-initial-configuration.md)
3. **Instale componentes** conforme [03 - Componentes Shadcn/UI](./03-shadcn-components.md)
4. **Implemente features** seguindo os documentos 04-07 na ordem
5. **Consulte o cronograma** em [08 - Cronograma e Notas Técnicas](./08-schedule-and-notes.md) para planejar as fases

## Estimativa Total

**12-19 dias** de desenvolvimento divididos em 8 fases principais.

## Navegação Rápida

| Fase | Documento | Tempo Estimado |
|------|-----------|----------------|
| Setup | [02 - Configuração](./02-initial-configuration.md) | 1-2 dias |
| Auth | [04 - Auth Queries](./04-queries-mutations-auth-orgs.md) + [06 - Login](./06-login-implementation.md) | 2-3 dias |
| Layout | [07 - Dashboard](./07-dashboard-implementation.md) | 1-2 dias |
| Organizations | [04 - Org Queries](./04-queries-mutations-auth-orgs.md) + [07 - Dashboard](./07-dashboard-implementation.md) | 2-3 dias |
| Clinics | [05 - Clinics Queries](./05-queries-mutations-clinics-users.md) | 2-3 dias |
| Users | [05 - Users Queries](./05-queries-mutations-clinics-users.md) | 2-3 dias |
| Dashboard | [07 - Dashboard](./07-dashboard-implementation.md) | 1 dia |
| Refinamentos | [08 - Notas](./08-schedule-and-notes.md) | 1-2 dias |

---

**Próximo passo:** Comece lendo [01 - Visão Geral e Estrutura do Projeto](./01-overview-and-structure.md)
