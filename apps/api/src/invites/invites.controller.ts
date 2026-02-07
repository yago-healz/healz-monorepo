import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { InvitesService } from "./invites.service";
import { SendInviteDto } from "./dto/send-invite.dto";
import { AcceptInviteDto } from "./dto/accept-invite.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { IsOrgAdminGuard } from "./guards/is-org-admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@Controller("invites")
export class InvitesController {
  constructor(private invitesService: InvitesService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, IsOrgAdminGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 req/min
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
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 req/min
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
