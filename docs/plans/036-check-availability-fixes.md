# Plano 036 — Correção: CheckAvailabilityTool e Timezone

**Objetivo:** Corrigir os bugs de timezone e filtragem de horários na `CheckAvailabilityTool`, fazendo com que a Carol retorne apenas horários futuros e reais para cada dia.

---

## Diagnóstico

### Bug 1 — Horários passados aparecem como disponíveis

**Arquivo:** `apps/api/src/modules/carol/tools/check-availability.tool.ts`

A ferramenta gera todos os slots do dia (ex: 08:00, 08:30, …, 18:00) e nunca compara com o horário atual. Se o usuário perguntar às 15:00 "tem horário hoje?", os slots das 08:00 às 14:30 aparecem como disponíveis.

**Também**: `minimumAdvanceHours` e `maxFutureDays` da configuração de scheduling nunca são aplicados.

---

### Bug 2 — Carol diz "sem disponibilidade" quando há horários livres

**Arquivos:** `check-availability.tool.ts` + `google-calendar.service.ts` (getFreeBusy)

**Causa raiz: timezone mismatch em dois pontos.**

#### 2a. `collidesWithBusy` — slot interpretado em local time, busy em UTC

```typescript
// Linha 37 — check-availability.tool.ts
const slotStart = new Date(`${dateStr}T${slotTime}:00`)
// ↑ SEM timezone → interpretado como horário LOCAL do servidor
```

Em produção (servidor em UTC) + clínica brasileira (UTC-3):
- Slot "09:00" → `slotStart` = 09:00 **UTC**
- Evento Google às 09:00 Brasil = 12:00 **UTC** → `busyStart` = 12:00 UTC
- `09:00 UTC` não colide com `12:00–13:00 UTC` → slot marcado como **livre** (falso negativo)

O inverso: slots que SÃO livres podem ser marcados como ocupados por eventos de horários diferentes quando a diferença de fuso desloca a janela.

#### 2b. `getFreeBusy` — janela UTC não representa o dia local da clínica

```typescript
// Linhas 266-269 — google-calendar.service.ts
const timeMin = new Date(date)
timeMin.setUTCHours(0, 0, 0, 0)  // UTC 00:00 = 21:00 Brasil (dia anterior!)
const timeMax = new Date(date)
timeMax.setUTCHours(23, 59, 59, 999)
```

Para uma clínica brasileira (UTC-3), a janela UTC 00:00–23:59 captura eventos das **21:00 do dia anterior** até as **20:59 do dia solicitado** (horário local). Isso injeta eventos do dia anterior como "busy" para o dia pedido.

---

### Bug 3 — Carol não sabe a data/hora atual

**Arquivo:** `apps/api/src/modules/carol/chat/carol-chat.service.ts` (buildSystemPrompt)

O system prompt não inclui a data/hora atual. Quando o usuário diz "hoje" ou "amanhã", o LLM usa a data de treinamento ou simplesmente infere — o que causa chamadas ao `check_availability` com datas erradas.

---

### Bug 4 — `specificBlocks` nunca aplicados

A configuração da clínica tem `specificBlocks` (bloqueios por data específica, ex: feriados, folgas), mas a tool nunca os checa.

---

## Abordagem da Correção

Para timezone, **não adicionar campo de timezone na clínica por ora** (evitar migration + alteração de UI). Assumir `America/Sao_Paulo` como default para MVP. Isso cobre o caso de uso atual e pode ser generalizado depois.

Usar **apenas APIs nativas do Node.js** (`Intl.DateTimeFormat`) sem adicionar dependências externas. Se a equipe preferir `date-fns-tz`, mencionar na seção de alternativas.

---

## Arquivos Afetados

| Arquivo | Tipo de Mudança |
|---|---|
| `apps/api/src/modules/carol/tools/check-availability.tool.ts` | Modificar — timezone, filtro de passado, specificBlocks, constraints |
| `apps/api/src/modules/google-calendar/google-calendar.service.ts` | Modificar — `getFreeBusy`: janela em horário local da clínica |
| `apps/api/src/modules/carol/chat/carol-chat.service.ts` | Modificar — injetar data/hora atual no system prompt |

---

## Implementação

### 1. Adicionar data/hora atual ao system prompt

**Arquivo:** `apps/api/src/modules/carol/chat/carol-chat.service.ts`

No início de `buildSystemPrompt`, adicionar a data e hora atual (no timezone `America/Sao_Paulo`):

