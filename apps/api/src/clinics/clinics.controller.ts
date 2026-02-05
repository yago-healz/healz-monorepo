import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser, CurrentOrg, CurrentSession } from '../auth/decorators';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto } from './dto';

@ApiTags('Clinics')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({
  description: 'Unauthorized - Invalid or missing authentication token',
})
@Controller('clinics')
@UseGuards(AuthGuard, RolesGuard)
export class ClinicsController {
  constructor(private clinicsService: ClinicsService) {}

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Create a new clinic',
    description:
      'Creates a new clinic within the current organization. Requires admin or manager role.',
  })
  @ApiResponse({
    status: 201,
    description: 'Clinic created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        organizationId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        slug: { type: 'string' },
        phone: { type: 'string', nullable: true },
        email: { type: 'string', nullable: true },
        address: { type: 'object', nullable: true },
        timezone: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have admin or manager role',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or slug already exists',
  })
  async create(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateClinicDto,
  ) {
    return this.clinicsService.create(orgId, user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List clinics in organization',
    description:
      'Returns all clinics within the current organization context',
  })
  @ApiResponse({
    status: 200,
    description: 'List of clinics retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organizationId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          phone: { type: 'string', nullable: true },
          email: { type: 'string', nullable: true },
          address: { type: 'object', nullable: true },
          timezone: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async list(@CurrentOrg() orgId: string) {
    return this.clinicsService.findByOrg(orgId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get clinic by ID',
    description:
      'Returns detailed information about a specific clinic within the current organization',
  })
  @ApiParam({
    name: 'id',
    description: 'Clinic ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        organizationId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        slug: { type: 'string' },
        phone: { type: 'string', nullable: true },
        email: { type: 'string', nullable: true },
        address: { type: 'object', nullable: true },
        timezone: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Clinic not found or does not belong to the organization',
  })
  async getOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @CurrentOrg() orgId: string,
  ) {
    return this.clinicsService.findOne(id, user.id, orgId);
  }

  @Post(':id/set-active')
  @ApiOperation({
    summary: 'Set active clinic',
    description:
      'Sets the specified clinic as the active context for the current session',
  })
  @ApiParam({
    name: 'id',
    description: 'Clinic ID to set as active',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Clinic set as active successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        clinicId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Clinic not found or does not belong to the organization',
  })
  async setActive(
    @Param('id') id: string,
    @CurrentSession() session: any,
    @CurrentUser() user: any,
    @CurrentOrg() orgId: string,
  ) {
    return this.clinicsService.setActive(session.id, id, user.id, orgId);
  }
}
