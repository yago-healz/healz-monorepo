import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { SignupService } from "./signup.service";
import { SignupDto } from "./dto/signup.dto";

@ApiTags("Signup")
@Controller("signup")
export class SignupController {
  constructor(private signupService: SignupService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({
    summary: "Criar nova organização (Signup B2B)",
    description:
      "Cria uma nova organização, primeira clínica e usuário administrador. Retorna tokens de autenticação para login automático.",
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 201,
    description: "Organização criada com sucesso",
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
            email: { type: "string", example: "joao@clinica-exemplo.com" },
            name: { type: "string", example: "Dr. João Silva" },
            emailVerified: { type: "boolean", example: false },
            activeClinic: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string", example: "Unidade Principal" },
                organizationId: { type: "string" },
                role: { type: "string", example: "admin" },
              },
            },
            availableClinics: { type: "array" },
          },
        },
        organization: {
          type: "object",
          properties: {
            id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            name: { type: "string", example: "Clínica Exemplo" },
            slug: { type: "string", example: "clinica-exemplo" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Dados inválidos (email já cadastrado, slug já em uso, validação falhou)",
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit (3 requisições por minuto)",
  })
  async signup(
    @Body() signupDto: SignupDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.signupService.signup(signupDto, request.ip);

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
      organization: result.organization,
    };
  }
}
