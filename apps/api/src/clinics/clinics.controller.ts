import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
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
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { ClinicsService } from "./clinics.service";
import { AddMemberDto } from "./dto/add-member.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { IsClinicAdminGuard } from "./guards/is-clinic-admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("Clinics")
@Controller("clinics")
export class ClinicsController {
  constructor(private clinicsService: ClinicsService) {}

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
            role: { type: "string", example: "secretary" },
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
}
