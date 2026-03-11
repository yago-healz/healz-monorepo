# Carol Debug Logs - Quick Start

## ✅ Logs foram adicionados!

Estratégic logs foram implementados em toda a integração Google Calendar + agendamento da Carol para facilitar debugging.

## 🚀 Iniciar Testes

```bash
cd apps/api
pnpm dev
```

Monitore o terminal para ver logs com padrão `[NomeDaTool]`.

---

## 🔍 Principais Informações nos Logs

### 1. Verificação de Disponibilidade
Procure por:
```
[CarolChat] Invoking tool: check_availability
[CheckAvailabilityTool] Google Calendar connection status: true/false ← CRÍTICO
[CheckAvailabilityTool] Retrieved X busy slots from Google Calendar
[CheckAvailabilityTool] Final result: X available slots
```

**Questões a responder:**
- Google Calendar conectado? (`true` ou `false`)
- Quantos slots ocupados foram retornados?
- Quantos slots livres ficaram?

### 2. Criação de Agendamento
Procure por:
```
[CarolChat] Invoking tool: create_appointment
[CreateAppointmentTool] Creating appointment for clinic
[CarolChat] Tool create_appointment completed successfully
```

### 3. Toda a Sequência
Uma conversa completa gera:
```
[CarolChat] New message from clinic {id}
[CarolChat] Carol config loaded
[CarolChat] Created 5 tools
[CarolChat] Starting tool-calling loop
[CarolChat] Tool-calling iteration 1
[CarolChat] Invoking tool: {tool-name}
[Tool] ... (logs específicos da ferramenta)
[CarolChat] Tool {tool-name} completed successfully
[CarolChat] Final response generated
```

---

## 📋 Checklist de Componentes com Logs

- ✅ `CarolChatService` - Orquestrador principal
- ✅ `CheckAvailabilityTool` - Verificação de disponibilidade (+ Google Calendar)
- ✅ `CreateAppointmentTool` - Criação de agendamento
- ✅ `GetClinicInfoTool` - Informações da clínica
- ✅ `GetServicesTool` - Lista de serviços
- ✅ `GetOperatingHoursTool` - Horários de funcionamento

---

## 📚 Documentação Completa

Para mais detalhes, consulte:
- `docs/debugging/carol-logging-guide.md` - Guia completo com todos os logs
- `docs/plans/033-google-calendar-integration/README.md` - Arquitetura da integração

---

## 🎯 Fluxo de Debug Típico

1. **Abra a plataforma web** e inicie um chat com Carol
2. **Envie uma mensagem**: "Qual a disponibilidade para amanhã?"
3. **Monitore o terminal** - você verá:
   - Se Carol foi configurada
   - Quais tools foram criadas
   - Qual tool foi chamada (check_availability)
   - Status de conexão com Google Calendar
   - Quantos slots foram retornados

4. **Analise os logs**:
   - Se slots = 0: Verifique se a agenda está configurada, se Google Calendar está conectado
   - Se slots > 0: ✅ Disponibilidade funcionando

5. **Teste agendamento**: "Gostaria de agendar para amanhã às 09:00"
   - Monitor para `[CreateAppointmentTool]`
   - Confirme que os dados passaram corretamente

---

## 🔧 Filtrar Logs no Terminal

```bash
# Apenas CheckAvailabilityTool
pnpm dev | grep CheckAvailabilityTool

# Apenas erros
pnpm dev | grep -E "ERROR|error|failed"

# Apenas Google Calendar
pnpm dev | grep -i "google"

# Uma sessão específica (busque o sessionId primeiro)
pnpm dev | grep "{sessionId-aqui}"
```

---

## ❓ Solução de Problemas Rápida

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Slots = 0 | Google Calendar desconectado | Verifique se está vincul'ado nas Settings |
| Slots = 0 | Agenda não configurada | Configure em Settings > Scheduling |
| Google status = false | Não conectado | Vincule Google Calendar nas Settings |
| Muitos slots filtrados | Muitos eventos no Google Calendar | Verifique a agenda do Google Calendar |
| Tool não chamada | Carol não configurada | Configure Carol nas Settings |
| "No weeklySchedule configured" | Agenda semanal não configurada | Configure em Settings > Scheduling |

---

## 📝 Exemplo de Log Limpo

```
[CarolChat] New message from clinic 550e8400-e29b-41d4-a716-446655440000
  sessionId: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  message: "Qual é a disponibilidade para amanhã?"
  version: 1

[CarolChat] Carol config loaded for clinic 550e8400-...
  name: "Carol"
  voiceTone: "empathetic"
  selectedTraits: ["proativa", "atencioso"]

[CarolChat] Created 5 tools
  tools: ["get_clinic_info", "get_services", "get_operating_hours", "check_availability", "create_appointment"]

[CarolChat] Starting tool-calling loop for sessionId a1b2c3d4-...

[CarolChat] Tool-calling iteration 1
  toolCallsCount: 1
  toolNames: ["check_availability"]

[CarolChat] Invoking tool: check_availability
  toolName: "check_availability"
  args: {"date": "2026-03-05"}

[CheckAvailabilityTool] Starting availability check for clinic 550e8400-...
[CheckAvailabilityTool] Scheduling config retrieved
  weeklyScheduleExists: true
  defaultAppointmentDuration: 30
  minimumAdvanceHours: 0

[CheckAvailabilityTool] Google Calendar connection status for clinic 550e8400-...: true
[CheckAvailabilityTool] Retrieved 2 busy slots from Google Calendar
  busySlotsCount: 2
  busySlots: [
    {"start": "2026-03-05T09:00:00Z", "end": "2026-03-05T09:30:00Z"},
    {"start": "2026-03-05T10:00:00Z", "end": "2026-03-05T10:30:00Z"}
  ]

[CheckAvailabilityTool] Final result: 6 available slots for 2026-03-05
  totalAvailable: 6

[CarolChat] Tool check_availability completed successfully
  resultLength: 256
  result: "{\"date\": \"2026-03-05\", \"slots\": [{\"time\": \"08:00\", \"available\": true}, ...]}"

[CarolChat] Final response generated
  toolsUsedCount: 1
  toolsUsed: ["check_availability"]
  reply: "Temos as seguintes horários disponíveis para amanhã: 08:00, 08:30, 10:30, 11:00, 11:30 e 12:00. Qual você prefere?"
```

✅ Tudo funcionando! Slots foram retornados, Google Calendar foi verificado.

---

## 🆘 Precisa de Ajuda?

1. Compartilhe os logs da sessão
2. Mencione qual exatamente é o problema (slots vazios, Google Calendar não conectando, etc)
3. Verifique se Google Calendar está de fato conectado nas Settings
4. Verifique se a agenda semanal está configurada
