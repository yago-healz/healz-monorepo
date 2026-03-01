import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

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
}

export class ChatResponseDto {
  @ApiProperty()
  reply: string

  @ApiProperty()
  sessionId: string

  @ApiPropertyOptional({ type: [String], description: 'Tools called during processing' })
  toolsUsed?: string[]
}
