import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { PaymentMethodsService } from './payment-methods.service'
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto'
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { IsClinicAdminGuard } from '../clinics/guards/is-clinic-admin.guard'

@ApiTags('Payment Methods')
@Controller('clinics/:clinicId/payment-methods')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Post()
  @UseGuards(IsClinicAdminGuard)
  @ApiOperation({ summary: 'Criar forma de pagamento' })
  create(@Param('clinicId') clinicId: string, @Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(clinicId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Listar formas de pagamento da clínica' })
  findAll(@Param('clinicId') clinicId: string) {
    return this.paymentMethodsService.findAll(clinicId)
  }

  @Patch(':id')
  @UseGuards(IsClinicAdminGuard)
  @ApiOperation({ summary: 'Atualizar forma de pagamento' })
  update(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.update(clinicId, id, dto)
  }

  @Delete(':id')
  @UseGuards(IsClinicAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar forma de pagamento (soft delete)' })
  deactivate(@Param('clinicId') clinicId: string, @Param('id') id: string) {
    return this.paymentMethodsService.deactivate(clinicId, id)
  }
}
