import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { CurrentSession, CurrentUser, Roles } from "../auth/decorators";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateOrganizationDto, UpdateOrganizationDto } from "./dto";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateOrganizationDto) {
    return this.orgsService.create(user.id, dto);
  }

  @Get()
  async listUserOrgs(@CurrentUser() user: any) {
    return this.orgsService.findByUser(user.id);
  }

  @Get(":id")
  async getOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.orgsService.findOne(id, user.id);
  }

  @Post(":id/set-active")
  async setActive(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @CurrentSession() session: any
  ) {
    return this.orgsService.setActive(session.id, id, user.id);
  }

  @Put(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  async update(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateOrganizationDto
  ) {
    return this.orgsService.update(id, user.id, dto);
  }
}
