import { ApiProperty } from "@nestjs/swagger";

export class InviteDataDto {
  @ApiProperty({ description: "ID do convite", example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ description: "Email do usuário convidado", example: "medico@example.com" })
  email: string;

  @ApiProperty({ description: "ID da clínica", example: "550e8400-e29b-41d4-a716-446655440000" })
  clinicId: string;

  @ApiProperty({ description: "Role atribuída", enum: ["admin", "doctor", "secretary"], example: "doctor" })
  role: string;

  @ApiProperty({ description: "Data de expiração do convite", example: "2026-02-14T10:00:00Z" })
  expiresAt: Date;
}

export class InviteResponseDto {
  @ApiProperty({ description: "Mensagem de sucesso", example: "Convite enviado com sucesso" })
  message: string;

  @ApiProperty({ description: "Dados do convite criado", type: InviteDataDto })
  invite: InviteDataDto;
}
