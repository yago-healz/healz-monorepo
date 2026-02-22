import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JwtPayload } from "../../../common/interfaces/jwt-payload.interface";
import { PlatformAdminGuard } from "../guards/platform-admin.guard";
import { PlatformAdminUsersService } from "../services/platform-admin-users.service";
import { ListUsersQueryDto } from "../dto/users/list-users-query.dto";
import { CreateUserDto } from "../dto/users/create-user.dto";
import { UpdateUserDto } from "../dto/users/update-user.dto";
import { UpdateUserStatusDto } from "../dto/users/update-user-status.dto";
import { AddUserClinicDto } from "../dto/users/add-user-clinic.dto";
import { UpdateUserClinicDto } from "../dto/users/update-user-clinic.dto";
import { AdminResetPasswordDto } from "../dto/users/reset-password.dto";

@ApiTags("Platform Admin - Users")
@Controller("platform-admin/users")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@ApiBearerAuth("bearer")
export class PlatformAdminUsersController {
  constructor(private usersService: PlatformAdminUsersService) {}

  @Get()
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  @ApiOperation({ summary: "Listar usuários" })
  async list(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.list(query, user.userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Ver detalhes do usuário" })
  async getById(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.getById(id, user.userId);
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: "Criar usuário" })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.usersService.create(dto, user.userId, request.ip);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Editar usuário" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.usersService.update(id, dto, user.userId, request.ip);
  }

  @Post(":id/reset-password")
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: "Resetar senha do usuário" })
  async resetPassword(
    @Param("id") id: string,
    @Body() dto: AdminResetPasswordDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.usersService.resetPassword(id, dto, user.userId, request.ip);
  }

  @Post(":id/verify-email")
  @ApiOperation({ summary: "Forçar verificação de email" })
  async verifyEmail(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.usersService.forceVerifyEmail(id, user.userId, request.ip);
  }

  @Post(":id/resend-invite")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: "Reenviar convite para usuário" })
  async resendInvite(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.usersService.resendInvite(id, user.userId, request.ip);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Ativar/Desativar usuário" })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.usersService.updateStatus(id, dto, user.userId, request.ip);
  }

  @Post(":userId/clinics")
  @ApiOperation({ summary: "Adicionar usuário a clínica" })
  async addToClinic(
    @Param("userId") userId: string,
    @Body() dto: AddUserClinicDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.usersService.addToClinic(userId, dto, user.userId, request.ip);
  }

  @Patch(":userId/clinics/:clinicId")
  @ApiOperation({ summary: "Atualizar role do usuário na clínica" })
  async updateClinicRole(
    @Param("userId") userId: string,
    @Param("clinicId") clinicId: string,
    @Body() dto: UpdateUserClinicDto,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.usersService.updateClinicRole(
      userId,
      clinicId,
      dto,
      user.userId,
      request.ip,
    );
  }

  @Delete(":userId/clinics/:clinicId")
  @ApiOperation({ summary: "Remover usuário da clínica" })
  async removeFromClinic(
    @Param("userId") userId: string,
    @Param("clinicId") clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Request() request: any,
  ) {
    return this.usersService.removeFromClinic(
      userId,
      clinicId,
      user.userId,
      request.ip,
    );
  }
}
