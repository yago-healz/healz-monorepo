import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class MailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get("RESEND_API_KEY"));
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const frontendUrl =
      this.configService.get("FRONTEND_URL") || "http://localhost:3000";
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.resend.emails.send({
      from: "Healz <onboarding@resend.dev>",
      to,
      subject: "Verifique seu email - Healz",
      html: `
        <h2>Verificação de Email</h2>
        <p>Clique no link abaixo para verificar seu email:</p>
        <a href="${verificationUrl}">Verificar Email</a>
        <p>Este link expira em 24 horas.</p>
        <p>Se você não criou uma conta, ignore este email.</p>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const frontendUrl =
      this.configService.get("FRONTEND_URL") || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.resend.emails.send({
      from: "Healz <onboarding@resend.dev>",
      to,
      subject: "Recuperação de senha - Healz",
      html: `
        <h2>Recuperação de Senha</h2>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <a href="${resetUrl}">Redefinir Senha</a>
        <p>Este link expira em 1 hora.</p>
        <p>Se você não solicitou a recuperação, ignore este email.</p>
      `,
    });
  }

  async sendInviteEmail(
    to: string,
    token: string,
    inviterName: string,
    organizationName: string,
    role: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get("FRONTEND_URL") || "http://localhost:3000";
    const inviteUrl = `${frontendUrl}/accept-invite?token=${token}`;

    const roleTranslation: Record<string, string> = {
      admin: "Administrador",
      doctor: "Médico",
      secretary: "Secretário",
    };

    await this.resend.emails.send({
      from: "Healz <onboarding@resend.dev>",
      to,
      subject: `Você foi convidado para ${organizationName}`,
      html: `
        <h2>Convite para ${organizationName}</h2>
        <p>Você foi convidado por ${inviterName} para fazer parte de ${organizationName} como <strong>${roleTranslation[role] || role}</strong>.</p>
        <p>Clique no link abaixo para aceitar o convite e criar sua conta:</p>
        <a href="${inviteUrl}">Aceitar Convite</a>
        <p>Este convite expira em 7 dias.</p>
        <p>Se você não esperava este convite, pode ignorar este email.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">Healz - Sistema de Gestão de Clínicas</p>
      `,
    });
  }
}
