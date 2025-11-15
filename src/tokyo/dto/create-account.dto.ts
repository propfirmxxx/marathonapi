import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsNotEmpty } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Trading account login number',
    example: 261632689,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  login: number;

  @ApiProperty({
    description: 'Trading account password',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Trading server name (e.g., "MetaQuotes-Demo")',
    example: 'MetaQuotes-Demo',
  })
  @IsString()
  @IsNotEmpty()
  server: string;
}

