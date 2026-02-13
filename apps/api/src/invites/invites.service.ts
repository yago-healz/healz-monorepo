import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { AuditService } from "../audit/audit.service";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { db } from "../db";
import {
  clinics,
  invites,
  organizations,
  refreshTokens,
  userClinicRoles,
  users,
} from "../db/schema";
import { MailService } from "../mail/mail.service";
import { AcceptInviteDto } from "./dto/accept-invite.dto";
import { InviteResponseDto } from "./dto/invite-response.dto";
import { SendInviteDto } from "./dto/send-invite.dto";

@Injectable()
export class InvitesService {
  constructor(
    private jwtService: JwtService,
    private mailService: MailService,
    private auditService: AuditService,
  ) {}

  async sendInvite(
    adminUserId: string,
    organizationId: string,
    dto: SendInviteDto,
    ip?: string,
  ): Promise<InviteResponseDto> {
    // 1. Validar se email já existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new BadRequestException("Email já cadastrado");
    }

    // 2. Validar se clinic pertence à mesma org do admin
    const clinic = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, dto.clinicId))
      .limit(1);

    if (clinic.length === 0) {
      throw new BadRequestException("Clínica não encontrada");
    }

    if (clinic[0].organizationId !== organizationId) {
      throw new BadRequestException("Clínica não pertence à sua organização");
    }

    // 3. Buscar organização para incluir nome no email
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    // 4. Buscar dados do admin para incluir nome no email
    const admin = await db
      .select()
      .from(users)
      .where(eq(users.id, adminUserId))
      .limit(1);

    // 5. Gerar token aleatório
    const token = randomBytes(32).toString("hex");

    // 6. Criar registro em invites table
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    const [invite] = await db
      .insert(invites)
      .values({
        email: dto.email,
        name: dto.name,
        token,
        clinicId: dto.clinicId,
        organizationId,
        role: dto.role as any,
        invitedBy: adminUserId,
        expiresAt,
      })
      .returning();

    // 7. Enviar email com link (fire-and-forget)
    this.mailService
      .sendInviteEmail(dto.email, token, admin[0].name, org[0].name, dto.role)
      .catch((err) => console.error("Failed to send invite email:", err));

    // 8. Log de auditoria
    this.auditService.log({
      userId: adminUserId,
      organizationId,
      clinicId: dto.clinicId,
      action: "CREATE",
      resource: "/api/invites",
      method: "POST",
      statusCode: 201,
      ip,
      metadata: {
        invitedEmail: dto.email,
        invitedName: dto.name,
        role: dto.role,
      },
    });

    return {
      message: "Convite enviado com sucesso",
      invite: {
        id: invite.id,
        email: invite.email,
        clinicId: invite.clinicId,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
    };
  }

  async acceptInvite(
    dto: AcceptInviteDto,
    ip?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: any;
  }> {
    // 1. Buscar invite por token
    const invite = await db
      .select()
      .from(invites)
      .where(eq(invites.token, dto.token))
      .limit(1);

    if (invite.length === 0) {
      throw new UnauthorizedException("Convite inválido");
    }

    // 2. Validar se não expirou
    if (new Date() > invite[0].expiresAt) {
      throw new UnauthorizedException("Convite expirado");
    }

    // 3. Validar se não foi usado
    if (invite[0].usedAt !== null) {
      throw new UnauthorizedException("Convite já foi utilizado");
    }

    // 4. Hash da senha
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 5. Criar user e userClinicRole em transação
    let createdUser: any;
    let clinic: any;

    try {
      await db.transaction(async (tx) => {
        // Criar user
        const userResult = await tx
          .insert(users)
          .values({
            email: invite[0].email,
            name: invite[0].name,
            passwordHash,
            emailVerified: false,
          })
          .returning();

        createdUser = (userResult as any[])[0];

        // Criar userClinicRole
        await tx.insert(userClinicRoles).values({
          userId: createdUser.id,
          clinicId: invite[0].clinicId,
          role: invite[0].role,
        });

        // Marcar invite como usado
        await tx
          .update(invites)
          .set({ usedAt: new Date() })
          .where(eq(invites.id, invite[0].id));

        // Buscar clinic para contexto
        const clinicResult = await tx
          .select()
          .from(clinics)
          .where(eq(clinics.id, invite[0].clinicId));

        clinic = (clinicResult as any[])[0];
      });
    } catch (error) {
      console.error("Accept invite transaction failed:", error);
      throw new InternalServerErrorException("Erro ao aceitar convite");
    }

    // 6. Gerar emailVerificationToken e enviar email (fire-and-forget)
    const emailToken = randomBytes(32).toString("hex");
    const emailExpiry = new Date();
    emailExpiry.setHours(emailExpiry.getHours() + 24);

    await db
      .update(users)
      .set({
        emailVerificationToken: emailToken,
        emailVerificationExpiry: emailExpiry,
      })
      .where(eq(users.id, createdUser.id));

    this.mailService
      .sendVerificationEmail(createdUser.email, emailToken)
      .catch((err) => console.error("Failed to send verification email:", err));

    // 7. Gerar accessToken e refreshToken para auto-login
    const payload: JwtPayload = {
      userId: createdUser.id,
      email: createdUser.email,
      organizationId: clinic.organizationId,
      activeClinicId: clinic.id,
      clinicAccess: [
        {
          clinicId: clinic.id,
          clinicName: clinic.name,
          role: invite[0].role,
        },
      ],
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: "15m" });
    const { token: refreshToken } = await this.generateRefreshToken(
      createdUser.id,
    );

    // 8. Log de auditoria
    this.auditService.log({
      userId: createdUser.id,
      organizationId: clinic.organizationId,
      clinicId: clinic.id,
      action: "CREATE",
      resource: "/api/invites/accept",
      method: "POST",
      statusCode: 200,
      ip,
      metadata: {
        inviteId: invite[0].id,
        userEmail: createdUser.email,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        emailVerified: false,
        activeClinic: {
          id: clinic.id,
          name: clinic.name,
          organizationId: clinic.organizationId,
          role: invite[0].role,
        },
        availableClinics: [
          {
            clinicId: clinic.id,
            clinicName: clinic.name,
            role: invite[0].role,
          },
        ],
      },
    };
  }

  async createInviteForUser(
    adminUserId: string,
    organizationId: string,
    dto: SendInviteDto,
    ip?: string,
  ): Promise<void> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.id, adminUserId))
      .limit(1);

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(invites).values({
      email: dto.email,
      name: dto.name,
      token,
      clinicId: dto.clinicId,
      organizationId,
      role: dto.role as any,
      invitedBy: adminUserId,
      expiresAt,
    });

    this.mailService
      .sendInviteEmail(dto.email, token, admin.name, org.name, dto.role)
      .catch((err) => console.error("Failed to send invite email:", err));

    this.auditService.log({
      userId: adminUserId,
      organizationId,
      clinicId: dto.clinicId,
      action: "CREATE",
      resource: "/api/platform-admin/users/invite",
      method: "POST",
      statusCode: 201,
      ip,
      metadata: { invitedEmail: dto.email, invitedName: dto.name, role: dto.role },
    });
  }

  private async generateRefreshToken(
    userId: string,
  ): Promise<{ token: string }> {
    const token = randomBytes(64).toString("hex");
    const family = randomBytes(16).toString("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(refreshTokens).values({
      userId,
      token,
      family,
      expiresAt,
    });

    return { token };
  }
}
