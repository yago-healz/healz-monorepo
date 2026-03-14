import { db } from '../../index'
import { conversationView, messageView } from '../../schema'
import type { SeedContext } from '../seed'
import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'

const PATIENT_MESSAGES = [
  'Olá! Gostaria de agendar uma consulta.',
  'Boa tarde! Vocês têm horário disponível essa semana?',
  'Quero saber mais sobre o procedimento de botox.',
  'Quanto custa uma limpeza de pele?',
  'Preciso remarcar meu agendamento.',
  'Vocês atendem pelo plano Unimed?',
  'Qual o horário de funcionamento da clínica?',
  'Vim por indicação da minha amiga Juliana.',
  'Quais procedimentos vocês oferecem?',
]

const BOT_MESSAGES = [
  'Olá! Sou a Carol, assistente virtual. Em que posso ajudar?',
  'Claro! Temos horários disponíveis. Qual dia você prefere?',
  'O procedimento tem duração de aproximadamente 30 minutos.',
  'Nossa tabela de procedimentos está disponível no site.',
  'Vou verificar a disponibilidade na agenda.',
  'Perfeito! Seu agendamento foi confirmado para ',
  'Obrigada por entrar em contato! Posso ajudar com mais alguma coisa?',
]

const AGENT_MESSAGES = [
  'Olá! Vi sua mensagem. Posso ajudar diretamente.',
  'Vou verificar isso para você agora mesmo.',
  'Feito! O agendamento foi confirmado.',
  'Pode vir sem problemas no horário marcado.',
]

export async function seedConversations(ctx: SeedContext, verbose: boolean): Promise<void> {
  if (verbose) console.log('  Seeding conversations and messages...')

  const totalConversations = 80
  const patientIds = ctx.patientIds.slice(0, totalConversations) // one conversation per patient (most)

  const statusDistribution = [
    ...Array(60).fill('active'),
    ...Array(15).fill('closed'),
    ...Array(5).fill('archived'),
  ]

  let totalMessages = 0
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const escalatableUsers = [ctx.userIds['maria'], ctx.userIds['ana']].filter(Boolean)

  for (let i = 0; i < Math.min(totalConversations, patientIds.length); i++) {
    const patientId = patientIds[i]
    const { clinicId, tenantId } = ctx.patientClinics[patientId]

    const status = statusDistribution[i]
    const isEscalated = i < 5 && status === 'active'
    const channel = Math.random() < 0.9 ? 'whatsapp' : faker.helpers.arrayElement(['instagram', 'email'])

    const conversationStart = faker.date.between({ from: ninetyDaysAgo, to: now })
    const convId = randomUUID()

    // Generate 3-7 messages
    const msgCount = faker.number.int({ min: 3, max: 7 })
    let lastMessageAt = conversationStart

    const messagesToInsert = []
    for (let m = 0; m < msgCount; m++) {
      const msgTime = new Date(lastMessageAt.getTime() + faker.number.int({ min: 1, max: 60 }) * 60 * 1000)
      lastMessageAt = msgTime

      const isIncoming = m % 2 === 0
      let sentBy: string
      let content: string

      if (isIncoming) {
        sentBy = 'patient'
        content = faker.helpers.arrayElement(PATIENT_MESSAGES)
      } else if (m === 1) {
        sentBy = 'bot'
        content = faker.helpers.arrayElement(BOT_MESSAGES)
      } else {
        sentBy = Math.random() < 0.6 ? 'bot' : 'agent'
        content = sentBy === 'bot'
          ? faker.helpers.arrayElement(BOT_MESSAGES)
          : faker.helpers.arrayElement(AGENT_MESSAGES)
      }

      const intent = isIncoming && Math.random() < 0.3
        ? faker.helpers.arrayElement(['scheduling', 'cancellation', 'question', 'information'])
        : null

      messagesToInsert.push({
        id: randomUUID(),
        conversationId: convId,
        direction: isIncoming ? 'incoming' : 'outgoing',
        fromPhone: isIncoming ? `+5511${faker.string.numeric(9)}` : null,
        toPhone: !isIncoming ? `+5511${faker.string.numeric(9)}` : null,
        content,
        messageType: 'text',
        sentBy,
        intent,
        intentConfidence: intent ? faker.number.float({ min: 0.7, max: 0.99, fractionDigits: 2 }).toString() : null,
        createdAt: msgTime,
      })
    }

    await db.insert(conversationView).values({
      id: convId,
      patientId,
      tenantId,
      clinicId,
      status,
      channel,
      isEscalated,
      escalatedToUserId: isEscalated && escalatableUsers.length > 0
        ? faker.helpers.arrayElement(escalatableUsers)
        : null,
      escalatedAt: isEscalated ? new Date(conversationStart.getTime() + 30 * 60 * 1000) : null,
      lastMessageAt,
      messageCount: msgCount,
      createdAt: conversationStart,
      updatedAt: lastMessageAt,
    })

    for (const msg of messagesToInsert) {
      await db.insert(messageView).values(msg as any)
    }

    ctx.conversationIds.push(convId)
    totalMessages += msgCount
  }

  if (verbose) console.log(`  ✓ ${totalConversations} conversations and ${totalMessages} messages created`)
}
