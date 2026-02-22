# Plano 031 — Persistência de Aba nas Configurações da Clínica via Query Params

**Objetivo:** Persistir a aba ativa da página de configurações da clínica via query param `?tab=`, permitindo que o usuário recarregue a página e permaneça na mesma aba, e que qualquer parte da aplicação navegue diretamente para uma aba específica.

---

## Contexto

A página `/clinic/settings` usa `useState` local para controlar a aba ativa. Ao recarregar a página, o estado é perdido e a aba volta para `geral` (padrão). O projeto usa Tanstack Router com suporte a `validateSearch` + Zod para query params tipados, conforme o padrão já existente em `/_public/reset-password` e `/_public/accept-invite`.

## Arquivos afetados

| Arquivo | Operação |
|---|---|
| `apps/web/src/routes/_authenticated/clinic/settings.tsx` | Modificar — adicionar `validateSearch` com schema Zod |
| `apps/web/src/features/clinic/components/settings/clinic-settings-page.tsx` | Modificar — substituir `useState` por leitura/escrita do query param |

## Implementação

### 1. Adicionar `validateSearch` na rota

**Arquivo:** `apps/web/src/routes/_authenticated/clinic/settings.tsx`

Definir um schema Zod com o campo `tab` opcional (com fallback para `'geral'`):

```ts
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ClinicSettingsPage } from '@/features/clinic/components/settings/clinic-settings-page'

const TAB_IDS = ['geral', 'objetivos', 'servicos', 'agendamentos', 'carol', 'notificacoes', 'conectores'] as const

const settingsSearchSchema = z.object({
  tab: z.enum(TAB_IDS).optional().catch('geral'),
})

export const Route = createFileRoute('/_authenticated/clinic/settings')({
  validateSearch: settingsSearchSchema,
  component: ClinicSettingsPage,
})
```

- `z.enum(TAB_IDS)` garante que apenas tabs válidas são aceitas
- `.catch('geral')` faz fallback silencioso para `geral` se o valor for inválido
- `.optional()` permite URL sem `?tab=` também cair no fallback

### 2. Substituir `useState` por query param no componente

**Arquivo:** `apps/web/src/features/clinic/components/settings/clinic-settings-page.tsx`

Substituir:
```ts
// Antes
import { useState } from 'react'
const [activeTab, setActiveTab] = useState<string>('geral')
```

Por:
```ts
// Depois
import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/_authenticated/clinic/settings'

const { tab: activeTab = 'geral' } = Route.useSearch()
const navigate = useNavigate({ from: Route.fullPath })

function handleTabChange(tabId: string) {
  navigate({ search: (prev) => ({ ...prev, tab: tabId }), replace: true })
}
```

- `Route.useSearch()` lê o query param tipado
- `navigate({ replace: true })` atualiza o URL sem adicionar entrada no histórico
- `from: Route.fullPath` garante que o navigate está ancorado na rota correta

Substituir `onClick={() => setActiveTab(tab.id)}` por `onClick={() => handleTabChange(tab.id)}`.

## Exemplos de uso após a implementação

```
# Abrir diretamente na aba de agendamentos
/clinic/settings?tab=agendamentos

# Navegar programaticamente de outro componente
import { useNavigate } from '@tanstack/react-router'
const navigate = useNavigate()
navigate({ to: '/clinic/settings', search: { tab: 'servicos' } })
```

## Ordem de execução

1. **Task 1** — Modificar `settings.tsx` (adicionar `validateSearch`)
2. **Task 2** — Modificar `clinic-settings-page.tsx` (substituir `useState`) ← depende da Task 1 para tipagem

> Tasks 1 e 2 podem ser feitas na mesma sessão. Task 2 depende do tipo exportado pela rota em Task 1.

## Critérios de aceite

- [ ] Recarregar `/clinic/settings?tab=servicos` mantém a aba "Serviços" ativa
- [ ] Recarregar `/clinic/settings` (sem query param) abre a aba "Geral"
- [ ] `?tab=invalido` faz fallback silencioso para "Geral"
- [ ] Trocar de aba atualiza o URL sem adicionar entradas extras no histórico do browser
- [ ] É possível navegar para uma aba específica via `useNavigate` de outro componente

## Fora do escopo

- Animações de transição entre abas
- Sincronização do título da página (`<title>`) com a aba ativa
- Histórico de navegação entre abas (back/forward — usa `replace: true` intencionalmente)
