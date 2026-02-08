// test/dtos/simulate-message.dto.ts

import {
  IsString,
  IsOptional,
  IsEnum,
  Matches,
  MinLength,
} from "class-validator";

export class SimulateMessageDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  from: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsEnum(["text", "image", "document"])
  type?: "text" | "image" | "document";

  @IsOptional()
  metadata?: Record<string, any>;
}

export class SendTestMessageDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  to: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsEnum(["text", "image", "document"])
  type?: "text" | "image" | "document";
}
