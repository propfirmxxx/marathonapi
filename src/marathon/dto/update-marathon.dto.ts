import { IsString, IsNumber, IsDate, IsBoolean, IsObject, Min, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMarathonDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  entryFee?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  awardsAmount?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxPlayers?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsObject()
  @IsOptional()
  rules?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 