```typescript
private buildSystemPrompt(config: CarolConfigResponseDto): string {
  const now = new Date()
  const tzFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'full',
    timeStyle: 'short',
  })
  const currentDateTime = tzFormatter.format(now)
  // Também formato YYYY-MM-DD para uso nos tools
  const currentDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
  }).format(now) // retorna "2026-03-04"

  return `Você é ${config.name}, assistente virtual de uma clínica de saúde.

DATA E HORA ATUAL: ${currentDateTime} (use esta data para interpretar "hoje", "amanhã", etc.)
DATA ATUAL (formato YYYY-MM-DD): ${currentDate}

...` // resto do prompt sem alteração
}
```

---

### 2. Corrigir `getFreeBusy` — janela no timezone da clínica

**Arquivo:** `apps/api/src/modules/google-calendar/google-calendar.service.ts`

Substituir a janela UTC-fixa por uma janela baseada no início/fim do dia no timezone da clínica:

```typescript
async getFreeBusy(
  clinicId: string,
  date: Date,
  timezone = 'America/Sao_Paulo',
): Promise<FreeBusySlot[]> {
  // ...buscar cred (inalterado)...

  // Obter YYYY-MM-DD no timezone da clínica
  const localDateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone }).format(date)

  // Construir início e fim do dia como strings ISO com offset
  // Usar Date construído a partir da meia-noite local
  const timeMin = localMidnight(localDateStr, timezone, 'start')
  const timeMax = localMidnight(localDateStr, timezone, 'end')

  // ...resto inalterado...
}

/** Retorna Date correspondente a 00:00:00 ou 23:59:59 no timezone dado */
function localMidnight(dateStr: string, timezone: string, boundary: 'start' | 'end'): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Montar string ISO com timezone offset para forçar interpretação local
  const timeStr = boundary === 'start' ? '00:00:00' : '23:59:59'
  // Descobrir o offset UTC do timezone para aquela data
  const probe = new Date(`${dateStr}T12:00:00`)
  const offset = getTimezoneOffset(timezone, probe) // em minutos
  const sign = offset <= 0 ? '+' : '-'
  const absOffset = Math.abs(offset)
  const hh = String(Math.floor(absOffset / 60)).padStart(2, '0')
  const mm = String(absOffset % 60).padStart(2, '0')
  return new Date(`${dateStr}T${timeStr}${sign}${hh}:${mm}`)
}

/** Retorna offset em minutos: UTC - local (negativo para UTC+) */
function getTimezoneOffset(timezone: string, date: Date): number {
  const utc = date.getTime()
  const localStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
  const local = new Date(localStr + 'Z') // interpretar como UTC para extrair componentes
  // Não usar esta abordagem — usar método mais simples abaixo
}
```

> **Alternativa mais simples** (recomendada para MVP): Para evitar complexidade de offset manual, usar `Intl.DateTimeFormat` para formatar `date` em YYYY-MM-DD no timezone local, depois construir o Date com string que inclui o offset UTC explícito. Se a equipe preferir, instalar `date-fns-tz` que resolve isso em 2 linhas.

**Abordagem recomendada com `date-fns-tz`** (instalar apenas se aprovado):
```typescript
import { startOfDay, endOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const localDate = toZonedTime(date, timezone)
const timeMin = fromZonedTime(startOfDay(localDate), timezone)
const timeMax = fromZonedTime(endOfDay(localDate), timezone)
```

---

### 3. Corrigir `CheckAvailabilityTool` — timezone + filtros

**Arquivo:** `apps/api/src/modules/carol/tools/check-availability.tool.ts`

#### 3a. Corrigir `collidesWithBusy` — usar UTC explícito para slots

O slot time "09:00" precisa ser interpretado como horário LOCAL da clínica (não servidor). Adicionar o offset do timezone ao construir `slotStart`:

