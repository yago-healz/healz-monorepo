# Carol Debug Logging Guide

Logs estratégicos foram adicionados em toda a integração do Google Calendar e fluxo de agendamento da Carol para facilitar o debugging durante testes via plataforma web.

## Como usar

1. **Inicie os servidores em desenvolvimento:**
   ```bash
   cd apps/api
   pnpm dev
   ```

2. **Monitore o terminal** para ver os logs estruturados com prefixos `[NomeDaFerramenta]`

3. **Use o padrão de busca** nos logs usando os prefixos para filtrar rapidamente

---

## Estrutura dos Logs por Ferramenta

### 1. **CarolChatService** - Orquestrador Principal
**Prefixo:** `[CarolChat]`

**Fluxo de logs:**

```
[CarolChat] New message from clinic {clinicId}
├─ sessionId: {uuid}
├─ message: "Qual é a disponibilidade para amanhã?"
└─ version: {version}

[CarolChat] Carol config loaded for clinic {clinicId}
├─ name: "Carol"
├─ voiceTone: "empathetic"
└─ schedulingRules: {...}

[CarolChat] Created {N} tools
├─ get_clinic_info
├─ get_services
├─ get_operating_hours
├─ check_availability ← PRINCIPAL PARA DEBUG
└─ create_appointment ← PRINCIPAL PARA DEBUG

[CarolChat] Session history retrieved
├─ historyLength: 0

[CarolChat] Message chain ready
├─ totalMessages: 3 (system + history + user)
├─ systemMessageLength: 1024

[CarolChat] Starting tool-calling loop for sessionId {uuid}

[CarolChat] Tool-calling iteration 1
├─ toolCallsCount: 1
└─ toolNames: ["check_availability"]

[CarolChat] Invoking tool: {toolName}
├─ toolName: "check_availability"
├─ toolId: "call_xyz"
└─ args: {"date": "2026-03-05"}

[CarolChat] Tool {toolName} completed successfully
├─ toolName: "check_availability"
├─ resultLength: 256
└─ result: "{\"date\": \"2026-03-05\", \"slots\": [...]}"
     ↑ Primeiros 500 caracteres do resultado

[CarolChat] Final response generated
├─ toolsUsedCount: 1
├─ toolsUsed: ["check_availability"]
├─ replyLength: 256
└─ reply: "Temos as seguintes horários disponíveis..." (primeiros 200 chars)
```

**O que procurar:**
- ✅ Qual tool foi chamado (`check_availability`, `create_appointment`, etc)
- ✅ Qual foi a entrada da tool (argumentos)
- ✅ Qual foi o resultado retornado pela tool
- ✅ Quantas iterações de tool calling aconteceram
- ✅ Qual foi a resposta final do modelo

---

### 2. **CheckAvailabilityTool** - Verificação de Disponibilidade
**Prefixo:** `[CheckAvailabilityTool]`

**Fluxo de logs (ordem sequencial):**

