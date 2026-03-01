# Carol - Assistente Virtual de Clínicas

## Visão Geral

Carol é a assistente de IA da Healz que representa a clínica perante os **pacientes**. Ela responde dúvidas, agenda consultas e faz triagem inicial via WhatsApp e outros canais (futuros). No MVP, a Carol é acessível apenas pelo Playground interno para validação antes da integração com canais reais.

## Usuários

| Ator                       | Papel                                                                 |
| -------------------------- | --------------------------------------------------------------------- |
| **Paciente**               | Interage com a Carol via canal de atendimento (WhatsApp, futuramente) |
| **Admin da clínica**       | Configura a Carol e testa via Playground                              |
| **Platform Admin (Healz)** | Define comportamento base; a clínica personaliza por cima             |

## Responsabilidades da Carol (MVP)

1. **Responder perguntas** sobre a clínica — info geral, serviços, valores, horários de funcionamento
2. **Agendar consultas** — verificar disponibilidade e criar agendamentos
3. **Triagem inicial** — coletar informações do paciente antes de agendar ou no início do contato

## Escopo por Clínica

Uma Carol por clínica, configurada pelo admin da clínica. Não há Carol por médico no MVP.

---

## Configuração

### Hierarquia

- **Healz (platform admin):** define comportamento e restrições base
- **Admin da clínica:** personaliza por cima da base da Healz

### O que é configurável no MVP

| Item                      | Descrição                                         |
| ------------------------- | ------------------------------------------------- |
| **Nome da Carol**         | Como ela se apresenta ao paciente                 |
| **Tom de voz**            | Formal, informal, empático                        |
| **Saudação inicial**      | Primeira mensagem enviada ao iniciar conversa     |
| **Regras de agendamento** | Como confirmar, cancelar, encaixe, duração padrão |

### Fonte de Dados

A Carol **usa os dados já cadastrados na Healz** como fonte de verdade — não há re-digitação:

| Dado                          | Origem                                  |
| ----------------------------- | --------------------------------------- |
| Informações gerais da clínica | Módulo de configurações gerais          |
| Serviços e valores            | Módulo de serviços                      |
| Horários de funcionamento     | Módulo de agendamento (operating hours) |
| Médicos disponíveis           | Membros da clínica                      |
| Disponibilidade de slots      | Sistema de agendamento                  |

---

## Sistema de Versões

Carol opera com duas versões simultâneas:

| Versão        | Descrição                                                                    |
| ------------- | ---------------------------------------------------------------------------- |
| **Draft**     | Em edição pelo admin. Testável no Playground. Invisível para pacientes.      |
| **Published** | Versão ativa. Futuramente responderá pacientes via WhatsApp e outros canais. |

**Fluxo:**

```
Admin edita configurações → Salva como Draft → Testa no Playground → Publica
```

Ao publicar, o draft se torna a versão ativa. A versão anterior é substituída.

---

## Playground

Interface interna onde o admin **simula ser um paciente** para validar o comportamento da Carol antes de publicar.

### Funcionalidades

- **Interface de chat** — conversa em tempo real com a Carol
- **Toggle de versão** — alterna entre testar o Draft e o Published
- **Sessões independentes** — cada vez que o Playground é aberto, começa do zero (sem histórico persistido)
- **Agendamentos mockados** — a tool de agendamento é chamada, mas não cria registros reais
- **Botão Publicar** — disponível ao testar o Draft, publica a versão atual

### UX

```
┌──────────────────────────────────────────────────────────┐
│  Carol Playground          [Testando: Draft ↕ Published] │
│──────────────────────────────────────────────────────────│
│                                                          │
│   Carol: Olá! Sou a Carol da Clínica X. Como posso      │
│          ajudar você hoje?                               │
│                                                          │
│   Você: Quero marcar uma consulta                        │
│                                                          │
│   Carol: Claro! Temos disponibilidade na terça-feira...  │
│                                                          │
│──────────────────────────────────────────────────────────│
│  [Nova conversa]                    [Publicar Draft]     │
│  [ Digite sua mensagem...      ]         [Enviar]        │
└──────────────────────────────────────────────────────────┘
```

---

## Arquitetura Técnica

### Stack

| Componente          | Tecnologia                                                  |
| ------------------- | ----------------------------------------------------------- |
| LLM Orchestration   | **LangChain** (Node.js)                                     |
| Modelo de linguagem | **OpenAI GPT** (gpt-4o ou gpt-4o-mini)                      |
| Backend             | **NestJS** — novo módulo `carol`                            |
| Frontend            | **React** — nova seção `Carol` no sidebar                   |
| DB                  | **PostgreSQL + Drizzle** — tabela de configurações da Carol |

### Razão para LangChain

A Carol vai crescer bastante — RAG, memória persistente, multi-step agents, chains de raciocínio. LangChain oferece a infraestrutura certa para isso sem reescrever a fundação a cada fase.

### Tool Calling

A Carol usa **tool calling** para executar ações. No MVP, as tools que envolvem escrita são **mockadas** (retornam dados simulados). As tools de leitura usam dados reais do banco.

| Tool                  | Tipo    | MVP                               |
| --------------------- | ------- | --------------------------------- |
| `get_clinic_info`     | Leitura | Real — lê da Healz                |
| `get_services`        | Leitura | Real — lê da Healz                |
| `get_operating_hours` | Leitura | Real — lê da Healz                |
| `check_availability`  | Leitura | Mockada (retorna slots simulados) |
| `create_appointment`  | Escrita | Mockada (não cria no banco)       |

> A arquitetura de tools é projetada para substituição progressiva: cada tool mockada será implementada de verdade quando a integração com WhatsApp e Google Calendar chegar (próximas fases).

---

## Navegação / UX do Sistema

Carol terá uma **seção própria no sidebar principal** com dois sub-itens:

```
Sidebar
├── Dashboard
├── Pacientes
├── Agendamentos
├── Carol              ← nova seção
│   ├── Configurações
│   └── Playground
└── Configurações da Clínica
```

---

## Fluxo do Admin (ponta a ponta)

```
1. Admin acessa  →  Carol > Configurações
2. Preenche      →  Personalidade, saudação, regras
3. Salva         →  Criado/atualizado como Draft
4. Acessa        →  Carol > Playground (toggle em "Draft")
5. Testa         →  Conversa como se fosse um paciente
6. Satisfeito?   →  Clica "Publicar Draft"
7. Publicado     →  Carol ativa e pronta para integração com WhatsApp
```

---

## Canal de Atendimento (Roadmap)

| Fase    | Canal                 | Status            |
| ------- | --------------------- | ----------------- |
| MVP     | Playground interno    | Esta feature      |
| Próxima | WhatsApp Business API | Integração futura |
| Futura  | Google Calendar       | Integração futura |

A arquitetura da Carol já prepara os contratos e interfaces necessários para plugar esses canais sem refatoração da lógica central.

---
