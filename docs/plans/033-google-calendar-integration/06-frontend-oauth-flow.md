# Tarefa 06 — Frontend: Fluxo OAuth e Seleção de Calendário

**Objetivo:** Substituir o botão "Vincular" do Google Calendar (hoje um simples toggle) pelo fluxo real de OAuth: redirecionar ao Google, detectar o retorno, exibir seletor de calendário e mostrar o status final de conexão.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `apps/web/src/features/clinic/components/settings/tabs/connectors-tab.tsx` | Modificar |
| `apps/web/src/features/clinic/api/clinic-settings.api.ts` | Modificar — adicionar hooks de Google Calendar |
| `apps/web/src/lib/api/clinic-settings-endpoints.ts` | Modificar — adicionar endpoints de Google Calendar |

---

## Novos Endpoints no Frontend

Em `apps/web/src/lib/api/clinic-settings-endpoints.ts`:

```typescript
GOOGLE_CALENDAR_AUTH_URL: (clinicId: string) =>
  `/clinics/${clinicId}/connectors/google-calendar/auth-url`,

GOOGLE_CALENDAR_CALENDARS: (clinicId: string) =>
  `/clinics/${clinicId}/connectors/google-calendar/calendars`,

GOOGLE_CALENDAR_SELECT: (clinicId: string) =>
  `/clinics/${clinicId}/connectors/google-calendar/select-calendar`,

GOOGLE_CALENDAR_DISCONNECT: (clinicId: string) =>
  `/clinics/${clinicId}/connectors/google-calendar`,
```

---

## Novos Hooks de API

Em `apps/web/src/features/clinic/api/clinic-settings.api.ts`:

```typescript
// Busca URL de autenticação OAuth
export function useGoogleCalendarAuthUrl(clinicId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ authUrl: string }>(
        CLINIC_SETTINGS_ENDPOINTS.GOOGLE_CALENDAR_AUTH_URL(clinicId)
      )
      return data
    },
  })
}

// Lista calendários disponíveis (após OAuth)
export function useGoogleCalendars(clinicId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['google-calendars', clinicId],
    queryFn: async () => {
      const { data } = await api.get<CalendarListEntry[]>(
        CLINIC_SETTINGS_ENDPOINTS.GOOGLE_CALENDAR_CALENDARS(clinicId)
      )
      return data
    },
    enabled: !!clinicId && enabled,
  })
}

// Seleciona calendário
export function useSelectGoogleCalendar(clinicId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { calendarId: string; calendarName: string }) => {
      await api.post(CLINIC_SETTINGS_ENDPOINTS.GOOGLE_CALENDAR_SELECT(clinicId), payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-connectors', clinicId] })
      toast.success('Google Calendar conectado com sucesso!')
    },
  })
}

// Desconecta Google Calendar
export function useDisconnectGoogleCalendar(clinicId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete(CLINIC_SETTINGS_ENDPOINTS.GOOGLE_CALENDAR_DISCONNECT(clinicId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-connectors', clinicId] })
      toast.success('Google Calendar desconectado.')
    },
  })
}
```

**Tipo `CalendarListEntry`** (adicionar em `clinic-settings.api.ts` ou em um types file):
```typescript
interface CalendarListEntry {
  id: string
  summary: string
  primary: boolean
}
```

---

## Atualização do `ConnectorsTab`

### Detecção de retorno OAuth (via URL params)

```typescript
export function ConnectorsTab() {
  const clinicId = tokenService.getUser()?.activeClinic?.id ?? ''
  const [location] = useLocation()  // Tanstack Router
  const navigate = useNavigate()

  const gcalParam = new URLSearchParams(location.search).get('gcal')
  const [showCalendarPicker, setShowCalendarPicker] = useState(
    gcalParam === 'pending-calendar-selection'
  )

  // Limpar o query param da URL após detecção
  useEffect(() => {
    if (gcalParam) {
      navigate({ search: '?tab=conectores', replace: true })
    }
  }, [])

  // ...
}
```

> Verificar como o Tanstack Router expõe search params e navigate — adaptar conforme o padrão usado no projeto.

### Botão "Vincular" do Google Calendar

```typescript
const { mutate: getAuthUrl, isPending: isConnecting } = useGoogleCalendarAuthUrl(clinicId)

const handleGoogleConnect = () => {
  getAuthUrl(undefined, {
    onSuccess: ({ authUrl }) => {
      window.location.href = authUrl  // redirect completo para o Google
    },
    onError: () => toast.error('Erro ao iniciar conexão com Google Calendar.'),
  })
}
```

### Botão "Desconectar" do Google Calendar

```typescript
const { mutate: disconnect } = useDisconnectGoogleCalendar(clinicId)

// No ConnectorRow para googleCalendar:
// onClick={() => disconnect()}
```

### Modal de Seleção de Calendário

Novo componente `CalendarPickerModal` dentro de `connectors-tab.tsx`:

```tsx
interface CalendarPickerModalProps {
  clinicId: string
  open: boolean
  onClose: () => void
}

function CalendarPickerModal({ clinicId, open, onClose }: CalendarPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedName, setSelectedName] = useState<string>('')

  const { data: calendars, isLoading } = useGoogleCalendars(clinicId, open)
  const { mutate: selectCalendar, isPending } = useSelectGoogleCalendar(clinicId)

  const handleConfirm = () => {
    if (!selectedId) return
    selectCalendar(
      { calendarId: selectedId, calendarName: selectedName },
      { onSuccess: onClose }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecione o Calendário</DialogTitle>
          <DialogDescription>
            Escolha qual calendário da sua conta Google será usado para os agendamentos.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {calendars?.map(cal => (
              <label key={cal.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted">
                <input
                  type="radio"
                  name="calendar"
                  value={cal.id}
                  checked={selectedId === cal.id}
                  onChange={() => { setSelectedId(cal.id); setSelectedName(cal.summary) }}
                />
                <span className="font-medium">{cal.summary}</span>
                {cal.primary && (
                  <span className="text-xs text-muted-foreground ml-auto">Principal</span>
                )}
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedId || isPending}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Tratamento do estado de erro (`?gcal=error`)

```typescript
useEffect(() => {
  if (gcalParam === 'error') {
    toast.error('Não foi possível conectar o Google Calendar. Tente novamente.')
  }
}, [])
```

---

## Mudança no `ConnectorRow` para Google Calendar

O `ConnectorRow` recebe um `onConnect` diferente por tipo de conector:
- **Google Calendar:** chama `handleGoogleConnect()` (OAuth redirect)
- **WhatsApp:** mantém comportamento placeholder

Adicionar prop `onConnect?: () => void` ao `ConnectorRow` ou diferenciar via `connector.id` no `ConnectorsTab`.

---

## Critério de aceite

- Clicar em "Vincular" no Google Calendar redireciona o usuário para o Google OAuth
- Após autorizar, o usuário retorna à tela de conectores e vê o modal de seleção de calendário
- O modal lista os calendários disponíveis na conta Google
- Após selecionar e confirmar, o status exibe "Conectado" e o modal fecha
- Clicar em "Desconectar" remove a conexão (status volta para o botão "Vincular")
- Se o OAuth foi negado pelo usuário, um toast de erro é exibido
- O WhatsApp ainda exibe o botão "Vincular" sem comportamento especial (não alterado)