```
[CheckAvailabilityTool] Starting availability check for clinic {clinicId} on date 2026-03-05

[CheckAvailabilityTool] Scheduling config retrieved
├─ weeklyScheduleExists: true
├─ maxFutureDays: 365
├─ defaultAppointmentDuration: 30
├─ minimumAdvanceHours: 0
└─ specificBlocksCount: 0

[CheckAvailabilityTool] Day schedule for wednesday
├─ dayOfWeek: "wednesday"
├─ isOpen: true
└─ timeSlots: [{"from": "08:00", "to": "12:00"}, ...]

[CheckAvailabilityTool] Generated 8 candidate slots with duration 30min
├─ candidates: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
└─ totalCount: 8

[CheckAvailabilityTool] Filtering slots with minimumAdvanceHours
├─ minimumAdvanceHours: 0
├─ minimumAdvanceMs: 0
└─ nowUtc: "2026-03-04T18:30:00.000Z"

[CheckAvailabilityTool] Future slots after advance hours filter: 8
├─ futureSlots: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
└─ totalCount: 8

[CheckAvailabilityTool] Google Calendar connection status for clinic {clinicId}: true
     ↑ CRÍTICO: Verifica se Google Calendar está conectado

[CheckAvailabilityTool] Fetching busy slots from Google Calendar for 2026-03-05
     ↑ Vai chamar a API do Google Calendar

[CheckAvailabilityTool] Retrieved 2 busy slots from Google Calendar
├─ busySlotsCount: 2
└─ busySlots: [
     {"start": "2026-03-05T09:00:00Z", "end": "2026-03-05T09:30:00Z"},
     {"start": "2026-03-05T10:00:00Z", "end": "2026-03-05T10:30:00Z"}
   ]
     ↑ IMPORTANTE: Mostra quais horários o Google Calendar retornou como ocupados

[CheckAvailabilityTool] Specific blocks for 2026-03-05
├─ count: 0
└─ blocks: []

[CheckAvailabilityTool] Slot 09:00 filtered out: collides with Google Calendar busy time
     ↓ (Uma vez para cada slot descartado)
[CheckAvailabilityTool] Slot 10:00 filtered out: collides with Google Calendar busy time

[CheckAvailabilityTool] Final result: 6 available slots for 2026-03-05
├─ availableSlots: ["08:00", "08:30", "10:30", "11:00", "11:30"]
└─ totalAvailable: 6
```

**Checklist de Debug:**
- [ ] `weeklyScheduleExists` = `true`? Senão, a agenda da clínica não está configurada
- [ ] `isOpen` = `true` para o dia? Senão, a clínica está fechada
- [ ] Número de `candidate slots` é sensato? (ex: 30min de duração entre 08:00-12:00 = 8 slots)
- [ ] `Google Calendar connection status`? **CRÍTICO para Google Calendar!**
  - Se `false`: Google Calendar não está conectado, slots vêm só da agenda da clínica
  - Se `true`: Vai buscar busy slots
- [ ] `busySlotsCount` > 0? Se tiver eventos no Google Calendar, devem aparecer aqui
- [ ] Slots foram filtrados corretamente? Compare `candidates` → `futureSlots` → `availableSlots`

**Erros comuns:**
- "No weeklySchedule configured" → Agenda da clínica não foi configurada (Settings > Scheduling)
- "Google Calendar connection status: false" → Google Calendar não está vincul'ado
- "getFreeBusy failed for clinic..." → Erro na chamada ao Google Calendar API

---

### 3. **CreateAppointmentTool** - Criação de Agendamento
**Prefixo:** `[CreateAppointmentTool]`

**Fluxo de logs:**

```
[CreateAppointmentTool] Creating appointment for clinic {clinicId}
├─ date: "2026-03-05"
├─ time: "08:00"
├─ patientName: "João Silva"
└─ service: "Consulta geral"

[CreateAppointmentTool] Mock appointment response
└─ {appointmentId: "mock-1740786445123", ...}
     ↑ LEMBRETE: Está mockado para MVP — não cria no BD
```

**O que procurar:**
- ✅ Os argumentos estão corretos? (date, time, patientName, service)
- ✅ O appointmentId foi gerado? (mock-TIMESTAMP)

**Nota:** Tool está mockada para MVP — não faz persistência no banco ainda.

---

### 4. **GetClinicInfoTool** - Informações da Clínica
**Prefixo:** `[GetClinicInfoTool]`

```
[GetClinicInfoTool] Fetching clinic info for clinic {clinicId}

[GetClinicInfoTool] Clinic info retrieved
├─ name: "Clínica Exemplo"
├─ hasDescription: true
└─ hasAddress: true
```

---

### 5. **GetServicesTool** - Serviços Disponíveis
**Prefixo:** `[GetServicesTool]`

```
[GetServicesTool] Fetching services for clinic {clinicId}

[GetServicesTool] Services retrieved for clinic {clinicId}
├─ servicesCount: 3
└─ services: [
     {"name": "Consulta Geral", "duration": 30},
     {"name": "Avaliação", "duration": 45},
     ...
   ]
```

---

### 6. **GetOperatingHoursTool** - Horários de Funcionamento
**Prefixo:** `[GetOperatingHoursTool]`

