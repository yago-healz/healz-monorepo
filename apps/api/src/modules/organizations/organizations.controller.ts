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
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { JwtPayload } from "../../common/interfaces/jwt-payload.interface";
import { CreateClinicDto } from "./dto/create-clinic.dto";
import { OrganizationsService } from "./organizations.service";

@ApiTags("Organizations")
@Controller("organizations")
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Post(":organizationId/clinics")
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Criar nova clínica",
    description:
      "Cria uma nova clínica dentro da organização. O usuário criador é automaticamente adicionado como admin da clínica. Requer permissão de admin da organização.",
  })
  @ApiParam({
    name: "organizationId",
    description: "ID da organização",
    example: "550e8400-e29b-41d4-a716-446655440000",
    type: String,
  })
  @ApiBody({ type: CreateClinicDto })
  @ApiResponse({
    status: 201,
    description: "Clínica criada com sucesso",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
        name: { type: "string", example: "Unidade Centro" },
        organizationId: {
          type: "string",
          example: "550e8400-e29b-41d4-a716-446655440000",
        },
        createdAt: { type: "string", example: "2026-02-07T10:00:00Z" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Organização não existe",
  })
  @ApiResponse({
    status: 401,
    description: "Não autenticado",
  })
  @ApiResponse({
    status: 403,
    description: "Sem permissão de admin na organização",
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit (10 requisições por minuto)",
  })
  async createClinic(
    @Param("organizationId") organizationId: string,
    @Body() dto: CreateClinicDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    return this.organizationsService.createClinic(
      organizationId,
      user.userId,
      dto,
      request.ip,
    );
  }
}
