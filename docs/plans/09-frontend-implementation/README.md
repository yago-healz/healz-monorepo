# 📁 Plano de Implementação - Frontend Healz

Este diretório contém o **plano de implementação do frontend** dividido em múltiplos documentos para facilitar a navegação e consulta.

## 📚 Estrutura

O plano original de 2020 linhas foi dividido em **8 documentos temáticos**:

### 00 - Índice Principal
**[00-index.md](./00-index.md)** - Índice geral com visão completa e navegação rápida

### 01 - Visão Geral e Estrutura
**[01-overview-and-structure.md](./01-overview-and-structure.md)**
- Visão geral do projeto
- Stack tecnológica
- Estado atual vs. a implementar
- Arquitetura completa de pastas
- Convenções de nomenclatura
- Organização por features

### 02 - Configuração Inicial
**[02-initial-configuration.md](./02-initial-configuration.md)**
- Configuração do Axios com interceptors
- Token Service
- Endpoints constants
- Types globais da API
- Variáveis de ambiente

### 03 - Componentes Shadcn/UI
**[03-shadcn-components.md](./03-shadcn-components.md)**
- Componentes já instalados (~60)
- Componentes adicionais necessários
- Blocks do Shadcn/UI a utilizar
- Padrões de uso
- Customização

### 04 - Queries e Mutations - Auth & Organizations
**[04-queries-mutations-auth-orgs.md](./04-queries-mutations-auth-orgs.md)**
- Auth Feature: queries e mutations completas
- Platform Admin - Organizations: CRUD completo
- Padrões de Query Keys
- Error handling
- Loading states

### 05 - Queries e Mutations - Clinics & Users
**[05-queries-mutations-clinics-users.md](./05-queries-mutations-clinics-users.md)**
- Platform Admin - Clinics: CRUD completo + transfer
- Platform Admin - Users: CRUD + ações administrativas
- Padrões de paginação
- Gerenciamento de clínicas de usuários

### 06 - Implementação da Tela de Login
**[06-login-implementation.md](./06-login-implementation.md)**
- Componente LoginForm
- Rota de Login
- Layout Público
- Forgot Password flow
- Reset Password flow
- Verify Email flow
- Guards de autenticação

### 07 - Implementação do Dashboard Admin
**[07-dashboard-implementation.md](./07-dashboard-implementation.md)**
- Layout Autenticado com Sidebar
- Sidebar Component + UserNav
- App Header
- Dashboard Overview
- Organizations, Clinics, Users Tables e Pages

### 08 - Cronograma e Notas Técnicas
**[08-schedule-and-notes.md](./08-schedule-and-notes.md)**
- Cronograma detalhado (8 fases, 12-19 dias)
- Notas técnicas importantes
- Refresh token strategy
- Multi-tenancy e context switching
- Tanstack Query best practices
- Próximos passos
- Apêndices e referências

## 🚀 Como Usar

### Início Rápido
1. Comece pelo **[00-index.md](./00-index.md)** para ter visão geral
2. Leia **[01-overview-and-structure.md](./01-overview-and-structure.md)** para entender a arquitetura
3. Siga a ordem dos documentos conforme necessário

### Por Fase de Implementação
- **Fase 1 (Setup):** Documentos 02 e 03
- **Fase 2 (Auth):** Documentos 04 e 06
- **Fase 3-7 (Features):** Documentos 05 e 07
- **Planejamento:** Documento 08

## 📊 Estimativa

**Tempo total:** 12-19 dias de desenvolvimento

| Fase | Dias | Documentos |
|------|------|------------|
| Configuração Base | 1-2 | 02, 03 |
| Autenticação | 2-3 | 04, 06 |
| Layout e Navegação | 1-2 | 07 |
| Organizations | 2-3 | 04, 07 |
| Clinics | 2-3 | 05 |
| Users | 2-3 | 05 |
| Dashboard Overview | 1 | 07 |
| Refinamentos | 1-2 | 08 |

## 📝 Navegação

Cada documento possui:
- **Links de navegação** no topo e rodapé
- **Índice interno** com seções
- **Links para documentos relacionados**
- **Exemplos de código completos**
- **Checklists de implementação**

## 🔗 Links Úteis

- [Tanstack Router](https://tanstack.com/router)
- [Tanstack Query](https://tanstack.com/query)
- [Shadcn/UI](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

## 📌 Nota

O arquivo original está disponível como backup em:
`../09-frontend-implementation.md.backup`

---

**Comece sua jornada:** [00-index.md](./00-index.md) 🎯
