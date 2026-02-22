import { ApiProperty } from "@nestjs/swagger";

export class MemberDataDto {
  @ApiProperty({ description: "ID do usuário", example: "550e8400-e29b-41d4-a716-446655440000" })
  userId: string;

  @ApiProperty({ description: "ID da clínica", example: "550e8400-e29b-41d4-a716-446655440000" })
  clinicId: string;

  @ApiProperty({ description: "Role do usuário na clínica", enum: ["admin", "manager", "doctor", "receptionist", "viewer"], example: "receptionist" })
  role: string;
}

export class MemberResponseDto {
  @ApiProperty({ description: "Mensagem de sucesso", example: "Usuário adicionado à clínica com sucesso" })
  message: string;

  @ApiProperty({ description: "Dados do membro adicionado", type: MemberDataDto })
  member: MemberDataDto;
}
