import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../../infrastructure/database";
import {
  clinics,
  organizations,
  refreshTokens,
  userClinicRoles,
  users,
} from "../../infrastructure/database/schema";
import { SignupDto } from "./dto/signup.dto";
import { SignupResponseDto } from "./dto/signup-response.dto";
import { JwtPayload } from "../../common/interfaces/jwt-payload.interface";
import { MailService } from "../../infrastructure/mail/mail.service";
import { AuditService } from "../../infrastructure/audit/audit.service";

@Injectable()
export class SignupService {
  constructor(
    private jwtService: JwtService,
    private mailService: MailService,
    private auditService: AuditService,
  ) {}

  async signup(dto: SignupDto, ip?: string): Promise<SignupResponseDto & { refreshToken: string }> {
    // 1. Validar se email já existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, dto.user.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new BadRequestException("Email já cadastrado");
    }

    // 2. Validar se slug já existe
    const existingOrg = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, dto.organization.slug))
      .limit(1);

    if (existingOrg.length > 0) {
      throw new BadRequestException("Slug já está em uso");
    }

    // 3. Hash da senha
    const passwordHash = await bcrypt.hash(dto.user.password, 10);

    // 4. Criar organization, clinic, user e userClinicRole em transação
    let createdOrg: any;
    let createdClinic: any;
    let createdUser: any;

    try {
      await db.transaction(async (tx) => {
        // Criar organization
        const orgResult = await tx
          .insert(organizations)
          .values({
            name: dto.organization.name,
            slug: dto.organization.slug,
          })
          .returning();

        createdOrg = (orgResult as any[])[0];

        // Criar clinic vinculada à org
        const clinicResult = await tx
          .insert(clinics)
          .values({
            name: dto.clinic.name,
            organizationId: createdOrg.id,
          })
          .returning();

        createdClinic = (clinicResult as any[])[0];

        // Criar user
        const userResult = await tx
          .insert(users)
          .values({
            email: dto.user.email,
            name: dto.user.name,
            passwordHash,
            emailVerified: false,
          })
          .returning();

        createdUser = (userResult as any[])[0];

        // Criar userClinicRole (user como admin da clinic)
        await tx.insert(userClinicRoles).values({
          userId: createdUser.id,
          clinicId: createdClinic.id,
          role: "admin",
        });
      });
    } catch (error) {
      console.error("Signup transaction failed:", error);
      throw new InternalServerErrorException("Erro ao criar conta");
    }

    // 5. Gerar emailVerificationToken e enviar email (fire-and-forget)
    const emailToken = randomBytes(32).toString("hex");
    const emailExpiry = new Date();
    emailExpiry.setHours(emailExpiry.getHours() + 24); // 24 horas

    await db
      .update(users)
      .set({
        emailVerificationToken: emailToken,
        emailVerificationExpiry: emailExpiry,
      })
      .where(eq(users.id, createdUser.id));

    // Enviar email de verificação (não bloqueia o fluxo)
    this.mailService
      .sendVerificationEmail(createdUser.email, emailToken)
      .catch((err) =>
        console.error("Failed to send verification email:", err),
      );

    // 6. Gerar accessToken e refreshToken para auto-login
    const payload: JwtPayload = {
      userId: createdUser.id,
      email: createdUser.email,
      organizationId: createdOrg.id,
      activeClinicId: createdClinic.id,
      clinicAccess: [
        {
          clinicId: createdClinic.id,
          clinicName: createdClinic.name,
          role: "admin",
        },
      ],
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: "15m" });
    const { token: refreshToken } = await this.generateRefreshToken(
      createdUser.id,
    );

    // 7. Log de auditoria
    this.auditService.log({
      userId: createdUser.id,
      organizationId: createdOrg.id,
      clinicId: createdClinic.id,
      action: "CREATE",
      resource: "/api/signup",
      method: "POST",
      statusCode: 201,
      ip,
      metadata: {
        organizationName: createdOrg.name,
        clinicName: createdClinic.name,
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
          id: createdClinic.id,
          name: createdClinic.name,
          organizationId: createdOrg.id,
          role: "admin",
        },
        availableClinics: [
          {
            clinicId: createdClinic.id,
            clinicName: createdClinic.name,
            role: "admin",
          },
        ],
      },
      organization: {
        id: createdOrg.id,
        name: createdOrg.name,
        slug: createdOrg.slug,
      },
    };
  }

  private async generateRefreshToken(userId: string): Promise<{ token: string }> {
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
