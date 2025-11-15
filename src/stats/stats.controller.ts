import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Stats')
@ApiBearerAuth()
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
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
}

