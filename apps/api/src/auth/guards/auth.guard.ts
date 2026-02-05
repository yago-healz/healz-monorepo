import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { auth } from '../auth';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extrair headers
    const headers = new Headers();
    Object.entries(request.headers).forEach(([key, value]) => {
      if (value) headers.set(key, Array.isArray(value) ? value[0] : value as string);
    });

    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Anexar user e session ao request
    request.user = session.user;
    request.session = session.session;

    return true;
  }
}
