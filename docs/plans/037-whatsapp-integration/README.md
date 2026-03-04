# Plano 037 — Integração WhatsApp via Evolution API

**Objetivo:** Permitir que uma clínica vincule sua conta WhatsApp (via QR Code) e que a Carol passe a receber e responder mensagens de pacientes via WhatsApp.

---

## Contexto

A aba **Conectores** em Configurações da Clínica já existe com Google Calendar funcionando. O botão "Vincular" do WhatsApp está desabilitado — é apenas um stub de UI.

A Evolution API é uma API self-hosted que abstrai o protocolo WhatsApp Web (Baileys). O modelo é **multi-instância**: cada clínica ganha sua própria instância identificada por um `instanceName` único.

O padrão de referência para esta integração é o módulo `GoogleCalendarModule` (OAuth → credenciais no banco → webhook handler).

---

## Arquitetura da solução

```
[Admin da clínica]
    │  clica "Vincular"
    ▼
[Frontend: QR Modal]  ←──── polling (3s) ────────┐
    │                                              │
    │ POST /clinics/:id/connectors/whatsapp/connect│
    ▼                                              │
[EvolutionApiController]                          │
    │  cria instância na Evolution API             │
    │  configura webhook                           │
    │  retorna QR code base64                     │
    ▼                                              │
[Evolution API Server]                            │
    │  QR atualizado → POST /webhooks/whatsapp    │
    │  Conectado     → POST /webhooks/whatsapp    │
    ▼                                              │
[EvolutionWebhookHandler]                        │
    │  QRCODE_UPDATED → salva QR no DB ───────────┘
    │  CONNECTION_UPDATE(open) → marca conectado
    │
    │  MESSAGES_UPSERT (mensagem do paciente)
    ▼
[CarolChatService.processMessage()]
    │  resposta da Carol
    ▼
[EvolutionApiService.sendText()]
    │
    ▼
[Paciente recebe resposta no WhatsApp]
```

---

## Variáveis de ambiente necessárias

Adicionar ao `.env` da API:

```env
EVOLUTION_API_URL=https://sua-evolution-api.com   # URL da instância Evolution API
EVOLUTION_API_KEY=sua-global-api-key              # Chave global (AUTHENTICATION_API_KEY)
API_PUBLIC_URL=https://sua-api.healz.com          # URL pública da API (para webhook)
```

---

## Tarefas

| # | Arquivo | Descrição | Depende de |
|---|---------|-----------|------------|
| [01](./01-database.md) | Schema + Migration | Tabela `clinic_whatsapp_credentials` | — |
| [02](./02-evolution-api-service.md) | `EvolutionApiService` | Cliente HTTP para Evolution API | 01 |
| [03](./03-connector-endpoints.md) | `EvolutionApiController` | Endpoints connect/qrcode/disconnect | 02 |
| [04](./04-webhook-handler.md) | `EvolutionWebhookHandler` | Recebe QR, conexão e mensagens | 02 |
| [05](./05-carol-whatsapp.md) | Integração Carol | Wire mensagens → Carol → reply | 04 |
| [06](./06-module-wiring.md) | Module + AppModule | Registrar tudo no NestJS | 03, 04, 05 |
| [07](./07-frontend.md) | Frontend | QR Modal + ConnectorsTab | 03 |

---

## Ordem de execução

```
1. [01] Banco de dados — base para tudo

2. [02] EvolutionApiService — pode rodar assim que 01 termina

3. [03] + [04] + [05] — paralelos (todos dependem de 02, não entre si)

4. [06] Module wiring — requer 03, 04, 05

5. [07] Frontend — pode ser desenvolvido em paralelo com 02-06
         (contrato de API é definido em 03, basta combinar o shape antes)
```

---

## Fora do escopo

- Inbox de conversas (visualizar mensagens no app)
- Notificações outbound proativas (lembretes de consulta)
- Pairing code flow (apenas QR Code)
- Mensagens de grupo (serão ignoradas)
- Mensagens de mídia (imagens, áudio) — Carol responde apenas a texto por ora
- Deploy/setup da Evolution API (já existe uma instância)
