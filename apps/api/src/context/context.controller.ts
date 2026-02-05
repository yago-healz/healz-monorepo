import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser, CurrentSession } from '../auth/decorators';
import { ContextService } from './context.service';
import { SwitchContextDto } from './dto';

@ApiTags('Context')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({
  description: 'Unauthorized - Invalid or missing authentication token',
})
@Controller('context')
@UseGuards(AuthGuard)
export class ContextController {
  constructor(private contextService: ContextService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current context',
    description:
      'Returns the current active organization and clinic context for the user session',
  })
  @ApiResponse({
    status: 200,
    description: 'Current context retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
        },
        clinicId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
        },
        organization: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            logo: { type: 'string', nullable: true },
          },
        },
        clinic: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
          },
        },
      },
    },
  })
  async getCurrent(
    @CurrentSession() session: any,
    @CurrentUser() user: any,
  ) {
    return this.contextService.getCurrentContext(user.id, session);
  }

  @Get('available')
  @ApiOperation({
    summary: 'Get available contexts',
    description:
      'Returns all available organizations and clinics that the user can switch to',
  })
  @ApiResponse({
    status: 200,
    description: 'Available contexts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        organizations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              slug: { type: 'string' },
              logo: { type: 'string', nullable: true },
              role: {
                type: 'string',
                enum: ['admin', 'manager', 'doctor', 'receptionist'],
              },
              clinics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    slug: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getAvailable(@CurrentUser() user: any) {
    return this.contextService.getAvailableContexts(user.id);
  }

  @Post('switch')
  @ApiOperation({
    summary: 'Switch context',
    description:
      'Switches the user session to a different organization and optionally a specific clinic',
  })
  @ApiResponse({
    status: 200,
    description: 'Context switched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        organizationId: { type: 'string', format: 'uuid' },
        clinicId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Organization or clinic not found, or user does not have access',
  })
  @ApiBadRequestResponse({
    description: 'Invalid organization or clinic ID',
  })
  async switchContext(
    @CurrentSession() session: any,
    @CurrentUser() user: any,
    @Body() dto: SwitchContextDto,
  ) {
    return this.contextService.switchContext(session.id, user.id, dto);
  }
}
