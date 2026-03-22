import { IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ChannelContextDto {
  @ApiPropertyOptional({ enum: ['whatsapp', 'web', 'playground'] })
  @IsString()
  @IsIn(['whatsapp', 'web', 'playground'])
  @IsOptional()
  channel?: 'whatsapp' | 'web' | 'playground'

  @ApiPropertyOptional({ description: 'Phone number from WhatsApp (E.164 format)' })
  @IsString()
  @IsOptional()
  phone?: string

  @ApiPropertyOptional({ description: 'WhatsApp Business API contact ID' })
  @IsString()
  @IsOptional()
  whatsappId?: string
}

export class ChatRequestDto {
  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  message: string

  @ApiProperty({ enum: ['draft', 'published'] })
  @IsString()
  @IsIn(['draft', 'published'])
  version: 'draft' | 'published'

  @ApiPropertyOptional({ description: 'Session ID for context continuity' })
  @IsString()
  @IsOptional()
  sessionId?: string

  @ApiPropertyOptional({ description: 'Channel context (WhatsApp, web, playground)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelContextDto)
  channelContext?: ChannelContextDto
}

export class ChatResponseDto {
  @ApiProperty()
  reply: string

  @ApiProperty()
  sessionId: string

  @ApiPropertyOptional({ type: [String], description: 'Tools called during processing' })
  toolsUsed?: string[]
}
