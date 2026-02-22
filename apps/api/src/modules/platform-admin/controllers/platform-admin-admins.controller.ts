import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JwtPayload } from "../../../common/interfaces/jwt-payload.interface";
import { PlatformAdminGuard } from "../guards/platform-admin.guard";
import { PlatformAdminAdminsService } from "../services/platform-admin-admins.service";
import { CreatePlatformAdminDto } from "../dto/admins/create-platform-admin.dto";

@ApiTags("Platform Admin - Admins")
@Controller("platform-admin/admins")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@ApiBearerAuth("bearer")
export class PlatformAdminAdminsController {
  constructor(private adminsService: PlatformAdminAdminsService) {}

  @Get()
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  @ApiOperation({ summary: "Listar platform admins" })
  async list(@CurrentUser() user: JwtPayload) {
    return this.adminsService.list(user.userId);
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: "Criar novo platform admin" })
  async create(
    @Body() dto: CreatePlatformAdminDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.adminsService.create(dto.userId, user.userId, request.ip);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Revogar permissões de platform admin" })
  async revoke(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.adminsService.revoke(id, user.userId, request.ip);
  }
}
