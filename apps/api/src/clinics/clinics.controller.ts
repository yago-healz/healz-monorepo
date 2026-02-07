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
import { ClinicsService } from "./clinics.service";
import { AddMemberDto } from "./dto/add-member.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { IsClinicAdminGuard } from "./guards/is-clinic-admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@Controller("clinics")
export class ClinicsController {
  constructor(private clinicsService: ClinicsService) {}

  @Post(":clinicId/members")
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, IsClinicAdminGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 req/min
  async addMember(
    @Param("clinicId") clinicId: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    return this.clinicsService.addMember(
      clinicId,
      user.userId,
      dto,
      request.ip,
    );
  }
}
