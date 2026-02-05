import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser, CurrentSession } from '../auth/decorators';
import { ContextService } from './context.service';
import { SwitchContextDto } from './dto';

@Controller('context')
@UseGuards(AuthGuard)
export class ContextController {
  constructor(private contextService: ContextService) {}

  @Get()
  async getCurrent(
    @CurrentSession() session: any,
    @CurrentUser() user: any,
  ) {
    return this.contextService.getCurrentContext(user.id, session);
  }

  @Get('available')
  async getAvailable(@CurrentUser() user: any) {
    return this.contextService.getAvailableContexts(user.id);
  }

  @Post('switch')
  async switchContext(
    @CurrentSession() session: any,
    @CurrentUser() user: any,
    @Body() dto: SwitchContextDto,
  ) {
    return this.contextService.switchContext(session.id, user.id, dto);
  }
}
