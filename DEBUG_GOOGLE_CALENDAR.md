# 🐛 Debug: Google Calendar Availability Issues

## Problema Identificado

Carol diz que **não há disponibilidade** mesmo quando a agenda Google está **completamente vazia**.

## Causas Raiz

### Bug #1: Sinal do offset invertido (CRÍTICO)
**Arquivo:** `apps/api/src/modules/google-calendar/google-calendar.service.ts:308`

```typescript
// ❌ ERRADO
const sign = offset <= 0 ? '+' : '-'

// ✅ CORRETO
const sign = offset >= 0 ? '+' : '-'
```

**Impacto:** Para São Paulo (UTC-3), a consulta ao Free/Busy do Google Calendar é feita no horário **errado**, retornando todos os slots como "ocupados" (busy) falsos.

**Exemplo:**
- Quero "00:00 São Paulo"
- offset = -180 (UTC é 3h à frente)
- Lógica ERRADA: sign = '+' → "00:00:00+03:00" = 21:00 UTC do dia anterior ✗
- Lógica CORRETA: sign = '-' → "00:00:00-03:00" = 03:00 UTC do dia atual ✓

### Bug #2: Inconsistência em `CheckAvailabilityTool.toUtcMs()`
**Arquivo:** `apps/api/src/modules/carol/tools/check-availability.tool.ts:35-48`

A função calcula offset como "local - UTC" mas o cálculo final pode estar invertido dependendo da implementação.

---

## Como Testar (Debug Rápido)

### 1️⃣ Endpoint de Debug (será criado)

```bash
GET /api/v1/debug/timezone-test?date=2026-03-04&time=14:30&timezone=America/Sao_Paulo
```

Retorna:
```json
{
  "localTime": "14:30 em America/Sao_Paulo",
  "expectedUtcTime": "17:30 UTC",
  "localMidnightStart": "03:00 UTC (2026-03-03T21:00:00Z na string)",
  "localMidnightEnd": "03:59:59 UTC (2026-03-03T23:59:59Z na string)",
  "toUtcMsResult": "timestamp de 17:30 UTC"
}
```

### 2️⃣ Logs de Debug no Google Calendar
Ative logs em `getFreeBusy()`:

```bash
# Você verá:
[GoogleCalendarService] getFreeBusy called for 2026-03-04
[DEBUG] timeMin: 2026-03-03T21:00:00Z (ERRADO - deveria ser 2026-03-04T03:00:00Z)
[DEBUG] timeMax: 2026-03-03T23:59:59Z (ERRADO - deveria ser 2026-03-04T03:59:59Z)
[DEBUG] busySlots returned: [] (porque consultou dia anterior!)
```

### 3️⃣ Manual Check

```typescript
// No seu navegador, abra console e rode:
const date = new Date('2026-03-04T00:00:00-03:00');
console.log(date.toISOString()); // Deve ser 2026-03-04T03:00:00Z

// ERRADO (com bug atual):
const wrongDate = new Date('2026-03-04T00:00:00+03:00');
console.log(wrongDate.toISOString()); // Será 2026-03-03T21:00:00Z ✗
```

---

## Fluxo Completo do Bug

```
1. Usuário pergunta: "Qual horário tem disponível em 2026-03-04?"
   ↓
2. Carol chama CheckAvailabilityTool.check_availability({ date: "2026-03-04" })
   ↓
3. Tool chama GoogleCalendarService.getFreeBusy(clinicId, new Date("2026-03-04"))
   ↓
4. getFreeBusy calcula:
   - offset = -180 (UTC-3)
   - sign = '+' (ERRADO!) ← BUG #1
   - timeMin = new Date("2026-03-04T00:00:00+03:00") = 2026-03-03 21:00 UTC
   - timeMax = new Date("2026-03-04T23:59:59+03:00") = 2026-03-04 20:59 UTC
   ↓
5. Consulta Google Calendar pela data ANTERIOR!
   ↓
6. Se tem algum evento no dia anterior, retorna como busy
   ↓
7. CheckAvailabilityTool filtra slots e retorna lista vazia
   ↓
8. Carol responde: "Desculpa, não tem horário disponível" ✗
```

---

## Correção

Ver arquivo `FIXME_FIXES.md` para as correções a serem aplicadas.
