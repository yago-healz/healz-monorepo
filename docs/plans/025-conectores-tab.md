# Plano 025 — Aba Conectores da Clínica

**Objetivo:** Implementar a aba "Conectores" nas configurações da clínica, exibindo Google Calendar e WhatsApp como integrações disponíveis, inspirada na página de conectores do Claude.

---

## Contexto

A aba "Conectores" já existe como placeholder em `clinic-settings-page.tsx` (linha 72). Precisa ser substituída por um componente real que exibe as integrações disponíveis com status visual (conectado/desconectado) e ação de vincular/desvincular.

**Referência visual (Claude connectors page):**
- Lista de conectores com ícone + nome à esquerda
- Status "Conectado" em destaque (verde/azul) + menu `⋯` quando vinculado
- Botão "Vincular" quando não vinculado
- Sem "Navegar conectores" nem "Adicionar conector personalizado"

**Padrão dos outros tabs:**
- `tokenService.getUser()?.activeClinic?.id` para obter `clinicId`
- Hook de query + hook de mutation seguindo `clinic-settings.api.ts`
- Estado local inicializado com `useEffect` a partir dos dados carregados
- `SettingsLoading` para loading state
- Paleta pink: `text-pink-500`, `bg-pink-500`, `border-pink-500`

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/web/src/features/clinic/components/settings/tabs/connectors-tab.tsx` | Criar |
| `apps/web/src/features/clinic/components/settings/clinic-settings-page.tsx` | Modificar (linha 72) |
| `apps/web/src/features/clinic/api/clinic-settings.api.ts` | Modificar (adicionar hooks de conectores) |
| `apps/web/src/lib/api/clinic-settings-endpoints.ts` | Modificar (adicionar endpoint CONNECTORS) |

---

## Implementação

### 1. Adicionar endpoint

Em `apps/web/src/lib/api/clinic-settings-endpoints.ts`, adicionar:

```typescript
CONNECTORS: (clinicId: string) => `/clinics/${clinicId}/settings/connectors`,
```

### 2. Adicionar hooks de API

Em `apps/web/src/features/clinic/api/clinic-settings.api.ts`, adicionar:

```typescript
// Types
interface ConnectorStatus {
  googleCalendar: boolean
  whatsapp: boolean
}

// Query
export function useClinicConnectors(clinicId: string) {
  return useQuery({
    queryKey: ['clinic-connectors', clinicId],
    queryFn: async () => {
      const { data } = await api.get<ConnectorStatus>(
        CLINIC_SETTINGS_ENDPOINTS.CONNECTORS(clinicId)
      )
      return data
    },
    enabled: !!clinicId,
  })
}

// Mutation
export function useSaveClinicConnectors(clinicId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ConnectorStatus) => {
      const { data } = await api.patch<ConnectorStatus>(
        CLINIC_SETTINGS_ENDPOINTS.CONNECTORS(clinicId),
        payload
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-connectors', clinicId] })
      toast.success('Conectores atualizados com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao atualizar conectores. Tente novamente.')
    },
  })
}
```

> **Nota:** Se o endpoint não existir no backend ainda, o tab funciona graciosamente — o `useQuery` retornará erro silencioso e o estado padrão (tudo desconectado) será exibido.

### 3. Criar `connectors-tab.tsx`

**Arquivo:** `apps/web/src/features/clinic/components/settings/tabs/connectors-tab.tsx`

**Estrutura visual de cada item conector:**

```
┌──────────────────────────────────────────────────────────┐
│  [ícone]  Nome do Conector           [status]  [botão]   │
└──────────────────────────────────────────────────────────┘
```

**Estado:** `{ googleCalendar: boolean, whatsapp: boolean }` — inicializado do backend, fallback `false`.

**Conectores a exibir:**

| id | Label | Ícone | Descrição |
|---|---|---|---|
| `googleCalendar` | Google Calendar | `CalendarDays` (Lucide) | Sincronize agendamentos com o Google Calendar |
| `whatsapp` | WhatsApp | `MessageCircle` (Lucide) | Envie mensagens via WhatsApp Business |

**Comportamento dos botões:**
- **Desconectado:** botão `Vincular` (outline, `border-border`) → chama `handleToggle(id, true)`
- **Conectado:** badge `Conectado` (texto `text-pink-500`) + botão `Desconectar` (outline, `text-destructive border-destructive text-sm`) → chama `handleToggle(id, false)`

**`handleToggle(id, value)`:** atualiza estado local e chama a mutation com o novo estado completo.

**Esqueleto do componente:**

```tsx
export function ConnectorsTab() {
  const clinicId = tokenService.getUser()?.activeClinic?.id ?? ''

  const [connected, setConnected] = useState({
    googleCalendar: false,
    whatsapp: false,
  })

  const { data, isLoading } = useClinicConnectors(clinicId)
  const { mutate: save, isPending } = useSaveClinicConnectors(clinicId)

  useEffect(() => {
    if (data) setConnected(data)
  }, [data])

  const handleToggle = (key: keyof typeof connected, value: boolean) => {
    const next = { ...connected, [key]: value }
    setConnected(next)
    save(next)
  }

  if (isLoading) return <SettingsLoading />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Conectores</h2>
        <p className="text-muted-foreground text-sm">
          Conecte a clínica a outros aplicativos e serviços.
        </p>
      </div>

      <div className="rounded-lg border border-border shadow-sm divide-y divide-border">
        {connectors.map(connector => (
          <ConnectorRow
            key={connector.id}
            connector={connector}
            isConnected={connected[connector.id]}
            isPending={isPending}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  )
}
```

**`ConnectorRow`** é um componente interno (dentro do mesmo arquivo) com as props acima. Exibe:
- Ícone do conector em container `rounded-lg bg-muted p-2`
- Nome em `font-medium` e descrição em `text-muted-foreground text-sm`
- Se conectado: `<span className="text-pink-500 text-sm font-medium">Conectado</span>` + botão Desconectar
- Se desconectado: `<Button variant="outline" size="sm">Vincular</Button>`

### 4. Atualizar `clinic-settings-page.tsx`

Substituir na linha 72:
```tsx
// Antes:
{activeTab === 'conectores' && <PlaceholderTab name="Conectores" />}

// Depois:
{activeTab === 'conectores' && <ConnectorsTab />}
```

Adicionar import no topo:
```tsx
import { ConnectorsTab } from './tabs/connectors-tab'
```

---

## Ordem de execução

```
1. [Endpoint] Adicionar CONNECTORS em clinic-settings-endpoints.ts
2. [API hooks] Adicionar useClinicConnectors + useSaveClinicConnectors em clinic-settings.api.ts
   (depende de 1)
3. [Componente] Criar connectors-tab.tsx
   (depende de 2)
4. [Integração] Atualizar clinic-settings-page.tsx
   (depende de 3)
```

Os passos 1 e 3 podem ser feitos em paralelo (o componente pode ser criado com os imports prontos antes dos hooks existirem — basta que os tipos estejam definidos).

---

## Comportamento quando o backend não tem o endpoint

O `useQuery` falhará silenciosamente (o estado `connected` permanece `false` para ambos). As mutations mostrarão `toast.error`. Isso é aceitável para um rollout incremental.

---

## Fora do escopo

- OAuth real com Google Calendar (fluxo de redirect/callback)
- Integração real com WhatsApp Business API
- Backend: criação do endpoint `/clinics/:id/settings/connectors`
- "Navegar conectores" ou "Adicionar conector personalizado"
- Testes automatizados
