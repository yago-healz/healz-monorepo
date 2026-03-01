import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

export class CheckAvailabilityTool extends StructuredTool {
  name = 'check_availability'
  description = 'Verifica horários disponíveis para agendamento em uma data específica'
  schema = z.object({
    date: z.string().describe('Data no formato YYYY-MM-DD'),
  })

  constructor(private readonly clinicId: string) {
    super()
  }

  async _call(input: { date: string }): Promise<string> {
    // MOCKADO para MVP — retorna slots simulados
    const mockSlots = [
      { time: '09:00', available: true },
      { time: '10:00', available: true },
      { time: '11:00', available: false },
      { time: '14:00', available: true },
      { time: '15:00', available: true },
      { time: '16:00', available: false },
    ]

    return JSON.stringify({
      date: input.date,
      slots: mockSlots,
      note: '[Playground] Dados simulados — não refletem disponibilidade real',
    })
  }
}