```
[GetOperatingHoursTool] Fetching operating hours for clinic {clinicId}

[GetOperatingHoursTool] Operating hours retrieved for clinic {clinicId}
├─ daysConfigured: 5
└─ defaultAppointmentDuration: 30
```

---

## Scenario: Testando Check Availability

### Passo 1: Inicie o servidor
```bash
cd apps/api && pnpm dev
```

### Passo 2: Abra a plataforma web e inicie um chat com Carol
```
User: "Qual a disponibilidade para amanhã?"
```

### Passo 3: Monitore os logs
Procure pela sequência:
```
[CarolChat] New message from clinic...
[CarolChat] Tool-calling iteration 1: check_availability
[CheckAvailabilityTool] Starting availability check...
[CheckAvailabilityTool] Google Calendar connection status...
[CheckAvailabilityTool] Retrieved X busy slots from Google Calendar  ← CRÍTICO
[CheckAvailabilityTool] Final result: X available slots...
[CarolChat] Tool check_availability completed successfully
[CarolChat] Final response generated
```

### Passo 4: Analise o resultado

**Se slots = 0:**
1. Confira se `weeklyScheduleExists: true`
2. Confira se `isOpen: true` para o dia
3. Confira se não há muitos `busySlots` ocupando toda a agenda
4. Confira se `minimumAdvanceHours` não está bloqueando tudo

**Se slots > 0:**
1. ✅ Pronto para testar agendamento!

---

## Scenario: Debugando Google Calendar

Se suspeita de problemas com Google Calendar:

### 1. Verifique a conexão
Procure por:
```
[CheckAvailabilityTool] Google Calendar connection status for clinic {clinicId}: true
```

Se for `false`, o Google Calendar não está conectado.

### 2. Verifique se busySlots foram retornados
```
[CheckAvailabilityTool] Retrieved {N} busy slots from Google Calendar
```

Se N = 0, pode significar:
- ✅ Google Calendar está vazio
- ❌ Erro na API (cheque o erro acima)

### 3. Verifique colisões
```
[CheckAvailabilityTool] Slot XX:XX filtered out: collides with Google Calendar busy time
```

Se muitos slots estão sendo filtrados, verifique se os events do Google Calendar estão corretos.

### 4. Verifique erros explícitos
```
[CheckAvailabilityTool] getFreeBusy failed for clinic...: {error}
```

Se aparecer, há um erro na chamada ao Google Calendar. Confira:
- Tokens de autenticação válidos
- Rate limiting
- Conectividade com Google API

---

## Niveis de Log

- **DEBUG** `[tool]` — Informações detalhadas (leitura de config, slots gerados, etc)
- **INFO** `[tool]` — Eventos principais (tool iniciada, completada, conexão verificada)
- **WARN** `[tool]` — Situações incomuns (clínica fechada, Google Calendar desconectado)
- **ERROR** `[tool]` — Erros que precisam de atenção (API falhou, exceções)

---

## Dicas para Debugging Rápido

### Terminal limpo
```bash
# Limpe e reinicie só para ver os novos logs
pnpm dev
```

### Grep nos logs
```bash
# Só mostra CheckAvailabilityTool
pnpm dev | grep CheckAvailabilityTool

# Mostra erros
pnpm dev | grep -E "(ERROR|error|failed|Failed)"

# Mostra Google Calendar
pnpm dev | grep -i "google"
```

### Follow específico
```bash
# Logs de uma sessão específica (busque o sessionId primeiro)
pnpm dev | grep "sessionId-que-voce-tem"
```

---

## Checklist de Teste Completo

- [ ] Carol responde "Oi! Sou Carol..."?
- [ ] Pedir disponibilidade → slots aparecem?
- [ ] Slots retornados condizem com o Google Calendar?
- [ ] Agendar um horário → mock appointment criado?
- [ ] Logs mostram toda a sequência sem erros?

---

## Próximas Etapas

Após validar logs e identificar o erro:
1. Compartilhe os logs relevantes
2. Verifique configurações de Google Calendar
3. Valide o estado do banco de dados
4. Considere adicionar logs adicionais em serviços específicos
