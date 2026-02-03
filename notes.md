- [ ] Infraestrutura
- [ ] Como configurar o monorepo
- [ ] Cadastro básico de usuários e clinicas
- [ ] Definir bem as etapas do onboarding e quais dados devemos coletar em cada uma.
- [ ] Como configurar o projeto para rodar local com docker
- [ ] Definir estratégia de CI/CD

Dúvidas

- Quais ações manuais a plataforma deve conseguir fazer? Ex: Agendamento, Editar informações do paciente, etc.
-

Ideias

- Configurar a carol e já conseguir testar pela plataforma, sem passar pelo whatsapp, apenas para teste.

Perguntas onboarding

Adicionar serviços e procedimentos

- duração
- valor
- descrição
- notas para a carol

Regras de agendamento

- Horários e datas onde a Carol NUNCA deve agendar (ex: fim de semana)
- Intervalo minimo entre consultas (em minutos)

Traços de personalidade da carol

- Personalidade (selecionar)
- Saudação inicial
- Restringir assuntos
- Regras de escalamento

Configurações de notificações/alertas

- Notificar o time sobre eventos importantes (ex: novo agendamento, risco de perda)
  - Receber via email ou whatsapp
  - Destination (lista de whatsapp)

Telas

Jornada do Paciente

- Listagem de todos os pacientes ou por status (em risco, aguardando clinica, em monitoramento, etc) com paginação
- Métricas importantes (Ex: Jornadas ativas, Pacientes com alta prioridade, Número de alto resolvidos)
  Fila de intervenção

---

Quero que você leia a minha documentação para ter contexto e me ajuda e pensar na estratégia de devops do meu sistema.

Algumas definições:

- Será um monorepo
- Um frontend react com vite
- API única em nestjs
- Fila (BullMq Redis)
- Banco postgres com pg vector

Coisas que preciso de ajuda pra definir:

- Como será a arquitetura inicial desse projeto. API única atende?
- Como configurar o projeto monorepo para eles terem ci/cd diferenre
- Quais soluções de cloud usaremos considerando que a cloud será GCP

---

Objetivo: Criar plano de implementação da arquitetura inicial da healz.

Criterios de aceite:

- Definição da estrutura inicial do monorepo
- Definir como será feita a configuração local do docker para desenvolvimento e como será o fluxo de trabalho.
- Definição do CI/CD da aplicação, que será feito utilizando o render com iac.
- projeção de gastos conforme o tamanho do projeto.
- deploy automatizado do frontend e do backend.

algumas coisas que já defini:

- iniciaremos com um monorepo com dois projetos: frontend em react com vite e api em nest js.
- por hora teremos somente um ambiente.
- quero que sempre que houver merge na main, aconteça um novo deploy
- os deploys dos projetos deve ser independente.
- quero algo simples, deixaremos mais complexo conforme o sistema cresce.

me consulte em cada etapa da elaboração desse plano.
ao final. crie um documento markdown quebrado por fases para fazer essa implementação, ele não deve ser prolixo mas deve conter informações suficientes para um agente de códigos conseguir executar.

use documentações atualizadas (context7) para montar seu plano.
