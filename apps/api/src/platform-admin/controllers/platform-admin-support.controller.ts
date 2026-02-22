import {
  Controller,
  Post,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../../common/interfaces/jwt-payload.interface";
import { PlatformAdminGuard } from "../guards/platform-admin.guard";
import { PlatformAdminImpersonationService } from "../services/platform-admin-impersonation.service";

@ApiTags("Platform Admin - Support")
@Controller("platform-admin/users")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@ApiBearerAuth("bearer")
export class PlatformAdminSupportController {
  constructor(
    private impersonationService: PlatformAdminImpersonationService,
  ) {}

  @Post(":id/impersonate")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: "Impersonar usuário (Login As)",
    description:
      "Gera access token como se fosse o usuário. Token expira em 5 minutos.",
  })
  async impersonate(
    @Param("id") userId: string,
    @CurrentUser() admin: JwtPayload,
    @Request() request: any,
  ) {
    return this.impersonationService.impersonate(
      userId,
      admin.userId,
      request.ip,
    );
  }

  @Post(":id/revoke-sessions")
  @ApiOperation({ summary: "Revogar todas as sessões do usuário" })
  async revokeSessions(
    @Param("id") userId: string,
    @CurrentUser() admin: JwtPayload,
    @Request() request: any,
  ) {
    return this.impersonationService.revokeAllSessions(
      userId,
      admin.userId,
      request.ip,
    );
  }
}
