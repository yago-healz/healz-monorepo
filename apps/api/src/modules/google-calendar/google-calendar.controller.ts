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
} from '@nestjs/common'
import { Response } from 'express'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { IsString, IsNotEmpty } from 'class-validator'
import { GoogleCalendarService } from './google-calendar.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { IsClinicAdminGuard } from '../clinics/guards/is-clinic-admin.guard'

class SelectCalendarDto {
  @IsString()
  @IsNotEmpty()
  calendarId: string

  @IsString()
  @IsNotEmpty()
  calendarName: string
}

@ApiTags('Google Calendar')
@Controller()
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  // GET /clinics/:clinicId/connectors/google-calendar/auth-url
  @Get('clinics/:clinicId/connectors/google-calendar/auth-url')
  @UseGuards(JwtAuthGuard, IsClinicAdminGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Retorna URL de autenticação OAuth do Google Calendar' })
  getAuthUrl(@Param('clinicId') clinicId: string): { authUrl: string } {
    return { authUrl: this.googleCalendarService.getAuthUrl(clinicId) }
  }

  // GET /auth/google-calendar/callback — sem JWT guard (chamado pelo Google)
  @Get('auth/google-calendar/callback')
  @ApiOperation({ summary: 'Callback OAuth do Google Calendar' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    try {
      await this.googleCalendarService.handleOAuthCallback(code, state)
      res.redirect(
        `${frontendUrl}/clinic/settings?tab=conectores&gcal=pending-calendar-selection`,
      )
    } catch (err) {
      const reason =
        err instanceof Error ? encodeURIComponent(err.message) : 'unknown'
      res.redirect(
        `${frontendUrl}/clinic/settings?tab=conectores&gcal=error&reason=${reason}`,
      )
    }
  }

  // GET /clinics/:clinicId/connectors/google-calendar/calendars
  @Get('clinics/:clinicId/connectors/google-calendar/calendars')
  @UseGuards(JwtAuthGuard, IsClinicAdminGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Lista calendários disponíveis na conta Google vinculada' })
  async listCalendars(@Param('clinicId') clinicId: string) {
    return this.googleCalendarService.listCalendars(clinicId)
  }

  // POST /clinics/:clinicId/connectors/google-calendar/select-calendar
  @Post('clinics/:clinicId/connectors/google-calendar/select-calendar')
  @UseGuards(JwtAuthGuard, IsClinicAdminGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Seleciona o calendário a ser usado pela clínica' })
  async selectCalendar(
    @Param('clinicId') clinicId: string,
    @Body() dto: SelectCalendarDto,
  ): Promise<void> {
    return this.googleCalendarService.selectCalendar(
      clinicId,
      dto.calendarId,
      dto.calendarName,
    )
  }

  // DELETE /clinics/:clinicId/connectors/google-calendar
  @Delete('clinics/:clinicId/connectors/google-calendar')
  @UseGuards(JwtAuthGuard, IsClinicAdminGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Desconecta e revoga tokens do Google Calendar' })
  async disconnect(@Param('clinicId') clinicId: string): Promise<void> {
    return this.googleCalendarService.disconnect(clinicId)
  }

  // 🔧 DEBUG ENDPOINT: Testa conversão de timezone
  @Get('debug/timezone-test')
  @ApiOperation({ summary: '[DEBUG] Testa conversão de timezone e Free/Busy' })
  async debugTimezoneConversion(
    @Query('date') date: string = '2026-03-04',
    @Query('time') time: string = '14:30',
    @Query('timezone') timezone: string = 'America/Sao_Paulo',
  ) {
    return this.googleCalendarService.debugTimezoneConversion(date, time, timezone)
  }
}
