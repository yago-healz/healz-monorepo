import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { OrganizationsService } from "./organizations.service";
import { CreateClinicDto } from "./dto/create-clinic.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@Controller("organizations")
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Post(":organizationId/clinics")
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 req/min
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
