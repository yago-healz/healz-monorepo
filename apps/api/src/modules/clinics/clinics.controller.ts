import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { ClinicsService } from "./clinics.service";
import { AddMemberDto } from "./dto/add-member.dto";
import { ListMembersQueryDto } from "./dto/list-members-query.dto";
import { UpdateMemberRoleDto } from "./dto/update-member-role.dto";
import { ResendInviteDto } from "./dto/resend-invite.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { IsClinicAdminGuard } from "./guards/is-clinic-admin.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../../common/interfaces/jwt-payload.interface";

@ApiTags("Clinics")
@Controller("clinics")
export class ClinicsController {
  constructor(private clinicsService: ClinicsService) {}

  @Get(":clinicId/members")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, IsClinicAdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Listar membros da clínica" })
  @ApiParam({ name: "clinicId", type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Lista de membros e convites pendentes" })
  @ApiResponse({ status: 401, description: "Não autenticado" })
  @ApiResponse({ status: 403, description: "Sem permissão de admin" })
  async listMembers(
    @Param("clinicId") clinicId: string,
    @Query() query: ListMembersQueryDto,
  ) {
    return this.clinicsService.listMembers(clinicId, query);
  }

  @Post(":clinicId/members")
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, IsClinicAdminGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Adicionar membro a clínica",
    description:
      "Adiciona um usuário existente à clínica com um role específico. Requer permissão de admin da organização ou da clínica.",
  })
  @ApiParam({
    name: "clinicId",
    description: "ID da clínica",
    example: "550e8400-e29b-41d4-a716-446655440000",
    type: String,
  })
  @ApiBody({ type: AddMemberDto })
  @ApiResponse({
    status: 201,
    description: "Membro adicionado com sucesso",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Usuário adicionado à clínica com sucesso",
        },
        member: {
          type: "object",
          properties: {
            userId: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            clinicId: {
              type: "string",
              example: "550e8400-e29b-41d4-a716-446655440000",
            },
            role: { type: "string", example: "receptionist" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Usuário não existe, clínica não existe ou usuário já é membro",
  })
  @ApiResponse({
    status: 401,
    description: "Não autenticado",
  })
  @ApiResponse({
    status: 403,
    description: "Sem permissão de admin",
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit (10 requisições por minuto)",
  })
  async addMember(
    @Param("clinicId") clinicId: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    return this.clinicsService.addMember(
      clinicId,
      user.userId,
      dto,
      request.ip,
    );
  }

  @Post(":clinicId/members/resend-invite")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, IsClinicAdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Reenviar convite pendente" })
  async resendInvite(
    @Param("clinicId") clinicId: string,
    @Body() dto: ResendInviteDto,
  ) {
    return this.clinicsService.resendInvite(clinicId, dto.email);
  }

  @Delete(":clinicId/members/:userId")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, IsClinicAdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Remover membro da clínica" })
  async removeMember(
    @Param("clinicId") clinicId: string,
    @Param("userId") userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clinicsService.removeMember(clinicId, user.userId, userId);
  }

  @Patch(":clinicId/members/:userId")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, IsClinicAdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Atualizar cargo do membro" })
  async updateMemberRole(
    @Param("clinicId") clinicId: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.clinicsService.updateMemberRole(clinicId, userId, dto.role);
  }
}
