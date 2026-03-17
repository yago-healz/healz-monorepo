# Tarefa 04 — Criar ClinicaTab

**Objetivo:** Criar o container da aba Clínica com sub-navegação vertical e 6 sub-abas: Geral, Serviços, Agenda, Pagamento, Conectores, Notificações.

---

## Arquivo a criar

`apps/web/src/features/clinic/components/settings/clinica-tab.tsx`

## Sub-abas e componentes mapeados

| Sub-aba | Componente existente | Ação |
|---|---|---|
| Geral | `GeneralTab` | Importar diretamente |
| Serviços | `ServicesTab` | Importar diretamente |
| Agenda | `SchedulingTab` | Importar diretamente |
| Pagamento | `PaymentMethodsTab` | Importar diretamente |
| Conectores | `ConnectorsTab` | Importar diretamente |
| Notificações | `NotificationsTab` | Importar diretamente |

A aba "Objetivos" (`ObjectivesTab`) **não aparece mais aqui** — migrou para Carol > Contexto da Clínica.

## Implementação

```tsx
// apps/web/src/features/clinic/components/settings/clinica-tab.tsx
import { cn } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import { GeneralTab } from './tabs/general-tab'
import { ServicesTab } from './tabs/services-tab'
import { SchedulingTab } from './tabs/scheduling-tab'
import { PaymentMethodsTab } from './tabs/payment-methods-tab'
import { ConnectorsTab } from './tabs/connectors-tab'
import { NotificationsTab } from './tabs/notifications-tab'
import { Route } from '@/routes/_authenticated/clinic/settings'
import type { ClinicaSubTab } from '@/routes/_authenticated/clinic/settings'

const SUB_TABS: { id: ClinicaSubTab; label: string }[] = [
  { id: 'geral', label: 'Geral' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'conectores', label: 'Conectores' },
  { id: 'notificacoes', label: 'Notificações' },
]

export function ClinicaTab() {
  const { subTab } = Route.useSearch()
  const activeSubTab: ClinicaSubTab = (subTab as ClinicaSubTab) ?? 'geral'
  const navigate = useNavigate({ from: Route.fullPath })

  function handleSubTabChange(tab: ClinicaSubTab) {
    navigate({ search: (prev) => ({ ...prev, subTab: tab }), replace: true })
  }

  return (
    <div className="flex gap-8 h-full overflow-hidden">
      <nav className="w-44 shrink-0 flex flex-col gap-1">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSubTabChange(tab.id)}
            className={cn(
              'w-full text-left rounded-md px-3 py-2 text-sm font-medium transition-colors',
              activeSubTab === tab.id
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-w-0 overflow-y-auto pb-6">
        {activeSubTab === 'geral' && <GeneralTab />}
        {activeSubTab === 'servicos' && <ServicesTab />}
        {activeSubTab === 'agenda' && <SchedulingTab />}
        {activeSubTab === 'pagamento' && <PaymentMethodsTab />}
        {activeSubTab === 'conectores' && <ConnectorsTab />}
        {activeSubTab === 'notificacoes' && <NotificationsTab />}
      </div>
    </div>
  )
}
```

## Ajuste necessário no ConnectorsTab

`ConnectorsTab` atualmente importa `Route` de `@/routes/_authenticated/clinic/settings` e chama `Route.useSearch()` para ler os params `gcal` e `reason`. Isso **continua funcionando** após a unificação porque a rota é a mesma — nenhuma mudança necessária no arquivo `connectors-tab.tsx`.

Apenas verificar que o `navigate` dentro do ConnectorsTab preserva o `mainTab` ao limpar os params OAuth:

```ts
// connectors-tab.tsx — linha existente, verificar se preserva mainTab:
navigate({ search: (prev) => ({ tab: prev.tab }), replace: true })

// Atualizar para:
navigate({ search: (prev) => ({ mainTab: prev.mainTab, subTab: prev.subTab }), replace: true })
```

## Critério de conclusão

- 6 sub-abas renderizam corretamente
- Sub-aba Notificações está presente (não há mais aba "Notificações" separada no topo)
- ConnectorsTab processa o callback OAuth sem quebrar
- Não há mais sub-aba "Objetivos" na aba Clínica
