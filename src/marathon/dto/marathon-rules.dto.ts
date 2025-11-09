import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { MarathonRule } from '../enums/marathon-rule.enum';

export class MarathonRulesDto {
  @ApiPropertyOptional({
    description: 'Minimum number of trades a participant must execute to remain eligible',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  [MarathonRule.MIN_TRADES]?: number;

  @ApiPropertyOptional({
    description: 'Maximum drawdown percentage allowed during the marathon',
    example: 20,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  [MarathonRule.MAX_DRAWDOWN_PERCENT]?: number;

  @ApiPropertyOptional({
    description: 'Minimum profit percentage required to qualify for prizes',
    example: 5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  [MarathonRule.MIN_PROFIT_PERCENT]?: number;
}

