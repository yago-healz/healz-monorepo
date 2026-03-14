export const CLINIC_OBJECTIVES_DATA: Record<string, {
  priorities: Array<{ id: string; title: string; description: string }>
  painPoints: Array<{ id: string; title: string; description: string; selected: boolean }>
  additionalNotes: string | null
}> = {
  bellavita_sp: {
    priorities: [
      { id: 'p1', title: 'Aumentar taxa de retorno de pacientes', description: 'Fidelizar pacientes com programas de acompanhamento e follow-up automatizado' },
      { id: 'p2', title: 'Reduzir no-shows e cancelamentos', description: 'Implementar lembretes automáticos e confirmações via WhatsApp' },
      { id: 'p3', title: 'Expandir captação de novos pacientes', description: 'Qualificar leads de redes sociais e indicações' },
    ],
    painPoints: [
      { id: 'pp1', title: 'Alto índice de agendamentos não confirmados', description: 'Pacientes que agendam mas não confirmam presença', selected: true },
      { id: 'pp2', title: 'Dificuldade em gerenciar múltiplos canais de atendimento', description: 'WhatsApp, telefone e Instagram descentralizados', selected: true },
      { id: 'pp3', title: 'Falta de visibilidade sobre o ciclo do paciente', description: 'Não sabemos quando um paciente está prestes a abandonar', selected: false },
    ],
    additionalNotes: 'Foco em procedimentos de alta rentabilidade e fidelização de pacientes premium.',
  },
  bellavita_rj: {
    priorities: [
      { id: 'p1', title: 'Melhorar experiência do paciente', description: 'Atendimento personalizado e ágil do primeiro contato ao pós-procedimento' },
      { id: 'p2', title: 'Aumentar ticket médio', description: 'Oferecer combos de procedimentos e planos de tratamento' },
    ],
    painPoints: [
      { id: 'pp1', title: 'Dificuldade em converter leads', description: 'Muitos interessados mas baixa conversão para agendamento', selected: true },
      { id: 'pp2', title: 'Comunicação pós-procedimento deficiente', description: 'Falta de follow-up estruturado após atendimento', selected: true },
    ],
    additionalNotes: null,
  },
  smileplus: {
    priorities: [
      { id: 'p1', title: 'Reduzir tempo de espera', description: 'Otimizar agenda e comunicação com pacientes sobre horários disponíveis' },
      { id: 'p2', title: 'Aumentar adesão ao tratamento ortodôntico', description: 'Pacientes que abandonam tratamentos de longo prazo' },
      { id: 'p3', title: 'Automatizar agendamento de retornos', description: 'Lembretes automáticos para consultas de manutenção' },
    ],
    painPoints: [
      { id: 'pp1', title: 'Abandono de tratamentos longos', description: 'Pacientes que param tratamentos de ortodontia no meio', selected: true },
      { id: 'pp2', title: 'Agendamento manual de retornos', description: 'Recepção gasta muito tempo ligando para pacientes', selected: true },
      { id: 'pp3', title: 'Falta de integração entre canais', description: 'WhatsApp não integrado com sistema de agendamento', selected: false },
    ],
    additionalNotes: 'Especialidade em ortodontia requer comunicação de longo prazo com pacientes.',
  },
}

export const CLINIC_SERVICES_DATA: Record<string, Array<{
  id: string
  title: string
  description: string
  duration: number
  value: number
  note: string | null
}>> = {
  bellavita_sp: [
    { id: 's1', title: 'Botox', description: 'Toxina botulínica para rejuvenescimento', duration: 30, value: 800, note: 'Preço por região' },
    { id: 's2', title: 'Preenchimento', description: 'Ácido hialurônico para volume e contorno', duration: 45, value: 1200, note: 'Por seringa' },
    { id: 's3', title: 'Pacote Harmonização Completa', description: 'Botox + Preenchimento + Bioestimulador', duration: 120, value: 3500, note: 'Parcelamento disponível' },
  ],
  bellavita_rj: [
    { id: 's1', title: 'Botox', description: 'Toxina botulínica para rejuvenescimento', duration: 30, value: 850, note: null },
    { id: 's2', title: 'Harmonização Facial', description: 'Pacote completo de harmonização', duration: 120, value: 3800, note: 'Inclui avaliação' },
  ],
  smileplus: [
    { id: 's1', title: 'Ortodontia Completa', description: 'Aparelho fixo por 18-24 meses', duration: 90, value: 4500, note: '18x sem juros' },
    { id: 's2', title: 'Alinhadores Invisíveis', description: 'Invisalign ou similar por 12-18 meses', duration: 60, value: 6000, note: 'Parcelamento em até 24x' },
    { id: 's3', title: 'Implante + Coroa', description: 'Implante osseointegrado com coroa de porcelana', duration: 120, value: 3500, note: 'Por unidade' },
  ],
}

export const CAROL_SETTINGS_DATA: Record<string, {
  name: string
  selectedTraits: string[]
  voiceTone: string
  greeting: string
  restrictSensitiveTopics: boolean
  schedulingRules: Record<string, boolean | string>
  status: string
}> = {
  bellavita_sp: {
    name: 'Carol',
    selectedTraits: ['acolhedora', 'empática', 'profissional', 'proativa'],
    voiceTone: 'empathetic',
    greeting: 'Olá! Sou a Carol, assistente virtual da Bella Vita. Estou aqui para ajudar com agendamentos, informações sobre nossos procedimentos e muito mais. Como posso te ajudar hoje? 😊',
    restrictSensitiveTopics: true,
    schedulingRules: {
      confirmBeforeScheduling: true,
      allowCancellation: true,
      allowRescheduling: true,
      postSchedulingMessage: 'Seu agendamento foi confirmado! Você receberá um lembrete 24h antes. Em caso de dúvidas, estou aqui! 💆‍♀️',
    },
    status: 'published',
  },
  bellavita_rj: {
    name: 'Carol',
    selectedTraits: ['acolhedora', 'empática'],
    voiceTone: 'empathetic',
    greeting: 'Olá! Sou a Carol da Bella Vita RJ. Como posso ajudar?',
    restrictSensitiveTopics: true,
    schedulingRules: {
      confirmBeforeScheduling: true,
      allowCancellation: true,
      allowRescheduling: false,
    },
    status: 'draft',
  },
  smileplus: {
    name: 'Carol',
    selectedTraits: ['profissional', 'informativa'],
    voiceTone: 'formal',
    greeting: 'Bom dia! Sou a assistente virtual do SmilePlus. Como posso ajudar com seu sorriso hoje?',
    restrictSensitiveTopics: true,
    schedulingRules: {
      confirmBeforeScheduling: false,
      allowCancellation: true,
      allowRescheduling: true,
    },
    status: 'draft',
  },
}
