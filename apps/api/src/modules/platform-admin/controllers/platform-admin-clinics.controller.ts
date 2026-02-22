import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JwtPayload } from "../../../common/interfaces/jwt-payload.interface";
import { PlatformAdminGuard } from "../guards/platform-admin.guard";
import { PlatformAdminClinicsService } from "../services/platform-admin-clinics.service";
import { ListClinicsQueryDto } from "../dto/clinics/list-clinics-query.dto";
import { PlatformAdminCreateClinicDto } from "../dto/clinics/create-clinic.dto";
import { UpdateClinicDto } from "../dto/clinics/update-clinic.dto";
import { TransferClinicDto } from "../dto/clinics/transfer-clinic.dto";
import { UpdateClinicStatusDto } from "../dto/clinics/update-clinic-status.dto";

@ApiTags("Platform Admin - Clinics")
@Controller("platform-admin/clinics")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@ApiBearerAuth("bearer")
export class PlatformAdminClinicsController {
  constructor(private clinicsService: PlatformAdminClinicsService) {}

  @Get()
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  @ApiOperation({
    summary: "Listar clínicas",
    description:
      "Lista todas as clínicas com paginação, filtros e ordenação",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de clínicas",
  })
  async list(
    @Query() query: ListClinicsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clinicsService.list(query, user.userId);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Ver detalhes da clínica",
  })
  @ApiResponse({
    status: 200,
    description: "Detalhes da clínica",
  })
  @ApiResponse({
    status: 404,
    description: "Clínica não encontrada",
  })
  async getById(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clinicsService.getById(id, user.userId);
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary: "Criar clínica",
  })
  @ApiResponse({
    status: 201,
    description: "Clínica criada",
  })
  async create(
    @Body() dto: PlatformAdminCreateClinicDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.clinicsService.create(dto, user.userId, request.ip);
  }

  @Patch(":id")
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary: "Editar clínica",
  })
  @ApiResponse({
    status: 200,
    description: "Clínica atualizada",
  })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateClinicDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.clinicsService.update(id, dto, user.userId, request.ip);
  }

  @Patch(":id/transfer")
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary: "Transferir clínica para outra organização",
  })
  @ApiResponse({
    status: 200,
    description: "Clínica transferida",
  })
  async transfer(
    @Param("id") id: string,
    @Body() dto: TransferClinicDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.clinicsService.transfer(id, dto, user.userId, request.ip);
  }

  @Patch(":id/status")
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary: "Ativar/Desativar clínica",
  })
  @ApiResponse({
    status: 200,
    description: "Status atualizado",
  })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateClinicStatusDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.clinicsService.updateStatus(
      id,
      dto,
      user.userId,
      request.ip,
    );
  }
}
