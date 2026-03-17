# Tarefa 01 — Atualizar schema da rota

**Objetivo:** Substituir o schema flat de 7 tabs pelo novo schema de dois níveis (`mainTab` + `subTab`), mantendo os params OAuth do Google Calendar.

---

## Arquivo

`apps/web/src/routes/_authenticated/clinic/settings.tsx`

## Implementação

Substituir o conteúdo atual por:

```ts
import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { UnifiedSettingsPage } from '@/features/clinic/components/settings/unified-settings-page'
import { tokenService } from '@/services/token.service'

const CAROL_SUBTABS = ['identidade', 'comportamento', 'contexto'] as const
const CLINICA_SUBTABS = ['geral', 'servicos', 'agenda', 'pagamento', 'conectores', 'notificacoes'] as const

const settingsSearchSchema = z.object({
  mainTab: z.enum(['carol', 'clinica']).optional().catch('carol'),
  subTab: z.string().optional(),
  gcal: z.enum(['pending-calendar-selection', 'error']).optional(),
  reason: z.string().optional(),
})

export type SettingsSearch = z.infer<typeof settingsSearchSchema>
export type CarolSubTab = typeof CAROL_SUBTABS[number]
export type ClinicaSubTab = typeof CLINICA_SUBTABS[number]
export { CAROL_SUBTABS, CLINICA_SUBTABS }

export const Route = createFileRoute('/_authenticated/clinic/settings')({
  beforeLoad: () => {
    const user = tokenService.getUser()
    const role = user?.activeClinic?.role
    if (role !== 'admin' && role !== 'manager') {
      throw redirect({ to: '/clinic' })
    }
  },
  validateSearch: settingsSearchSchema,
  component: UnifiedSettingsPage,
})
```

### Por que `subTab: z.string()` em vez de enum?

As sub-abas válidas dependem de `mainTab`. Usar string genérico evita union complexo no Zod e o componente faz o `catch` para o default correto por aba.

## Critério de conclusão

- Rota `/clinic/settings?mainTab=carol` e `/clinic/settings?mainTab=clinica` ambas resolvem
- Build sem erros de tipo
