import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { auth } from './auth';

/**
 * Adaptador entre NestJS/Express e Better Auth.
 * Converte requisições Express para Web API (Fetch) e vice-versa,
 * delegando toda a lógica de autenticação para o Better Auth.
 *
 * Endpoints disponíveis (Better Auth):
 * - POST /api/auth/sign-up - Criar nova conta
 * - POST /api/auth/sign-in - Fazer login
 * - POST /api/auth/sign-out - Fazer logout
 * - GET /api/auth/session - Obter sessão atual
 * - POST /api/auth/verify-email - Verificar email
 * - POST /api/auth/forgot-password - Solicitar reset de senha
 * - POST /api/auth/reset-password - Resetar senha
 */
@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  @All('*')
  @ApiOperation({
    summary: 'Better Auth passthrough adapter',
    description: `This endpoint acts as a passthrough adapter for Better Auth library, handling all authentication flows.

Available Better Auth endpoints:
- POST /api/auth/sign-up - Create a new user account
- POST /api/auth/sign-in - Sign in with email and password
- POST /api/auth/sign-out - Sign out and invalidate session
- GET /api/auth/session - Get current session information
- POST /api/auth/verify-email - Verify email address
- POST /api/auth/forgot-password - Request password reset
- POST /api/auth/reset-password - Reset password with token

All requests are converted from Express format to Web API format and handled by Better Auth.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication operation successful',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid credentials or data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired session',
  })
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    // Converte Express req para Web Request
    const url = new URL(req.url, `http://${req.headers.host}`);
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
    });

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : undefined,
    });

    const response = await auth.handler(webRequest);

    // Converte Web Response para Express res
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.status(response.status).send(await response.text());
  }
}
