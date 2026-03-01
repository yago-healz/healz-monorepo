import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { IsClinicAdminGuard } from '../clinics/guards/is-clinic-admin.guard'
import { CarolConfigService } from './carol-config.service'
import { SaveCarolConfigDto } from './dto/save-carol-config.dto'

@ApiTags('Carol')
@Controller('clinics')
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth('bearer')
export class CarolConfigController {
  constructor(private readonly carolConfigService: CarolConfigService) {}

  @Get(':clinicId/carol/config')
  @ApiOperation({ summary: 'Get Carol draft config' })
  async getDraftConfig(@Param('clinicId') clinicId: string) {
    return this.carolConfigService.getDraftConfig(clinicId)
  }

  @Put(':clinicId/carol/config')
  @ApiOperation({ summary: 'Save Carol draft config' })
  async saveDraftConfig(
    @Param('clinicId') clinicId: string,
    @Body() dto: SaveCarolConfigDto,
  ) {
    return this.carolConfigService.saveDraftConfig(clinicId, dto)
  }

  @Post(':clinicId/carol/config/publish')
  @ApiOperation({ summary: 'Publish Carol draft config' })
  async publishConfig(@Param('clinicId') clinicId: string) {
    return this.carolConfigService.publishDraft(clinicId)
  }

  @Get(':clinicId/carol/config/published')
  @ApiOperation({ summary: 'Get Carol published config' })
  async getPublishedConfig(@Param('clinicId') clinicId: string) {
    return this.carolConfigService.getPublishedConfig(clinicId)
  }
}
