import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class LoginOnlyDto {
  @ApiProperty({
    description: 'Trading account login number',
    example: 261632689,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  login: number;
}

