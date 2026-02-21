# Plano 022 — Fix: Serialização de ícones corrompendo dados de objetivos

**Objetivo:** Corrigir o bug onde `priorities` e `pain_points` são salvos como `[[], [], []]` ao salvar os objetivos da clínica, causando itens sem texto na UI.

---

## Contexto

### Root Cause

O tipo `Priority` no frontend (`src/types/onboarding.ts`) inclui um campo `icon: ReactNode`. Quando o componente chama `saveObjectives({ priorities, painPoints, ... })`, os arrays incluem React elements (JSX) no campo `icon`.

O problema ocorre no pipeline do backend:

1. Axios serializa o payload com `JSON.stringify`
2. Um React element (`<DollarSign className="w-5 h-5" />`) **não é serializável** como JSON
3. O NestJS tem `transform: true` + `enableImplicitConversion: true` no `ValidationPipe`
4. O `class-transformer` tenta converter cada elemento do array `priorities` para o tipo `Array` (que é o que `design:type` registra em runtime para `Priority[]`, pois TypeScript apaga generics)
5. `Array.from({ id: 'revenue', title: '...' })` → `[]` (objeto sem `length` nem `Symbol.iterator` vira array vazio)
6. Resultado: `[[], [], []]` salvo no banco

### Evidências

- `DEFAULT_PRIORITIES` tem 3 items → `priorities` salvo como `[[], [], []]` (3 arrays vazios)
- `DEFAULT_PAIN_POINTS` tem 4 items → `pain_points` salvo como `[[], [], [], []]` (4 arrays vazios)
- O backend `Priority` interface **não** tem campo `icon` — apenas `{ id, title, description }`

### Arquivos relevantes

| Arquivo | Papel |
|---|---|
| `apps/web/src/features/clinic/components/settings/tabs/objectives-tab.tsx` | Componente com o bug |
| `apps/web/src/types/onboarding.ts` | Tipos `Priority` e `PainPoint` |
| `apps/api/src/clinic-settings/dto/clinic-objectives.dto.ts` | DTO do backend (sem `icon`) |
| `apps/api/src/main.ts` | ValidationPipe com `transform: true` |

---

## Arquivos afetados

| Operação | Arquivo |
|---|---|
| Modificar | `apps/web/src/features/clinic/components/settings/tabs/objectives-tab.tsx` |

Só este arquivo precisa mudar. Os tipos `Priority`/`PainPoint` têm `icon: ReactNode` que serve corretamente para a UI — o problema é que o `icon` não deve ser enviado para a API.

---

## Implementação

### 1. Criar mapas de ícones por `id`

No início do arquivo `objectives-tab.tsx`, após os imports, criar dois mapas estáticos que associam cada `id` ao seu ícone React:

```tsx
const PRIORITY_ICON_MAP: Record<string, React.ReactNode> = {
  revenue:   <DollarSign className="w-5 h-5" />,
  retention: <Users className="w-5 h-5" />,
  efficiency: <Zap className="w-5 h-5" />,
}

const PAIN_POINT_ICON_MAP: Record<string, React.ReactNode> = {
  'no-shows':   <CalendarX className="w-5 h-5" />,
  'follow-ups': <Phone className="w-5 h-5" />,
  conflicts:    <Calendar className="w-5 h-5" />,
  intake:       <UserPlus className="w-5 h-5" />,
}
```

### 2. Corrigir `handleSave` — strip dos ícones antes de enviar

Alterar o `handleSave` para enviar apenas os campos serializáveis (sem `icon`):

```tsx
const handleSave = async () => {
  saveObjectives({
    priorities: priorities.map(({ icon: _icon, ...rest }) => rest),
    painPoints: painPoints.map(({ icon: _icon, ...rest }) => rest),
    additionalNotes,
  })
}
```

Isso garante que `{ id, title, description }` e `{ id, title, description, selected }` são enviados — exatamente o que o backend espera.

### 3. Corrigir `useEffect` — restaurar ícones ao carregar dados salvos

Alterar o `useEffect` para re-mapear os ícones a partir do `id` quando dados chegam da API:

```tsx
useEffect(() => {
  if (savedData) {
    const loadedPriorities = savedData.priorities.length > 0
      ? savedData.priorities.map(p => ({
          ...p,
          icon: PRIORITY_ICON_MAP[p.id] ?? null,
        }))
      : DEFAULT_PRIORITIES

    const loadedPainPoints = savedData.painPoints.length > 0
      ? savedData.painPoints.map(p => ({
          ...p,
          icon: PAIN_POINT_ICON_MAP[p.id] ?? null,
        }))
      : DEFAULT_PAIN_POINTS

    setPriorities(loadedPriorities)
    setPainPoints(loadedPainPoints)
    setAdditionalNotes(savedData.additionalNotes || '')
  }
}, [savedData])
```

---

## Ordem de execução

Tudo em um único arquivo, sequencial:

1. Adicionar `PRIORITY_ICON_MAP` e `PAIN_POINT_ICON_MAP`
2. Corrigir `handleSave` (strip de `icon`)
3. Corrigir `useEffect` (restaurar `icon` via map)

---

## Fora do escopo

- Alterações no backend (DTO, schema, service) — já está correto
- Alterações nos tipos `Priority`/`PainPoint` em `onboarding.ts` — manter `icon: ReactNode` para uso interno da UI
- Limpeza dos dados corrompidos no banco — os dados existentes (`[[], [], []]`) serão sobrescritos na próxima vez que o usuário salvar
