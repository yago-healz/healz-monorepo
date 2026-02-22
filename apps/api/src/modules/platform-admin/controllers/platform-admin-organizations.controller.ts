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
import { PlatformAdminOrganizationsService } from "../services/platform-admin-organizations.service";
import { ListOrganizationsQueryDto } from "../dto/organizations/list-organizations-query.dto";
import { CreateOrganizationDto } from "../dto/organizations/create-organization.dto";
import { UpdateOrganizationDto } from "../dto/organizations/update-organization.dto";
import { UpdateOrgStatusDto } from "../dto/organizations/update-org-status.dto";

@ApiTags("Platform Admin - Organizations")
@Controller("platform-admin/organizations")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@ApiBearerAuth("bearer")
export class PlatformAdminOrganizationsController {
  constructor(
    private organizationsService: PlatformAdminOrganizationsService,
  ) {}

  @Get()
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  @ApiOperation({
    summary: "Listar organizações",
    description:
      "Lista todas as organizações com suporte a paginação, filtros e ordenação",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de organizações",
  })
  async list(
    @Query() query: ListOrganizationsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.organizationsService.list(query, user.userId);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Ver detalhes da organização",
    description:
      "Retorna informações completas da organização, clínicas e admins",
  })
  @ApiResponse({
    status: 200,
    description: "Detalhes da organização",
  })
  @ApiResponse({
    status: 404,
    description: "Organização não encontrada",
  })
  async getById(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.organizationsService.getById(id, user.userId);
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary: "Criar organização manualmente",
    description: "Cria organização com clínica inicial e admin",
  })
  @ApiResponse({
    status: 201,
    description: "Organização criada com sucesso",
  })
  @ApiResponse({
    status: 400,
    description: "Slug já existe ou dados inválidos",
  })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.organizationsService.create(dto, user.userId, request.ip);
  }

  @Patch(":id")
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary: "Editar organização",
    description: "Atualiza nome e/ou slug da organização",
  })
  @ApiResponse({
    status: 200,
    description: "Organização atualizada",
  })
  @ApiResponse({
    status: 404,
    description: "Organização não encontrada",
  })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.organizationsService.update(
      id,
      dto,
      user.userId,
      request.ip,
    );
  }

  @Patch(":id/status")
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary: "Ativar/Desativar organização",
    description:
      "Altera status da organização e todas as suas clínicas (se desativando)",
  })
  @ApiResponse({
    status: 200,
    description: "Status atualizado",
  })
  @ApiResponse({
    status: 404,
    description: "Organização não encontrada",
  })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateOrgStatusDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.organizationsService.updateStatus(
      id,
      dto,
      user.userId,
      request.ip,
    );
  }
}
