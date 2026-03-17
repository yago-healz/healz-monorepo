import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { IsClinicAdminGuard } from '../clinics/guards/is-clinic-admin.guard'
import { CreateFaqDto } from './dto/create-faq.dto'
import { UpdateFaqDto } from './dto/update-faq.dto'
import { FaqService } from './faq.service'

@ApiTags('Carol')
@Controller('clinics')
@UseGuards(JwtAuthGuard, IsClinicAdminGuard)
@ApiBearerAuth('bearer')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get(':clinicId/carol/faqs')
  @ApiOperation({ summary: 'List FAQs' })
  list(@Param('clinicId') clinicId: string) {
    return this.faqService.list(clinicId)
  }

  @Post(':clinicId/carol/faqs')
  @ApiOperation({ summary: 'Create FAQ' })
  create(@Param('clinicId') clinicId: string, @Body() dto: CreateFaqDto) {
    return this.faqService.create(clinicId, dto)
  }

  @Patch(':clinicId/carol/faqs/:faqId')
  @ApiOperation({ summary: 'Update FAQ' })
  update(
    @Param('clinicId') clinicId: string,
    @Param('faqId') faqId: string,
    @Body() dto: UpdateFaqDto,
  ) {
    return this.faqService.update(clinicId, faqId, dto)
  }

  @Delete(':clinicId/carol/faqs/:faqId')
  @ApiOperation({ summary: 'Delete FAQ' })
  remove(@Param('clinicId') clinicId: string, @Param('faqId') faqId: string) {
    return this.faqService.remove(clinicId, faqId)
  }
}
