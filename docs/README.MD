# Healz

## O que é

Healz é uma plataforma SaaS de inteligência de jornada do paciente que automatiza comunicação via WhatsApp, detecta riscos de abandono, e orquestra ações no momento certo - com escalação humana quando necessário.

**Core value**: Transformar o caos do WhatsApp em gestão inteligente e proativa da jornada do paciente.

## O problema que resolvemos

Clínicas pequenas e médias não conseguem acompanhar a jornada do paciente de forma contínua. WhatsApp virou caos, eventos críticos (faltas, abandonos, atrasos) são percebidos tarde demais.

A clínica não acorda pensando "preciso de um CRM". Ela acorda pensando:

- 😰 Perdi paciente e não sei por quê
- 🤷 Não sei quem voltou, quem sumiu
- 📱 WhatsApp virou bagunça sem controle
- 😤 Secretária sobrecarregada, respostas inconsistentes
- ❓ Ninguém sabe o status real de nada

👉 **O "CRM" é só o rótulo que dão para essa dor.**

## Insight de produto

**Clínicas não gerenciam leads. Elas gerenciam pacientes ao longo do tempo.**

Tudo que exige input manual recorrente do cliente mata a escala em clínica pequena.

❌ Se exigir:

- Arrastar card
- Preencher campo
- Atualizar status manualmente

👉 **Está errado para o nosso caso de uso.**

✅ **Abordagem Healz**:

- Eventos capturam automaticamente a jornada
- IA processa e responde
- Sistema alerta apenas quando necessário
- Humano age em exceções

## Proposta de valor

| Para          | Valor                                                              |
| ------------- | ------------------------------------------------------------------ |
| **Pacientes** | Agendamento e comunicação via WhatsApp (canal já familiar)         |
| **Clínicas**  | Automação de interações rotineiras + gestão inteligente da jornada |
| **Métricas**  | Retenção ↑ · Overhead administrativo ↓ · Agendamentos sem fricção  |

## As 5 funções essenciais (nosso "CRM invisível")

### 1. Identidade única do paciente

- Nome, telefone, histórico mínimo
- **Sem input manual** - tudo via eventos

### 2. Linha do tempo automática

- Primeiro contato → Agendamento → Atendimento → Follow-ups → Retornos
- **100% automática** via Event Sourcing

### 3. Status inteligente (calculado, não manual)

- Estados: Ativo, Em risco, Sumido, Retomado, Insatisfeito
- **Calculado pela State Machine** baseado em eventos

### 4. Alertas acionáveis

- "Esse paciente vai sumir"
- "Esse paciente precisa de contato humano"
- "Esse paciente está pronto para retorno"
- **Poucos e precisos** - só o que realmente importa

### 5. Histórico para decisão (compliance light)

- Quem falou, quando, por qual canal, decisão tomada
- **Auditoria automática** via Event Store

## Arquitetura em uma frase

Sistema **event-driven** com Event Store (PostgreSQL), State Machine para jornada do paciente, Decision Engine com LangChain, e Action Orchestrator para execução de respostas.

## Core do produto (não negociável)

### 1. Motor de inteligência de jornada

- Leitura de eventos ao longo do tempo
- Linha do tempo automática (sem input manual)
- Reconstrução de estado a qualquer momento

### 2. Detecção de risco (o diferencial)

- Score de abandono, insatisfação e churn
- Sinais: atraso, silêncio, repetição, linguagem, mudança de comportamento
- **A Healz não reage; ela antecipa**

### 3. Orquestração inteligente de ações

- Decide quando IA atua sozinha
- Quando escalar para humano
- Quando alertar gestor
- **Automação com lógica clara** (regras + score + LLM)

### 4. Identidade única do paciente

- Nome, telefone, histórico mínimo
- Status calculado (ativo, em risco, sumido, retomado)
- **Visão 360° automática**

### 5. Governança & logs

- Registro de quem falou, quando, por qual canal, decisão tomada
- **LGPD-ready** desde o início
- Auditoria completa via Event Store

## Must have (MVP para vender e operar)

### Camada mínima de "CRM invisível"

- ✅ Lista de pacientes com busca
- ✅ Visualização por status
- ✅ Timeline clara de interações
- ❌ Sem funil, pipeline ou "arrastar card"

### Integração nativa WhatsApp

- ✅ Evolution API (self-hosted)
- ✅ Canal principal onde a dor acontece
- ✅ Respostas automáticas + escalação

### Alertas acionáveis

- ✅ Poucos e bons
- ✅ Foco em risco real
- ✅ Notificação apenas quando necessário

### Dashboard simples para gestor

- ✅ Visão geral de pacientes
- ✅ Lista de pacientes em risco
- ✅ Pacientes recuperados
- ✅ Backlog crítico

## Plus (aumenta ticket e stickiness)

### Para clínicas

- Relatórios mensais automáticos
- Insights de retenção
- Comparativos antes/depois

### Para operadoras (futuro)

- Score agregado por carteira
- Heatmap de risco
- Alertas de churn sistêmico
- Evidência de governança

### Para gestores

- Configuração de regras de risco
- Ajuste de thresholds
- Perfis de prioridade

## Regra de ouro do produto

> **Se exige input humano recorrente, não entra no MVP.**

O valor da Healz é:

- ✅ Reduzir esforço
- ✅ Reduzir erro
- ✅ Reduzir dependência de pessoas

## Modelo de negócio

| Público        | Pagam por                           |
| -------------- | ----------------------------------- |
| **Clínicas**   | Organização + retenção de pacientes |
| **Operadoras** | Proteção de carteira (futuro)       |
| **Governo**    | Validação + escala (futuro)         |

**Mesmo core, superfícies diferentes.**

## Documentação adicional

- [**ARCHITECTURE.md**](./ARCHITECTURE.md) - Arquitetura detalhada do sistema
- [**STACK.md**](./STACK.md) - Stack tecnológica e decisões técnicas
- [**DATABASE.md**](./DATABASE.md) - Modelo de dados e Event Store
- [**AGGREGATES.md**](./AGGREGATES.md) - Bounded Contexts e Agregados
- [**EVENTS.md**](./EVENTS.md) - Catálogo completo de eventos
- [**STATE_MACHINE.md**](./STATE_MACHINE.md) - Máquina de estados da jornada do paciente
- [**PROJECTIONS.md**](./PROJECTIONS.md) - Read Models e Views materializadas
