import { IsString, IsNumber, IsDate, IsBoolean, IsObject, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMarathonDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  entryFee: number;

  @IsNumber()
  @Min(0)
  awardsAmount: number;

  @IsNumber()
  @Min(1)
  maxPlayers: number;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsObject()
  rules: Record<string, any>;
} 