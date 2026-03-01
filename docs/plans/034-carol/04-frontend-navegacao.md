# Fase 04 — Frontend: Navegação + Rotas

## Objetivo

Adicionar a seção "Carol" no sidebar da clínica com dois sub-itens (Configurações e Playground), criar as rotas correspondentes e remover a aba Carol da página de configurações da clínica.

## Pré-requisitos

- Fase 01 concluída (para que os endpoints existam quando as páginas forem conectadas)

## Pode ser feita em paralelo com

- Fase 05 (Frontend Configurações)
- Fase 06 (Frontend Playground)

---

## Arquivos

### Criar
- `apps/web/src/routes/_authenticated/clinic/carol/settings.tsx`
- `apps/web/src/routes/_authenticated/clinic/carol/playground.tsx`

### Modificar
- `apps/web/src/components/layout/clinic-sidebar.tsx` — adicionar seção Carol
- `apps/web/src/features/clinic/components/settings/clinic-settings-page.tsx` — remover aba Carol
- `apps/web/src/lib/api/clinic-settings-endpoints.ts` — remover `CAROL`
- `apps/web/src/lib/api/endpoints.ts` — adicionar seção `CAROL`

---

## 1. Sidebar

Adicionar nova seção "Carol" ao `clinic-sidebar.tsx`:

```typescript
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  Bot,          // ícone para Carol
  MessageSquare, // ícone para Playground
} from 'lucide-react'

const navigation = [
  {
    title: 'Principal',
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, href: '/clinic' },
      { title: 'Membros', icon: Users, href: '/clinic/members' },
      { title: 'Agenda', icon: Calendar, href: '/clinic/schedule' },
    ],
  },
  {
    title: 'Carol',  // NOVA SEÇÃO
    items: [
      { title: 'Configurações', icon: Settings, href: '/clinic/carol/settings' },
      { title: 'Playground', icon: MessageSquare, href: '/clinic/carol/playground' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { title: 'Clínica', icon: Settings, href: '/clinic/settings' },
    ],
  },
]
```

---

## 2. Rotas

### `/clinic/carol/settings`

```typescript
// routes/_authenticated/clinic/carol/settings.tsx

import { createFileRoute } from '@tanstack/react-router'
import { CarolSettingsPage } from '@/features/carol/components/carol-settings-page'

export const Route = createFileRoute('/_authenticated/clinic/carol/settings')({
  component: CarolSettingsPage,
})
```

### `/clinic/carol/playground`

```typescript
// routes/_authenticated/clinic/carol/playground.tsx

import { createFileRoute } from '@tanstack/react-router'
import { CarolPlaygroundPage } from '@/features/carol/components/carol-playground-page'

export const Route = createFileRoute('/_authenticated/clinic/carol/playground')({
  component: CarolPlaygroundPage,
})
```

**Nota:** Os componentes `CarolSettingsPage` e `CarolPlaygroundPage` serão criados nas Fases 05 e 06. Para esta fase, podem ser placeholders simples:

```typescript
export function CarolSettingsPage() {
  return <div>Carol Configurações — em breve</div>
}

export function CarolPlaygroundPage() {
  return <div>Carol Playground — em breve</div>
}
```

---

## 3. Remover Aba Carol do Settings

### `clinic-settings-page.tsx`

Remover `'carol'` do array de tabs e a renderização condicional:

```diff
 const tabs = [
   { id: 'geral', label: 'Geral' },
   { id: 'objetivos', label: 'Objetivos' },
   { id: 'servicos', label: 'Serviços' },
   { id: 'agendamentos', label: 'Agendamentos' },
-  { id: 'carol', label: 'Carol' },
   { id: 'notificacoes', label: 'Notificações' },
   { id: 'conectores', label: 'Conectores' },
 ] as const
```

Remover:
```diff
-  {activeTab === 'carol' && <CarolTab />}
```

Remover import de `CarolTab`.

### `routes/_authenticated/clinic/settings.tsx`

Remover `'carol'` do `TAB_IDS`:
```diff
-const TAB_IDS = ['geral', 'objetivos', 'servicos', 'agendamentos', 'carol', 'notificacoes', 'conectores'] as const
+const TAB_IDS = ['geral', 'objetivos', 'servicos', 'agendamentos', 'notificacoes', 'conectores'] as const
```

---

## 4. Endpoints

### Remover de `clinic-settings-endpoints.ts`:

```diff
-  CAROL: (clinicId: string) => `/clinics/${clinicId}/settings/carol`,
```

### Adicionar a `endpoints.ts`:

```typescript
// Em ENDPOINTS
CAROL: {
  CONFIG: (clinicId: string) => `/clinics/${clinicId}/carol/config`,
  CONFIG_PUBLISHED: (clinicId: string) => `/clinics/${clinicId}/carol/config/published`,
  PUBLISH: (clinicId: string) => `/clinics/${clinicId}/carol/config/publish`,
  CHAT: (clinicId: string) => `/clinics/${clinicId}/carol/chat`,
},
```

---

## 5. Feature Directory

Criar a estrutura da feature `carol`:

```
apps/web/src/features/carol/
├── api/
│   └── carol.api.ts           (Fase 05 e 06)
├── components/
│   ├── carol-settings-page.tsx (Fase 05 — placeholder aqui)
│   └── carol-playground-page.tsx (Fase 06 — placeholder aqui)
└── types.ts                    (Fase 05)
```

---

## Checklist

- [ ] Adicionar seção "Carol" no `clinic-sidebar.tsx`
- [ ] Criar rota `/clinic/carol/settings` com placeholder
- [ ] Criar rota `/clinic/carol/playground` com placeholder
- [ ] Remover aba Carol do `clinic-settings-page.tsx`
- [ ] Remover `'carol'` do `TAB_IDS` no route de settings
- [ ] Remover `CAROL` de `clinic-settings-endpoints.ts`
- [ ] Adicionar `CAROL` a `endpoints.ts`
- [ ] Criar diretório `features/carol/` com estrutura base
- [ ] O arquivo `carol-tab.tsx` pode ser deletado
- [ ] Verificar que navegação funciona sem erros
