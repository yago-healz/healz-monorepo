# 🔧 Como Testar a Correção do Google Calendar

## O que foi corrigido?

**Bug:** Carol dizia que não havia disponibilidade mesmo com a agenda vazia.

**Causa:** A conversão de timezone para consultar Free/Busy estava **invertida**, fazendo consultar o dia anterior ao invés do dia correto.

**Linha corrigida:** `apps/api/src/modules/google-calendar/google-calendar.service.ts:308`

```diff
- const sign = offset <= 0 ? '+' : '-'
+ const sign = offset >= 0 ? '+' : '-'
```

---

## 🧪 Como Testar

### 1. Teste Rápido: Endpoint de Debug

Já está disponível um endpoint que mostra as conversões de timezone:

```bash
curl "http://localhost:3001/api/v1/debug/timezone-test?date=2026-03-04&time=14:30&timezone=America/Sao_Paulo"
```

**Resposta esperada:**
```json
{
  "input": { "date": "2026-03-04", "time": "14:30", "timezone": "America/Sao_Paulo" },
  "offset": {
    "minutes": -180,
    "description": "UTC-3"
  },
  "conversion": {
    "localTime": "14:30 em America/Sao_Paulo",
    "isoString": "2026-03-04T14:30:00-03:00",
    "utcTime": "2026-03-04T17:30:00.000Z"
  },
  "midnight": {
    "start": {
      "local": "2026-03-04T00:00:00-03:00",
      "utc": "2026-03-04T03:00:00.000Z"
    },
    "end": {
      "local": "2026-03-04T23:59:59-03:00",
      "utc": "2026-03-04T02:59:59.000Z"
    }
  }
}
```

**O que validar:**
- ✅ `isoString`: tem `-03:00` (não `+03:00`)
- ✅ `utcTime`: é 17:30 UTC (14:30 + 3h)
- ✅ `midnight.start.utc`: é 03:00 UTC (00:00 + 3h)

---

### 2. Teste Funcional: Teste com Carol

1. **Setup:**
   - Clínica com Google Calendar **conectado e com calendário selecionado**
   - Agenda **completamente vazia** naquele dia no Google Calendar
   - Horário de funcionamento configurado (ex: 08:00 às 18:00)

2. **Teste:**
   ```
   Usuário: "Qual horário tem disponível em 4 de março?"
   Carol: "Temos os seguintes horários disponíveis: 08:00, 08:30, 09:00, ..." ✅
   ```

3. **Se ainda disser "não tem disponível":**
   - Verifique os logs: `docker logs -f <api-container> | grep "getFreeBusy"`
   - Deve ver: `[getFreeBusy] returned 0 busy slots`
   - Se retorna slots, há outro problema

---

### 3. Teste de Regressão: Com Eventos no Google Calendar

1. Crie um evento no Google Calendar: **14:00 - 15:00** em 4 de março
2. Teste via Carol:
   ```
   Usuário: "Qual horário tem em 4 de março?"
   Carol: "Temos: 08:00, 08:30, 09:00, ... 13:30, 15:00, 15:30, ..." (pulando 14:00-14:30)
   ```
   ✅ Horário ocupado deve ser excluído

---

## 🐛 Checklist de Debug

Se Carol ainda responder incorretamente:

- [ ] Google Calendar está conectado? Verifique `clinic_google_calendar_credentials.is_active = true`
- [ ] Calendário foi selecionado? Verifique `selected_calendar_id IS NOT NULL`
- [ ] O `CLINIC_TIMEZONE` está correto no `.env`? (padrão: `America/Sao_Paulo`)
- [ ] Há erros de autenticação? Verifique logs: `ERROR getFreeBusy failed`
- [ ] O endpoint de debug retorna `UTC-3` correto? (com sinal `-`, não `+`)

---

## 📝 Logs para Investigação

Se precisar debugar mais, ative logs de debug:

```bash
# No docker-compose ou deployment:
- DEBUG=true
- LOG_LEVEL=debug
```

Procure por linhas como:
```
[GoogleCalendarService] [getFreeBusy] date=2026-03-04, tz=America/Sao_Paulo, timeMin=2026-03-04T03:00:00.000Z, timeMax=2026-03-04T02:59:59.000Z
[GoogleCalendarService] [getFreeBusy] returned 0 busy slots
```

---

## ✅ O que Mudou

### Arquivos Modificados
1. **`apps/api/src/modules/google-calendar/google-calendar.service.ts`**
   - Linha 308: Corrigido sinal do offset
   - Adicionadas linhas de debug em `getFreeBusy()`
   - Novo método: `debugTimezoneConversion()` para testes

2. **`apps/api/src/modules/google-calendar/google-calendar.controller.ts`**
   - Novo endpoint: `GET /api/v1/debug/timezone-test`

---

## 🚀 Próximos Passos

Se o debug endpoint mostrar conversões corretas mas Carol ainda responde errado:
- Verifique `CheckAvailabilityTool.toUtcMs()` - pode ter bug similar
- Verifique se `minimumAdvanceHours` está filtrando slots corretamente
- Adicione logs em `collidesWithBusy()` para ver quais slots estão sendo filtrados
