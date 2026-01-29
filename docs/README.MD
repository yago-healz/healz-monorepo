# Healz

## O que é

Healz é uma plataforma de inteligência de jornada e risco em saúde que organiza, prioriza e protege o relacionamento com pacientes e beneficiários, usando IA, automação e dados comportamentais.

A plataforma é proativa: antecipa sinais de abandono, atraso e insatisfação e orienta ações no momento certo, com escalação humana quando necessário.

## O problema que resolvemos

Organizações de saúde não conseguem coordenar a jornada do paciente de forma contínua e previsível. Eventos críticos (faltas, abandonos, atrasos, não adesão) são percebidos tarde demais.

A clínica não acorda pensando “preciso de um CRM”. Ela acorda pensando:

- perdi paciente
- não sei quem voltou
- não sei quem sumiu
- secretária não responde direito
- WhatsApp virou caos
- ninguém sabe o status de nada

👉 O “CRM” é só o rótulo que dão para essa dor.

## Insight de produto

Clínicas não gerenciam leads. Elas gerenciam pacientes ao longo do tempo.  
Tudo que exige input manual recorrente do cliente mata a escala em clínica pequena.

Se exigir:

- arrastar card
- preencher campo
- atualizar status

👉 está errado.

## Proposta de valor

- **Para pacientes**: Agendamento e comunicação via WhatsApp (canal já familiar)
- **Para clínicas**: Automação de interações rotineiras + gestão inteligente e proativa da jornada do paciente
- **Métricas de sucesso**: Retenção de pacientes ↑, overhead administrativo ↓, gestão de agendamentos sem fricção

## As 5 funções de “CRM” que precisamos ter

1. **Identidade única do paciente**
   - nome, telefone, histórico mínimo e origem (quando relevante)
2. **Linha do tempo automática**
   - primeiro contato, agendamento, atendimento, follow-ups, sumi-los, retornos
   - sem input manual; tudo por eventos
3. **Status inteligente (não manual)**
   - ativo, em risco, sumido, retornado, insatisfeito
4. **Alertas acionáveis**
   - “esse paciente vai sumir”
   - “esse paciente precisa de contato humano”
   - “esse paciente está pronto para retorno”
5. **Histórico para decisão (compliance light)**
   - quem falou, quando, por qual canal, e o que foi decidido

## Arquitetura em uma frase

Sistema event-driven com Event Store (PostgreSQL), State Machine para jornada do paciente, Decision Engine com LLM, e Action Orchestrator para execução de respostas.

## Core do produto (não negociável)

1. **Motor de inteligência de jornada**
   - leitura de eventos ao longo do tempo (primeiro contato, agendamento, atendimento, follow-ups, abandono, retorno)
   - linha do tempo automática (sem input manual)
2. **Detecção de risco (o ouro)**
   - score de abandono, insatisfação e churn
   - sinais: atraso, silêncio, repetição, linguagem, mudança de comportamento
   - a Healz não reage; ela antecipa
3. **Orquestração inteligente de ações**
   - decide quando IA atua, quando escalar para humano, quando alertar gestor
   - automação com lógica clara (regras + score)
4. **Identidade única do paciente**
   - nome, telefone, histórico mínimo e status calculado (ativo, em risco, sumido, retomado)
5. **Governança & logs**
   - registro de quem falou, quando, por qual canal e decisão tomada
   - LGPD-ready desde o início

## Must have (para vender e operar agora)

- Camada mínima de “CRM invisível”
  - lista de pacientes, busca simples, visualização por status, timeline clara
  - sem funil, sem pipeline, sem “arrastar card”
- Integração nativa com WhatsApp
  - canal principal das clínicas e onde a dor acontece
- Alertas acionáveis
  - poucos e bons; foco em risco real
- Dash simples para gestor
  - visão geral, pacientes em risco, recuperados e backlog crítico

## Plus (aumenta ticket e stickiness)

- **Clínicas**: relatórios mensais automáticos, insights de retenção, comparativos simples (antes/depois)
- **Operadoras**: score agregado por carteira, heatmap de risco, alertas de churn sistêmico, evidência de governança
- **Gestores**: configuração de regras, ajuste de thresholds, perfis de prioridade

## Regra de ouro do produto

Se exige input humano recorrente, não entra no MVP.  
O valor da Healz é: reduzir esforço, reduzir erro, reduzir dependência de pessoas.

## Como isso vira dinheiro

- **Clínicas**: pagam por organização + retenção
- **Operadoras**: pagam por proteção de carteira
- **Governo**: validação + escala futura

Mesmo core, superfícies diferentes.

## Documentação adicional

- [**ARCHITECTURE.md**](./ARCHITECTURE.md) - Arquitetura detalhada do sistema, componentes e fluxos
- [**STACK.md**](./STACK.md) - Stack tecnológica e decisões técnicas
