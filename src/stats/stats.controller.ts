import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { StatsService } from './stats.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { GetWithdrawalStatsDto, GroupByPeriod } from './dto/get-withdrawal-stats.dto';
import { WithdrawalStatsResponseDto } from './dto/withdrawal-stats-response.dto';
import { MarathonStatsResponseDto } from './dto/marathon-stats-response.dto';

@ApiTags('Stats')
@ApiBearerAuth()
@Controller('stats')
@UseGuards(AuthGuard('jwt'))
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns statistics',
    schema: {
      type: 'object',
    }
  })
  async getStats() {
    const data = await this.statsService.getStats();
    return {
      data,
    };
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Get withdrawal statistics for the current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns withdrawal statistics with chart data',
    type: WithdrawalStatsResponseDto,
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2024-12-31' })
  @ApiQuery({ name: 'groupBy', required: false, enum: GroupByPeriod, example: GroupByPeriod.MONTH })
  async getWithdrawalStats(
    @GetUser('id') userId: string,
    @Query() query: GetWithdrawalStatsDto,
  ): Promise<WithdrawalStatsResponseDto> {
    const data = await this.statsService.getWithdrawalStats(
      userId,
      query.startDate,
      query.endDate,
      query.groupBy,
    );
    return data;
  }

  @Get('marathons')
  @ApiOperation({ summary: 'Get marathon statistics for the current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns marathon statistics with chart data',
    type: MarathonStatsResponseDto,
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2024-12-31' })
  @ApiQuery({ name: 'groupBy', required: false, enum: GroupByPeriod, example: GroupByPeriod.MONTH })
  async getMarathonStats(
    @GetUser('id') userId: string,
    @Query() query: GetWithdrawalStatsDto,
  ): Promise<MarathonStatsResponseDto> {
    const data = await this.statsService.getMarathonStats(
      userId,
      query.startDate,
      query.endDate,
      query.groupBy,
    );
    return data;
  }
}

