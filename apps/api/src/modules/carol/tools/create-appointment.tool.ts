import { Logger } from '@nestjs/common'
import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

export class CreateAppointmentTool extends StructuredTool {
  name = 'create_appointment'
  description = 'Cria um agendamento de consulta para o paciente'
  schema = z.object({
    date: z.string().describe('Data no formato YYYY-MM-DD'),
    time: z.string().describe('Horário no formato HH:MM'),
    patientName: z.string().describe('Nome do paciente'),
    service: z.string().optional().describe('Serviço desejado'),
  })

  private readonly logger = new Logger(CreateAppointmentTool.name)

  constructor(private readonly clinicId: string) {
    super()
  }

  async _call(input: { date: string; time: string; patientName: string; service?: string }): Promise<string> {
    this.logger.log(`[CreateAppointmentTool] Creating appointment for clinic ${this.clinicId}`, {
      date: input.date,
      time: input.time,
      patientName: input.patientName,
      service: input.service,
    })

    // MOCKADO para MVP — não cria no banco
    const mockAppointmentId = `mock-${Date.now()}`
    const response = {
      success: true,
      appointmentId: mockAppointmentId,
      date: input.date,
      time: input.time,
      patientName: input.patientName,
      service: input.service || 'Consulta geral',
      note: '[Playground] Agendamento simulado — não foi criado no sistema',
    }

    this.logger.debug(`[CreateAppointmentTool] Mock appointment response:`, response)

    return JSON.stringify(response)
  }
}