```typescript
function collidesWithBusy(
  slotTime: string,
  dateStr: string,
  busySlots: Array<{ start: string; end: string }>,
  duration: number,
  timezone: string,
): boolean {
  // Construir slotStart no timezone da clínica, depois converter para UTC
  const slotStartLocal = new Date(`${dateStr}T${slotTime}:00`) // local
  // Calcular UTC offset para o timezone da clínica nessa data
  const utcMs = toUtcMs(dateStr, slotTime, timezone)
  const slotEndMs = utcMs + duration * 60 * 1000

  return busySlots.some((busy) => {
    const busyStart = new Date(busy.start).getTime()
    const busyEnd = new Date(busy.end).getTime()
    return utcMs < busyEnd && slotEndMs > busyStart
  })
}

/** Retorna timestamp UTC (ms) para uma data+hora no timezone dado */
function toUtcMs(dateStr: string, timeStr: string, timezone: string): number {
  // Usar Intl para descobrir o offset e ajustar
  const localDateTimeStr = `${dateStr}T${timeStr}:00`
  // Técnica: criar um Date com a string e medir a diferença entre
  // sua representação UTC e sua representação no timezone alvo
  const dt = new Date(localDateTimeStr) // interpretado como local do servidor
  const serverTzOffsetMs = dt.getTimezoneOffset() * 60 * 1000

  // Obter o offset do timezone alvo nessa data
  const targetOffset = getTargetOffset(timezone, dt)

  // Ajustar: mover do server timezone para target timezone
  return dt.getTime() + serverTzOffsetMs - targetOffset
}
```

> **Abordagem mais simples** (recomendada): usar a string com offset embutido. Obter o offset do timezone alvo com `Intl`, construir a string ISO com esse offset:
> ```typescript
> // Ex: "2026-03-04T09:00:00-03:00" → interpretado corretamente como UTC-3
> const isoWithOffset = buildIsoWithOffset(dateStr, slotTime, timezone)
> const slotStart = new Date(isoWithOffset)
> ```

#### 3b. Filtrar slots passados e aplicar `minimumAdvanceHours`

Após gerar `candidates` e antes do filtro de busy, adicionar:

```typescript
const nowMs = Date.now()
const minAdvanceMs = (scheduling.minimumAdvanceHours ?? 0) * 60 * 60 * 1000

const futureSlots = candidates.filter((slotTime) => {
  const slotUtcMs = toUtcMs(input.date, slotTime, CLINIC_TIMEZONE)
  return slotUtcMs >= nowMs + minAdvanceMs
})
```

#### 3c. Aplicar `maxFutureDays`

Antes de qualquer processamento:

```typescript
const maxFutureDays = scheduling.maxFutureDays ?? 365
const requestedDate = new Date(input.date + 'T12:00:00') // noon UTC para evitar edge cases
const maxDate = new Date(Date.now() + maxFutureDays * 24 * 60 * 60 * 1000)
if (requestedDate > maxDate) {
  return JSON.stringify({ date: input.date, slots: [], reason: 'date_too_far' })
}
```

#### 3d. Aplicar `specificBlocks`

Após filtrar os busy slots do Google Calendar, aplicar também os bloqueios específicos:

```typescript
const specificBlocks = (scheduling.specificBlocks ?? []) as Array<{
  date: string; from: string; to: string
}>
const dayBlocks = specificBlocks.filter((b) => b.date === input.date)

const available = futureSlots.filter(
  (slot) =>
    !collidesWithBusy(slot, input.date, busySlots, duration, CLINIC_TIMEZONE) &&
    !dayBlocks.some((block) => {
      const [blockFromH, blockFromM] = block.from.split(':').map(Number)
      const [blockToH, blockToM] = block.to.split(':').map(Number)
      const [slotH, slotM] = slot.split(':').map(Number)
      const slotMin = slotH * 60 + slotM
      return slotMin >= blockFromH * 60 + blockFromM && slotMin < blockToH * 60 + blockToM
    })
)
```

---

## Constante de Timezone

Adicionar no topo de `check-availability.tool.ts` e em `google-calendar.service.ts`:

```typescript
const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE ?? 'America/Sao_Paulo'
```

Isso permite configuração via env var sem alterar DB por ora.

---

## Ordem de Execução

```
1. Corrigir system prompt (carol-chat.service.ts) — independente, sem risco
2. Implementar helper timezone (novo arquivo utils/timezone.ts ou inline)
   — bloqueia 3 e 4
3. Corrigir getFreeBusy (google-calendar.service.ts) — usa helper de timezone
4. Corrigir CheckAvailabilityTool (check-availability.tool.ts) — usa helper de timezone
   — inclui: collidesWithBusy, filtro de passado, specificBlocks, maxFutureDays
```

Todos os passos são back-end only. Nenhuma alteração de schema/migration necessária.

---

## Fora do Escopo

- Timezone configurável por clínica via UI (requer campo na tabela `clinic_scheduling` + frontend)
- Filtro de agendamentos existentes no nosso DB (os appointments já criados não são verificados como "busy" — bug separado)
- Testes automatizados (desejável mas não incluído aqui)
- Suporte a múltiplos timezones por clínica
