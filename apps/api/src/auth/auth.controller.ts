import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { auth } from './auth';

/**
 * Adaptador entre NestJS/Express e Better Auth.
 * Converte requisições Express para Web API (Fetch) e vice-versa,
 * delegando toda a lógica de autenticação para o Better Auth.
 */
@Controller('api/auth')
export class AuthController {
  @All('*')
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
