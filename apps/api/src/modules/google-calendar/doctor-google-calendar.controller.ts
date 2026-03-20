import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { IsString, IsNotEmpty } from 'class-validator'
import { DoctorGoogleCalendarService } from './doctor-google-calendar.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { IsClinicAdminOrSelfDoctorGuard } from '../../common/guards/is-clinic-admin-or-self-doctor.guard'
import { IsClinicMemberGuard } from '../../common/guards/is-clinic-member.guard'
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface'

class SelectCalendarDto {
  @IsString()
  @IsNotEmpty()
  calendarId: string

  @IsString()
  @IsNotEmpty()
  calendarName: string
}

class ListCalendarEventsQueryDto {
  @IsString()
  @IsNotEmpty()
  timeMin: string

  @IsString()
  @IsNotEmpty()
  timeMax: string
}

@ApiTags('Doctor Google Calendar')
@Controller()
export class DoctorGoogleCalendarController {
  private readonly logger = new Logger(DoctorGoogleCalendarController.name)

  constructor(private readonly doctorGoogleCalendarService: DoctorGoogleCalendarService) {}

  // GET /clinics/:clinicId/doctors/:doctorId/connectors/google-calendar/auth-url
  @Get('clinics/:clinicId/doctors/:doctorId/connectors/google-calendar/auth-url')
  @UseGuards(JwtAuthGuard, IsClinicAdminOrSelfDoctorGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Retorna URL de autenticação OAuth do Google Calendar para o médico' })
  async getAuthUrl(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
  ): Promise<{ authUrl: string }> {
    return { authUrl: await this.doctorGoogleCalendarService.getAuthUrl(clinicId, doctorId) }
  }

  // GET /auth/doctor-google-calendar/callback — sem JWT guard (chamado pelo Google)
  @Get('auth/doctor-google-calendar/callback')
  @ApiOperation({ summary: 'Callback OAuth do Google Calendar para médicos' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    try {
      await this.doctorGoogleCalendarService.handleOAuthCallback(code, state)
      res.redirect(
        `${frontendUrl}/clinic/profile?tab=conectores&gcal=pending-calendar-selection`,
      )
    } catch (err) {
      this.logger.error(`Google Calendar OAuth callback failed: ${err}`)
      res.redirect(
        `${frontendUrl}/clinic/profile?tab=conectores&gcal=error&reason=internal_error`,
      )
    }
  }

  // GET /clinics/:clinicId/doctors/:doctorId/connectors/google-calendar/calendars
  @Get('clinics/:clinicId/doctors/:doctorId/connectors/google-calendar/calendars')
  @UseGuards(JwtAuthGuard, IsClinicAdminOrSelfDoctorGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Lista calendários disponíveis na conta Google do médico' })
  async listCalendars(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
  ) {
    return this.doctorGoogleCalendarService.listCalendars(clinicId, doctorId)
  }

  // POST /clinics/:clinicId/doctors/:doctorId/connectors/google-calendar/select-calendar
  @Post('clinics/:clinicId/doctors/:doctorId/connectors/google-calendar/select-calendar')
  @UseGuards(JwtAuthGuard, IsClinicAdminOrSelfDoctorGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Seleciona o calendário a ser usado pelo médico' })
  async selectCalendar(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
    @Body() dto: SelectCalendarDto,
  ): Promise<void> {
    return this.doctorGoogleCalendarService.selectCalendar(
      clinicId,
      doctorId,
      dto.calendarId,
      dto.calendarName,
    )
  }

  // DELETE /clinics/:clinicId/doctors/:doctorId/connectors/google-calendar
  @Delete('clinics/:clinicId/doctors/:doctorId/connectors/google-calendar')
  @UseGuards(JwtAuthGuard, IsClinicAdminOrSelfDoctorGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Desconecta e revoga tokens do Google Calendar do médico' })
  async disconnect(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
  ): Promise<void> {
    return this.doctorGoogleCalendarService.disconnect(clinicId, doctorId)
  }

  // GET /clinics/:clinicId/doctors/:doctorId/calendar/events
  @Get('clinics/:clinicId/doctors/:doctorId/calendar/events')
  @UseGuards(JwtAuthGuard, IsClinicMemberGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Lista eventos do Google Calendar do médico' })
  async listCalendarEvents(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
    @Query() query: ListCalendarEventsQueryDto,
  ) {
    return this.doctorGoogleCalendarService.listEvents(clinicId, doctorId, query.timeMin, query.timeMax)
  }

  // GET /clinics/:clinicId/doctors/:doctorId/connectors
  @Get('clinics/:clinicId/doctors/:doctorId/connectors')
  @UseGuards(JwtAuthGuard, IsClinicAdminOrSelfDoctorGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Status dos conectores do médico' })
  async getConnectors(
    @Param('clinicId') clinicId: string,
    @Param('doctorId') doctorId: string,
  ): Promise<{ googleCalendar: boolean; whatsapp: boolean }> {
    const googleCalendar = await this.doctorGoogleCalendarService.isConnected(clinicId, doctorId)
    return { googleCalendar, whatsapp: false }
  }
}
