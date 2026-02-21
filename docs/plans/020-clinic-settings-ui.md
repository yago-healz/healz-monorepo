# Plano 020 — Clinic Settings UI

**Objetivo:** Substituir os placeholders das abas da página de configurações da clínica por UIs reais, reaproveitando os componentes do onboarding (sem o header, barra de progresso e botões de navegação).

---

## Contexto

### Arquivo a modificar
- `apps/web/src/features/clinic/components/settings/clinic-settings-page.tsx`

### Onboarding steps de referência
| Arquivo | Seções relevantes |
|---|---|
| `onboarding-step1.tsx` | Rank Priorities (drag), Operation Pain Points, Additional Notes |
| `onboarding-step2.tsx` | Services & Procedures (**só esta seção** para aba Serviços) |
| `onboarding-step2.tsx` | Schedule Rules (**só esta seção** para aba Agendamentos) |
| `onboarding-step3.tsx` | Personality, Initial Greeting, Settings (Restrict + Routing Rules) |
| `onboarding-step4.tsx` | Notify me when, Receive alerts via, Phone number |

### Mapeamento de abas
| Tab ID | Label | Fonte |
|---|---|---|
| `geral` | Geral | Placeholder — mantém como está |
| `objetivos` | Objetivos | `onboarding-step1.tsx` — conteúdo completo |
| `servicos` | Serviços | `onboarding-step2.tsx` — seção Services & Procedures apenas |
| `agendamentos` | Agendamentos | `onboarding-step2.tsx` — seção Schedule Rules apenas |
| `carol` | Carol | `onboarding-step3.tsx` — conteúdo completo |
| `notificacoes` | Notificações | `onboarding-step4.tsx` — conteúdo completo |
| `conectores` | Conectores | Placeholder — mantém como está |

---

## O que deve ser REMOVIDO de cada onboarding step

Tudo o que é específico do onboarding não entra nas abas de settings:

- `<div className="min-h-screen bg-background">` wrapper externo
- `<header>` — logo Carol AI / botões Cancel, Save Progress
- Barra de progresso (`h-1 bg-gray-200` + gradiente)
- Label "Step X of 5 • 60%" e percentual
- Título com número de etapa (ex.: "Etapa 1: Clinic Objectives")
- Botões de navegação `Back` / `Continue` / `handleBack` / `handleContinue`
- `useNavigate` e `navigate({ to: ... })`
- `useOnboarding` e contexto do onboarding
- `useEffect` que carrega dados do contexto onboarding
- O botão fixo de `HelpCircle` flutuante (step2)
- Quote banner e footer do copyright (step4)

---

## Arquivos a criar

```
apps/web/src/features/clinic/components/settings/tabs/
  objectives-tab.tsx      ← baseado em onboarding-step1.tsx
  services-tab.tsx        ← baseado em onboarding-step2.tsx (Services section)
  scheduling-tab.tsx      ← baseado em onboarding-step2.tsx (Schedule Rules section)
  carol-tab.tsx           ← baseado em onboarding-step3.tsx
  notifications-tab.tsx   ← baseado em onboarding-step4.tsx
```

---

## Detalhes de implementação por tab

### 1. `objectives-tab.tsx`

**Manter da step1:**
- Estado local: `priorities`, `painPoints`, `additionalNotes`, `draggedItem`
- Toda a lógica de drag-and-drop (`handleDragStart`, `handleDragOver`, `handleDragEnd`)
- `togglePainPoint`
- Seção "Rank your priorities" com cards draggáveis (GripVertical, ícones, numeração)
- Seção "Operation pain points" com grid 2 colunas e toggle visual
- Seção "Anything else we should know?" com Textarea

**Remover:** tudo de onboarding listado acima

**Adicionar:**
- Botão "Salvar" estilizado com gradiente pink ao final do conteúdo (não-funcional por ora — sem handler de API)

**Estado inicial:** mesmos defaults do onboarding-step1 (prioridades hard-coded, painPoints com `selected: true` no "no-shows")

---

### 2. `services-tab.tsx`

**Manter da step2 (só seção Services & Procedures):**
- Estado local: `services`, `expandedNotes`
- `updateService`, `toggleNotes`
- Cards de serviço com Select (duration) + Input (value)
- Toggle de "Add internal notes for Carol"

**Remover:** tudo de onboarding + seção Schedule Rules inteira

**Adicionar:**
- Botão "Salvar" ao final

**Estado inicial:** mesmos 3 serviços default do step2

---

### 3. `scheduling-tab.tsx`

