# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev            # Dev server on port 3000
pnpm build          # TypeScript check + Vite build
pnpm lint           # ESLint
pnpm preview        # Preview production build
pnpm clean          # Remove dist/

# Type check only (no emit)
pnpm exec tsc -b --noEmit

# From monorepo root
pnpm dev            # Both API (3001) + Web (3000)
```

## Architecture

**Stack:** React 18, TypeScript 5, Vite 6, Tanstack Router + Query v5, Shadcn/UI + Tailwind CSS v4, React Hook Form + Zod, Axios.

**Shared package:** `@healz/shared` (workspace dependency) provides shared types/utilities between apps.

### Directory Layout

- `src/routes/` — File-based routing (Tanstack Router). `routeTree.gen.ts` is auto-generated — never edit it.
- `src/features/` — Feature modules: `auth`, `platform-admin`, `clinic`, `carol`
- `src/components/ui/` — Shadcn/UI components (New York style)
- `src/components/layout/` — App shell (sidebars, headers, nav)
- `src/hooks/` — Shared hooks
- `src/lib/api/` — Axios instance + endpoint constants
- `src/services/` — Token service
- `src/types/` — Centralized types with index.ts re-exports

### Feature Module Structure

Each feature follows this pattern:
```
features/<name>/
  api/          # useQuery/useMutation hooks + API functions
  components/   # Feature-specific components
  hooks/        # Feature-specific hooks
  types.ts      # Feature types (optional)
  index.ts      # Re-exports
```

### Routing

Tanstack Router with file-based routing and auto code-splitting:

- `__root.tsx` — Root layout (QueryClient provider, DevTools)
- `_public.tsx` — Public layout, redirects authenticated users away
- `_authenticated.tsx` — Auth guard, redirects to `/login` if unauthenticated
- `_authenticated/admin.tsx` — Platform admin layout (AppSidebar)
- `_authenticated/clinic.tsx` — Clinic staff layout (ClinicSidebar)

Route files under `_authenticated/admin/` and `_authenticated/clinic/` define nested pages.

### API Layer

- **Axios instance** (`src/lib/api/axios.ts`): Request interceptor adds `Authorization` header; response interceptor auto-refreshes on 401.
- **Endpoints** (`src/lib/api/endpoints.ts`): All API paths as typed constants. Base URL from `VITE_API_URL` env var (default: `http://localhost:3001/api/v1`).
- **Query hooks** in each feature's `api/` folder use Tanstack Query with key patterns like `['feature', 'resource', params]`.

### Auth

- Access token: `localStorage` key `healz_access_token`
- Refresh token: httpOnly cookie (backend-managed)
- User data: `localStorage` key `healz_user`
- Token management: `src/services/token.service.ts`
- On 401: auto-refresh via `/auth/refresh`, retry request; on failure: clear + redirect to `/login`

## Conventions

- **File naming:** kebab-case for files, PascalCase for components, `use-kebab-case` for hooks
- **Imports:** Use `@/` path alias (maps to `src/`)
- **UI components:** Shadcn/UI from `@/components/ui/`, icons from `lucide-react`
- **Notifications:** Sonner toast (`sonner`)
- **Date utilities:** `date-fns`
- **TypeScript:** Strict mode enabled, `noUnusedLocals` and `noUnusedParameters` enforced
- **Vite plugins order:** Tanstack Router plugin must come before React plugin in `vite.config.ts`
