import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from "@nestjs/swagger";
import { CurrentSession, CurrentUser, Roles } from "../auth/decorators";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateOrganizationDto, UpdateOrganizationDto } from "./dto";
import { OrganizationsService } from "./organizations.service";

@ApiTags("Organizations")
@ApiBearerAuth("bearer")
@ApiUnauthorizedResponse({
  description: "Unauthorized - Invalid or missing authentication token",
})
@Controller("organizations")
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({
    summary: "Create a new organization",
    description:
      "Creates a new organization and automatically assigns the creator as an admin member",
  })
  @ApiResponse({
    status: 201,
    description: "Organization created successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        slug: { type: "string" },
        logo: { type: "string", nullable: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiBadRequestResponse({
    description: "Invalid input data or slug already exists",
  })
  async create(@CurrentUser() user: any, @Body() dto: CreateOrganizationDto) {
    return this.orgsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List user's organizations",
    description:
      "Returns all organizations where the current user is a member",
  })
  @ApiResponse({
    status: 200,
    description: "List of organizations retrieved successfully",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          slug: { type: "string" },
          logo: { type: "string", nullable: true },
          role: {
            type: "string",
            enum: ["admin", "manager", "doctor", "receptionist"],
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  })
  async listUserOrgs(@CurrentUser() user: any) {
    return this.orgsService.findByUser(user.id);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get organization by ID",
    description:
      "Returns detailed information about a specific organization. User must be a member of the organization.",
  })
  @ApiParam({
    name: "id",
    description: "Organization ID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "Organization details retrieved successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        slug: { type: "string" },
        logo: { type: "string", nullable: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiNotFoundResponse({
    description: "Organization not found or user is not a member",
  })
  async getOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.orgsService.findOne(id, user.id);
  }

  @Post(":id/set-active")
  @ApiOperation({
    summary: "Set active organization",
    description:
      "Sets the specified organization as the active context for the current session",
  })
  @ApiParam({
    name: "id",
    description: "Organization ID to set as active",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "Organization set as active successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        organizationId: { type: "string", format: "uuid" },
      },
    },
  })
  @ApiNotFoundResponse({
    description: "Organization not found or user is not a member",
  })
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
  @ApiOperation({
    summary: "Update organization",
    description:
      "Updates organization details. Requires admin role in the organization.",
  })
  @ApiParam({
    name: "id",
    description: "Organization ID to update",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "Organization updated successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        slug: { type: "string" },
        logo: { type: "string", nullable: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiForbiddenResponse({
    description: "Forbidden - User does not have admin role",
  })
  @ApiNotFoundResponse({ description: "Organization not found" })
  @ApiBadRequestResponse({ description: "Invalid input data" })
  async update(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateOrganizationDto
  ) {
    return this.orgsService.update(id, user.id, dto);
  }
}
