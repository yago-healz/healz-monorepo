# Tarefa 02 — Criar UnifiedSettingsPage

**Objetivo:** Criar o container principal da página unificada com abas horizontais (Carol | Clínica), coluna de conteúdo e painel Playground fixo à direita (só visível na aba Carol).

---

## Arquivo a criar

`apps/web/src/features/clinic/components/settings/unified-settings-page.tsx`

## Estrutura visual

```
┌─────────────────────────────────────────────────────────────┐
│  Header: título + badge status Carol + botões Playground/Publicar │
│  (visíveis apenas quando mainTab === 'carol')                │
├─────────────────────────────────────────────────────────────┤
│  [Carol]  [Clínica]   ← abas horizontais principais         │
├──────────────────────────────────┬──────────────────────────┤
│  Sub-nav vertical (esq)          │  Playground (direita)    │
│  + Conteúdo da sub-aba           │  (só na aba Carol,       │
│                                  │   toggle-able)            │
└──────────────────────────────────┴──────────────────────────┘
```

## Implementação

```tsx
// apps/web/src/features/clinic/components/settings/unified-settings-page.tsx

import { cn } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Route } from '@/routes/_authenticated/clinic/settings'
import { CarolTab } from '@/features/carol/components/carol-tab'
import { ClinicaTab } from './clinica-tab'

const MAIN_TABS = [
  { id: 'carol', label: 'Carol' },
  { id: 'clinica', label: 'Clínica' },
] as const

export function UnifiedSettingsPage() {
  const { mainTab = 'carol' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  function handleMainTabChange(tab: 'carol' | 'clinica') {
    // Ao trocar de aba principal, reseta subTab para o default de cada aba
    navigate({
      search: (prev) => ({ ...prev, mainTab: tab, subTab: undefined }),
      replace: true,
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Abas horizontais principais */}
      <div className="border-b flex-none">
        <nav className="flex gap-1 px-1">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleMainTabChange(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                mainTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 overflow-hidden pt-4">
        {mainTab === 'carol' && <CarolTab />}
        {mainTab === 'clinica' && <ClinicaTab />}
      </div>
    </div>
  )
}
```

## Critério de conclusão

- Abas Carol e Clínica renderizam sem erro
- Trocar de aba atualiza a URL corretamente
- Sub-abas de cada aba não são afetadas ao trocar de aba principal
