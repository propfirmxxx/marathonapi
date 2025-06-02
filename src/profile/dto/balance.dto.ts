import { ApiProperty } from '@nestjs/swagger';

export class BalanceResponseDto {
  @ApiProperty({
    description: 'Current balance after operation',
    example: 1000.50
  })
  balance: number;
} 