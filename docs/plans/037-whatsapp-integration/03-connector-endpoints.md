# Tarefa 03 — `EvolutionApiController` (Endpoints de Conectores)

**Objetivo:** Expor endpoints REST para o admin da clínica iniciar/consultar/encerrar a conexão WhatsApp.

---

## Arquivo a criar

`apps/api/src/modules/evolution-api/evolution-api.controller.ts`

---

## Endpoints

Todos protegidos com `JwtAuthGuard` + `IsClinicAdminGuard`.

### `POST /clinics/:clinicId/connectors/whatsapp/connect`

Inicia o processo de vinculação WhatsApp para a clínica.

**Response `201`:**
```json
{
  "qrCode": "data:image/png;base64,iVBOR...",
  "instanceName": "clinic-abc123"
}
```

**Lógica:**
- Chama `evolutionApiService.createInstance(clinicId)`
- Retorna o QR code inicial

**Erros:**
- `409 Conflict` se já existe conexão ativa

---

### `GET /clinics/:clinicId/connectors/whatsapp/qrcode`

Retorna o estado atual da conexão e o QR code mais recente (se ainda em processo de scan).

Usado pelo frontend em polling a cada 3 segundos.

**Response `200`:**
```json
{
  "status": "connecting" | "connected" | "disconnected",
  "qrCode": "data:image/png;base64,..." | null,
  "phoneNumber": "5511999999999" | null
}
```

**Lógica:**
- Busca credenciais no banco com `getCredentials(clinicId)`
- Se não existe: retorna `{ status: 'disconnected', qrCode: null }`
- Se `status = 'connected'`: retorna `{ status: 'connected', qrCode: null, phoneNumber }`
- Se `status = 'connecting'`: retorna `{ status: 'connecting', qrCode: lastQrCode }`

> **Nota:** Não chama a Evolution API neste endpoint — serve o QR salvo no banco (atualizado pelo webhook). Isso evita gerar um novo QR a cada poll.

---

### `DELETE /clinics/:clinicId/connectors/whatsapp`

Desconecta e remove a instância WhatsApp da clínica.

**Response `200`:**
```json
{ "message": "WhatsApp desconectado com sucesso." }
```

**Lógica:**
- Chama `evolutionApiService.disconnectInstance(clinicId)`

---

### Atualizar `GET /clinics/:clinicId/settings/connectors`

O endpoint de connectors já existe no `ClinicSettingsService`. Adicionar campo `whatsapp`:

```typescript
// clinic-settings.service.ts → getConnectors()
async getConnectors(clinicId: string) {
  const [gcal, whatsapp] = await Promise.all([
    this.googleCalendarService.isConnected(clinicId),
    this.evolutionApiService.getCredentials(clinicId),
  ])

  return {
    googleCalendar: gcal,
    whatsapp: whatsapp?.status === 'connected' ? {
      connected: true,
      phoneNumber: whatsapp.phoneNumber,
    } : null,
  }
}
```

> Isso requer injetar `EvolutionApiService` no `ClinicSettingsModule` — ver tarefa 06.

---

## DTOs

```typescript
// evolution-api.dto.ts
export class ConnectWhatsappResponseDto {
  qrCode: string
  instanceName: string
}

export class WhatsappStatusResponseDto {
  status: 'connecting' | 'connected' | 'disconnected'
  qrCode: string | null
  phoneNumber: string | null
}
```

---

## Critério de conclusão

- `POST .../connect` retorna QR code ao ser chamado
- `GET .../qrcode` reflete o estado correto do banco
- `DELETE .../whatsapp` limpa a conexão
- `GET .../connectors` inclui campo `whatsapp`
