import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class CreatePlatformAdminDto {
  @ApiProperty({
    description: "ID do usuário para promover a platform admin",
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;
}
