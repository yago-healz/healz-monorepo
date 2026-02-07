import { IsUUID } from "class-validator";

export class SwitchContextDto {
  @IsUUID()
  clinicId: string; // Nova clínica a ativar
}