**Manter da step2 (só seção Schedule Rules):**
- Estado local: `timeBlocks`, `minimumInterval`
- `addTimeBlock`, `removeTimeBlock`, `updateTimeBlock`
- Blocked Times: lista de inputs de horário com Trash2
- Minimum Intervals: contador com +/- botões circulares

**Remover:** tudo de onboarding + seção Services inteira

**Adicionar:**
- Botão "Salvar" ao final

**Estado inicial:** timeBlocks com `[{ id: "1", from: "12:00", to: "14:00" }]`, minimumInterval: 15

---

### 4. `carol-tab.tsx`

**Manter da step3:**
- Estado local: `selectedTraits`, `greeting`, `restrictSensitiveTopics`
- `toggleTrait`
- Card Personality: grid 3 colunas com `PERSONALITY_TRAITS`
- Card Initial Greeting: Textarea dentro de bg-gray-100
- Card Settings: Switch "Restrict Sensitive Topics" + Routing Rules (lista estática)

**Remover:** tudo de onboarding + título "Step 3: Teaching Carol" + subtítulo descritivo do onboarding

**Adicionar:**
- Botão "Salvar" ao final (fora dos cards)

**Imports a manter:** `PERSONALITY_TRAITS` de `@/types/onboarding`

---

### 5. `notifications-tab.tsx`

**Manter da step4:**
- Estado local: `notifications`, `alertChannel`, `phoneNumber`
- Card com as 3 seções:
  - "Notify me when..." — 2 checkboxes (New booking, Risk of loss)
  - "Receive alerts via..." — toggle WhatsApp/Email
  - "Destination Phone Number" — input com prefixo +55
- Sem borda interna `border-t` + botões de navegação dentro do card

**Remover:** tudo de onboarding + quote banner + footer + botões dentro do card

**Adicionar:**
- Botão "Salvar" abaixo do card

---

## Modificação em `clinic-settings-page.tsx`

Substituir o `PlaceholderTab` nas abas correspondentes por imports dos novos componentes:

```tsx
// Imports adicionais
import { ObjectivesTab } from './tabs/objectives-tab'
import { ServicesTab } from './tabs/services-tab'
import { SchedulingTab } from './tabs/scheduling-tab'
import { CarolTab } from './tabs/carol-tab'
import { NotificationsTab } from './tabs/notifications-tab'

// No render, trocar a lógica de conteúdo:
{activeTab === 'geral' && <PlaceholderTab name="Geral" />}
{activeTab === 'objetivos' && <ObjectivesTab />}
{activeTab === 'servicos' && <ServicesTab />}
{activeTab === 'agendamentos' && <SchedulingTab />}
{activeTab === 'carol' && <CarolTab />}
{activeTab === 'notificacoes' && <NotificationsTab />}
{activeTab === 'conectores' && <PlaceholderTab name="Conectores" />}
```

---

## O que NÃO está no escopo

- Integração com API (os botões Salvar serão non-functional / `console.log`)
- Refatorar os componentes de onboarding para reutilizar os novos componentes
- Tab "Geral" — permanece placeholder
- Tab "Conectores" — permanece placeholder
- Adicionar novos serviços dinamicamente (além dos 3 default)

---

## Checklist de implementação

- [ ] Criar `tabs/objectives-tab.tsx`
- [ ] Criar `tabs/services-tab.tsx`
- [ ] Criar `tabs/scheduling-tab.tsx`
- [ ] Criar `tabs/carol-tab.tsx`
- [ ] Criar `tabs/notifications-tab.tsx`
- [ ] Atualizar `clinic-settings-page.tsx` para usar os novos tabs
- [ ] Verificar que não há referências a `useOnboarding` / `useNavigate` nos tabs
- [ ] Verificar que não há barra de progresso, header de onboarding ou botões de nav

---

## Observações

### Background cinza (`bg-gray-50`)
Os onboarding steps envolvem o conteúdo em `<main className="bg-gray-50">`. Na settings page, o fundo já é controlado pelo layout global — portanto, os cards e seções dos tabs devem ser renderizados diretamente sem esse wrapper de `<main>`.

### Botão Salvar
Estilo: `bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white px-8` — mantém consistência visual com o onboarding. Handler: `() => console.log('save', data)` por ora, preparado para receber uma mutation futuramente.

### Drag and drop (objectives-tab)
A implementação atual usa `draggable` + `onDragStart/onDragOver/onDragEnd` nativo do HTML — funciona sem bibliotecas externas. Manter exatamente como está na step1.
