import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import {
  LoginDto,
  SwitchContextDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from "./dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: "Login de usuário",
    description:
      "Autentica o usuário com email e senha. Retorna um access token JWT e define um refresh token httpOnly cookie.",
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "Login realizado com sucesso",
    schema: {
      type: "object",
      properties: {
        accessToken: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          description: "JWT access token (válido por 15 minutos)",
        },
        user: {
          type: "object",
          properties: {
            id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            email: { type: "string", example: "doctor@clinic.com" },
            name: { type: "string", example: "Dr. João Silva" },
            emailVerified: { type: "boolean", example: true },
            activeClinic: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                organizationId: { type: "string" },
                role: { type: "string", enum: ["admin", "manager", "doctor", "receptionist", "viewer"] },
              },
            },
            availableClinics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  clinicId: { type: "string" },
                  clinicName: { type: "string" },
                  role: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Credenciais inválidas",
  })
  @ApiResponse({
    status: 429,
    description: "Muitas tentativas de login (rate limit: 5 requisições por minuto)",
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      loginDto.email,
      loginDto.password,
      loginDto.clinicId,
      request.ip,
    );

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

  @Post("switch-context")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Trocar contexto de clínica",
    description:
      "Permite ao usuário trocar a clínica ativa. Retorna um novo access token com o contexto atualizado.",
  })
  @ApiBody({ type: SwitchContextDto })
  @ApiResponse({
    status: 200,
    description: "Contexto trocado com sucesso",
    schema: {
      type: "object",
      properties: {
        accessToken: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          description: "Novo JWT access token com contexto atualizado",
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Não autenticado ou usuário não tem acesso à clínica",
  })
  async switchContext(
    @Body() dto: SwitchContextDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.authService.switchContext(user.userId, dto.clinicId);
  }

  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiCookieAuth("refreshToken")
  @ApiOperation({
    summary: "Renovar access token",
    description:
      "Renova o access token usando o refresh token armazenado no cookie httpOnly. Implementa refresh token rotation para maior segurança.",
  })
  @ApiResponse({
    status: 200,
    description: "Access token renovado com sucesso",
    schema: {
      type: "object",
      properties: {
        accessToken: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          description: "Novo JWT access token",
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      "Refresh token inválido, expirado ou reutilizado (detecção de roubo de token)",
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit (20 requisições por minuto)",
  })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies["refreshToken"];
    if (!refreshToken) {
      throw new UnauthorizedException("No refresh token");
    }

    const result = await this.authService.refreshAccessToken(refreshToken);

    // Setar novo refresh token no cookie
    response.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: result.accessToken };
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiBearerAuth("bearer")
  @ApiCookieAuth("refreshToken")
  @ApiOperation({
    summary: "Logout do usuário",
    description:
      "Invalida todos os refresh tokens da família (logout de todos os dispositivos) e limpa o cookie de refresh token.",
  })
  @ApiResponse({
    status: 204,
    description: "Logout realizado com sucesso (sem conteúdo)",
  })
  @ApiResponse({
    status: 401,
    description: "Não autenticado",
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @CurrentUser() user: JwtPayload,
  ) {
    const refreshToken = request.cookies["refreshToken"];
    if (refreshToken) {
      await this.authService.logout(refreshToken, user.userId);
    }
    response.clearCookie("refreshToken");
  }

  @Post("verify-email")
  @HttpCode(200)
  @ApiOperation({
    summary: "Verificar email",
    description:
      "Verifica o email do usuário usando o token recebido por email. Marca o email como verificado no sistema.",
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: "Email verificado com sucesso",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Email verificado com sucesso",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Token inválido ou expirado",
  })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { message: "Email verificado com sucesso" };
  }

  @Post("resend-verification")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Reenviar email de verificação",
    description:
      "Reenvia o email de verificação para o usuário autenticado. Gera um novo token de verificação.",
  })
  @ApiResponse({
    status: 200,
    description: "Email de verificação reenviado",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Email de verificação reenviado",
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Não autenticado",
  })
  async resendVerification(@CurrentUser() user: JwtPayload) {
    await this.authService.resendVerificationEmail(user.userId);
    return { message: "Email de verificação reenviado" };
  }

  @Post("forgot-password")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({
    summary: "Solicitar reset de senha",
    description:
      "Envia um email com link para reset de senha. Sempre retorna sucesso para prevenir enumeração de emails cadastrados.",
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description:
      "Mensagem genérica (não revela se o email existe no sistema por segurança)",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example:
            "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.",
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit (3 requisições por minuto)",
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    // Sempre retorna sucesso (previne enumeração de emails)
    return {
      message:
        "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.",
    };
  }

  @Post("reset-password")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: "Resetar senha",
    description:
      "Reseta a senha usando o token recebido por email. Invalida todos os refresh tokens existentes por segurança.",
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: "Senha alterada com sucesso",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Senha alterada com sucesso. Faça login com sua nova senha.",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Token inválido ou expirado",
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit (5 requisições por minuto)",
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: "Senha alterada com sucesso. Faça login com sua nova senha." };
  }
}
