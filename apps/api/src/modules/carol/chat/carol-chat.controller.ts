import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { IsClinicAdminGuard } from '../../clinics/guards/is-clinic-admin.guard'
import { CarolChatService } from './carol-chat.service'
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto'

@ApiTags('Carol')
@Controller('clinics')
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth('bearer')
export class CarolChatController {
  constructor(private readonly chatService: CarolChatService) {}

  @Post(':clinicId/carol/chat')
  @ApiOperation({ summary: 'Send message to Carol' })
  async chat(
    @Param('clinicId') clinicId: string,
    @Body() dto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    return this.chatService.processMessage(clinicId, dto)
  }
}
