# Tarefa 07 — Frontend: QR Modal + ConnectorsTab

**Objetivo:** Habilitar o botão "Vincular" do WhatsApp, mostrar o QR Code em um modal e atualizar o status de conexão em tempo real.

---

## Arquivos a criar/modificar

| Ação | Arquivo |
|------|---------|
| Criar | `apps/web/src/features/clinic/components/settings/tabs/whatsapp-qr-modal.tsx` |
| Modificar | `apps/web/src/features/clinic/api/clinic-settings.api.ts` |
| Modificar | `apps/web/src/lib/api/clinic-settings-endpoints.ts` |
| Modificar | `apps/web/src/features/clinic/components/settings/tabs/connectors-tab.tsx` |

---

## 1. Endpoints (clinic-settings-endpoints.ts)

Adicionar ao objeto `CLINIC_SETTINGS_ENDPOINTS`:

```typescript
WHATSAPP_CONNECT: (clinicId: string) =>
  `/clinics/${clinicId}/connectors/whatsapp/connect`,
WHATSAPP_STATUS: (clinicId: string) =>
  `/clinics/${clinicId}/connectors/whatsapp/qrcode`,
WHATSAPP_DISCONNECT: (clinicId: string) =>
  `/clinics/${clinicId}/connectors/whatsapp`,
```

---

## 2. API hooks (clinic-settings.api.ts)

```typescript
// Inicia conexão → retorna QR code inicial
export function useConnectWhatsapp(clinicId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        CLINIC_SETTINGS_ENDPOINTS.WHATSAPP_CONNECT(clinicId)
      )
      return data as { qrCode: string; instanceName: string }
    },
  })
}

// Polling: status + QR code atual
export function useWhatsappStatus(clinicId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['whatsapp-status', clinicId],
    queryFn: async () => {
      const { data } = await api.get(
        CLINIC_SETTINGS_ENDPOINTS.WHATSAPP_STATUS(clinicId)
      )
      return data as {
        status: 'connecting' | 'connected' | 'disconnected'
        qrCode: string | null
        phoneNumber: string | null
      }
    },
    refetchInterval: enabled ? 3000 : false,  // polling a cada 3s enquanto enabled
    enabled,
  })
}

// Desconectar
export function useDisconnectWhatsapp(clinicId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(CLINIC_SETTINGS_ENDPOINTS.WHATSAPP_DISCONNECT(clinicId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-connectors', clinicId] })
      toast.success('WhatsApp desconectado.')
    },
  })
}
```

---

## 3. WhatsappQrModal (whatsapp-qr-modal.tsx)

```
┌─────────────────────────────────────────────────┐
│  Conectar WhatsApp                          [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Escaneie o QR Code com seu WhatsApp            │
│                                                 │
│  ┌───────────────────────────────┐              │
│  │                               │              │
│  │      [QR CODE IMAGE 256px]    │  ← base64   │
│  │                               │              │
│  └───────────────────────────────┘              │
│                                                 │
│  1. Abra o WhatsApp no seu celular              │
│  2. Toque em ⋮ → Dispositivos vinculados        │
│  3. Toque em "Vincular dispositivo"             │
│  4. Aponte a câmera para o QR Code acima        │
│                                                 │
│  [■■■■■■■□□□] Aguardando escaneamento...        │
│                                                 │
│                          [Cancelar]             │
└─────────────────────────────────────────────────┘
```

**Comportamento:**

- Ao abrir: exibe o QR code recebido de `useConnectWhatsapp`
- Inicia `useWhatsappStatus(clinicId, true)` para polling
- Quando `status = 'connected'`:
  - Para o polling (`enabled = false`)
  - Exibe mensagem "✓ WhatsApp conectado!"
  - Aguarda 1.5s e fecha o modal
  - Invalida query `clinic-connectors` para atualizar o ConnectorsTab
- QR code se atualiza automaticamente quando `data.qrCode` muda (o banco é atualizado pelo webhook)
- Botão "Cancelar": fecha modal sem fazer nada (a instância foi criada mas ficará em 'connecting' — resolvido pelo `disconnectInstance` ou ao tentar vincular novamente)

**Props:**
```typescript
interface WhatsappQrModalProps {
  clinicId: string
  open: boolean
  initialQrCode: string     // QR code inicial retornado pelo POST /connect
  onClose: () => void
  onConnected: () => void
}
```

---

## 4. ConnectorsTab (connectors-tab.tsx)

Modificações no bloco WhatsApp:

1. Adicionar estado: `const [qrModalOpen, setQrModalOpen] = useState(false)`
2. Adicionar estado: `const [initialQrCode, setInitialQrCode] = useState('')`
3. Adicionar mutation: `const { mutate: connectWhatsapp, isPending: isConnectingWA } = useConnectWhatsapp(clinicId)`
4. Adicionar mutation: `const { mutate: disconnectWhatsapp, isPending: isDisconnectingWA } = useDisconnectWhatsapp(clinicId)`

**Handler do botão "Vincular":**
```typescript
const handleConnectWhatsapp = () => {
  connectWhatsapp(undefined, {
    onSuccess: (data) => {
      setInitialQrCode(data.qrCode)
      setQrModalOpen(true)
    },
    onError: () => toast.error('Erro ao iniciar conexão com WhatsApp.'),
  })
}
```

**Estado "conectado":** verificar `data?.whatsapp?.connected === true`

**Renderizar `<WhatsappQrModal>` no final do componente** (assim como `<CalendarPickerModal>`):
```tsx
<WhatsappQrModal
  clinicId={clinicId}
  open={qrModalOpen}
  initialQrCode={initialQrCode}
  onClose={() => setQrModalOpen(false)}
  onConnected={() => {
    setQrModalOpen(false)
    queryClient.invalidateQueries({ queryKey: ['clinic-connectors', clinicId] })
  }}
/>
```

---

## Critério de conclusão

- Botão "Vincular" habilitado e funcional
- Modal exibe QR code e atualiza a cada 3s
- Ao conectar: modal fecha e ConnectorsTab mostra "Conectado"
- Botão "Desconectar" funciona e reverte o estado
- Loading states corretos em todos os botões
