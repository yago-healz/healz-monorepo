import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { InvitesService } from "./invites.service";
import { SendInviteDto } from "./dto/send-invite.dto";
import { AcceptInviteDto } from "./dto/accept-invite.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { IsOrgAdminGuard } from "./guards/is-org-admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("Invites")
@Controller("invites")
export class InvitesController {
  constructor(private invitesService: InvitesService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, IsOrgAdminGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Enviar convite para novo usuário",
    description:
      "Cria um convite e envia email com link de aceitação. Requer permissão de admin da organização. Token válido por 7 dias.",
  })
  @ApiBody({ type: SendInviteDto })
  @ApiResponse({
    status: 201,
    description: "Convite enviado com sucesso",
    schema: {
      type: "object",
      properties: {
        message: { type: "string", example: "Convite enviado com sucesso" },
        invite: {
          type: "object",
          properties: {
            id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            email: { type: "string", example: "medico@example.com" },
            clinicId: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            role: { type: "string", example: "doctor" },
            expiresAt: { type: "string", example: "2026-02-14T10:00:00Z" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Email já cadastrado ou clínica inválida",
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
  async sendInvite(
    @Body() dto: SendInviteDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    return this.invitesService.sendInvite(
      user.userId,
      user.organizationId,
      dto,
      request.ip,
    );
  }

  @Post("accept")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: "Aceitar convite",
    description:
      "Cria conta de usuário usando o token de convite e define senha. Retorna tokens de autenticação para login automático.",
  })
  @ApiBody({ type: AcceptInviteDto })
  @ApiResponse({
    status: 200,
    description: "Convite aceito e conta criada com sucesso",
    schema: {
      type: "object",
      properties: {
        accessToken: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          description: "JWT access token para login automático",
        },
        user: {
          type: "object",
          properties: {
            id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            email: { type: "string", example: "medico@example.com" },
            name: { type: "string", example: "Dr. Maria Santos" },
            emailVerified: { type: "boolean", example: false },
            activeClinic: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string", example: "Unidade Principal" },
                organizationId: { type: "string" },
                role: { type: "string", example: "doctor" },
              },
            },
            availableClinics: { type: "array" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Token inválido, expirado ou já utilizado",
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit (5 requisições por minuto)",
  })
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.invitesService.acceptInvite(dto, request.ip);

    // Armazenar refresh token em httpOnly cookie
    response.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }
}
