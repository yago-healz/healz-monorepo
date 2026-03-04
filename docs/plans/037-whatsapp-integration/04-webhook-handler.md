# Tarefa 04 — Webhook Handler (Evolution API → Backend)

**Objetivo:** Receber eventos da Evolution API, atualizar estado da conexão no banco e enfileirar mensagens recebidas.

---

## Arquivo a criar

`apps/api/src/modules/evolution-api/evolution-api-webhook.controller.ts`

---

## Endpoint

### `POST /webhooks/whatsapp`

**Sem autenticação JWT** — chamado pela Evolution API. Deve ser excluído do `RlsMiddleware` em `app.module.ts`.

**Headers esperados da Evolution API:**
- Nenhum header de autenticação por padrão (a segurança é pela obscuridade da URL + instanceName válido no banco)

**Response:** sempre `200 OK` (a Evolution API reententa se receber erro)

---

## Estrutura do payload recebido

```typescript
interface EvolutionWebhookPayload {
  event: string          // 'qrcode.updated' | 'connection.update' | 'messages.upsert'
  instance: string       // instanceName ex: "clinic-abc123"
  data: Record<string, unknown>
}
```

---

## Lógica por evento

### `qrcode.updated`

```typescript
// data.qrcode.base64 = "data:image/png;base64,..."
// data.qrcode.count = número de QRs gerados (ex: 1, 2, 3...)
```

1. Buscar credenciais pelo `instanceName` (via `getCredentialsByInstanceName`)
2. Se não encontrar: ignorar (log de warning)
3. Se encontrar: `updateStatus(clinicId, 'connecting', { lastQrCode: data.qrcode.base64 })`

---

### `connection.update`

```typescript
// data.state = 'open' | 'close' | 'connecting'
// data.statusReason = número (0 = ok, outros = erro)
```

**Quando `state = 'open'` (conectado):**
1. Buscar número do telefone via `GET /instance/fetchInstances?instanceName={instanceName}` (opcional, pode ser nulo)
2. `updateStatus(clinicId, 'connected', { lastQrCode: null, connectedAt: new Date(), phoneNumber: ... })`

**Quando `state = 'close'` (desconectado):**
1. `updateStatus(clinicId, 'disconnected', { lastQrCode: null })`
> Não deletar a instância automaticamente — a clínica pode reconectar.

---

### `messages.upsert`

```typescript
// data.key.remoteJid = "5511999999999@s.whatsapp.net" (individual) | "...@g.us" (grupo)
// data.key.fromMe = false (recebido) | true (enviado por nós)
// data.message.conversation = "texto da mensagem"
// data.messageType = "conversation" | "imageMessage" | ...
// data.pushName = "Nome do contato"
```

**Filtros — ignorar se:**
- `data.key.fromMe === true` (mensagem enviada por nós)
- `data.key.remoteJid.endsWith('@g.us')` (grupo)
- `data.messageType !== 'conversation'` (não é texto — mídia, áudio, etc.)
- `data.message?.conversation` está vazio ou undefined

**Se passar todos os filtros:**
1. Buscar credenciais pelo `instanceName` → obter `clinicId`
2. Extrair número limpo: `remoteJid.replace('@s.whatsapp.net', '')`
3. Delegar ao `EvolutionCarolHandler.handle(clinicId, remoteJid, messageText)`
   (ver tarefa 05)

---

## Exclusão do RlsMiddleware

Em `app.module.ts`, adicionar exceção:

```typescript
consumer
  .apply(RlsMiddleware)
  .exclude(
    'api/v1/auth/*path',
    'api/v1/signup/*path',
    'api/v1/invites/accept',
    'api/v1/webhooks/whatsapp',  // ← adicionar
  )
  .forRoutes('*')
```

---

## Critério de conclusão

- Endpoint recebe payload da Evolution API e retorna 200
- `QRCODE_UPDATED` → QR salvo no banco (visível via `GET .../qrcode`)
- `CONNECTION_UPDATE(open)` → status muda para 'connected' no banco
- `CONNECTION_UPDATE(close)` → status muda para 'disconnected' no banco
- `MESSAGES_UPSERT` (texto, não-grupo, não-fromMe) → delega ao handler da Carol
