import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { IsClinicAdminGuard } from '../clinics/guards/is-clinic-admin.guard'
import { CreateProcedureDto } from './dto/create-procedure.dto'
import { ListProceduresQueryDto } from './dto/list-procedures-query.dto'
import { UpdateProcedureDto } from './dto/update-procedure.dto'
import { ProceduresService } from './procedures.service'

@ApiTags('Procedures')
@Controller('clinics/:clinicId/procedures')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
export class ProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Post()
  @UseGuards(IsClinicAdminGuard)
  @ApiOperation({ summary: 'Criar procedimento no catálogo da clínica' })
  create(@Param('clinicId') clinicId: string, @Body() dto: CreateProcedureDto) {
    return this.proceduresService.create(clinicId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Listar procedimentos da clínica' })
  findAll(@Param('clinicId') clinicId: string, @Query() query: ListProceduresQueryDto) {
    return this.proceduresService.findAll(clinicId, query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um procedimento' })
  findOne(@Param('clinicId') clinicId: string, @Param('id') id: string) {
    return this.proceduresService.findOne(clinicId, id)
  }

  @Patch(':id')
  @UseGuards(IsClinicAdminGuard)
  @ApiOperation({ summary: 'Atualizar procedimento' })
  update(
    @Param('clinicId') clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProcedureDto,
  ) {
    return this.proceduresService.update(clinicId, id, dto)
  }

  @Delete(':id')
  @UseGuards(IsClinicAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar procedimento (soft delete)' })
  deactivate(@Param('clinicId') clinicId: string, @Param('id') id: string) {
    return this.proceduresService.deactivate(clinicId, id)
  }
}
