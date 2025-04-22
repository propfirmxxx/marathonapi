import { IsString, IsNumber, IsDate, IsBoolean, IsObject, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMarathonDto {
  @ApiProperty({ description: 'Marathon name', example: 'Summer Trading Challenge' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Marathon description', example: 'A 30-day trading challenge with cash prizes' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Entry fee in USD', example: 100, minimum: 0 })
  @IsNumber()
  @Min(0)
  entryFee: number;

  @ApiProperty({ description: 'Total awards amount in USD', example: 10000, minimum: 0 })
  @IsNumber()
  @Min(0)
  awardsAmount: number;

  @ApiProperty({ description: 'Maximum number of participants', example: 100, minimum: 1 })
  @IsNumber()
  @Min(1)
  maxPlayers: number;

  @ApiProperty({ description: 'Marathon start date', example: '2024-06-01T00:00:00Z' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: 'Marathon end date', example: '2024-06-30T23:59:59Z' })
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiProperty({ 
    description: 'Marathon rules and conditions',
    example: {
      minTrades: 10,
      maxDrawdown: 20,
      minProfit: 5
    }
  })
  @IsObject()
  rules: Record<string, any>;
} 