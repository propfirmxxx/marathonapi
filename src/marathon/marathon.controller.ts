import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { MarathonService } from './marathon.service';
import { CreateMarathonDto } from './dto/create-marathon.dto';
import { UpdateMarathonDto } from './dto/update-marathon.dto';
import { UserRole } from '@/users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '@/auth/guards/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Marathons')
@ApiBearerAuth()
@Controller('marathons')
@UseGuards(AuthGuard('jwt'))
export class MarathonController {
  constructor(private readonly marathonService: MarathonService) {}

  @ApiOperation({ summary: 'Create a new marathon' })
  @ApiResponse({ 
    status: 201, 
    description: 'Marathon created successfully',
    schema: {
      example: {
        id: '1',
        name: 'Summer Trading Challenge',
        description: 'A 30-day trading challenge with cash prizes',
        entryFee: 100,
        awardsAmount: 10000,
        maxPlayers: 100,
        startDate: '2024-06-01T00:00:00Z',
        endDate: '2024-06-30T23:59:59Z',
        rules: {
          minTrades: 10,
          maxDrawdown: 20,
          minProfit: 5
        },
        isActive: true,
        createdAt: '2024-04-22T12:00:00Z',
        updatedAt: '2024-04-22T12:00:00Z'
      }
    }
  })
  @ApiBody({ type: CreateMarathonDto })
  @Post()
  @UseGuards(AdminGuard)
  create(@Body() createMarathonDto: CreateMarathonDto) {
    return this.marathonService.create(createMarathonDto);
  }

  @ApiOperation({ summary: 'Get all marathons' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all marathons',
    schema: {
      example: [{
        id: '1',
        name: 'Summer Trading Challenge',
        description: 'A 30-day trading challenge with cash prizes',
        entryFee: 100,
        awardsAmount: 10000,
        maxPlayers: 100,
        startDate: '2024-06-01T00:00:00Z',
        endDate: '2024-06-30T23:59:59Z',
        rules: {
          minTrades: 10,
          maxDrawdown: 20,
          minProfit: 5
        },
        isActive: true,
        createdAt: '2024-04-22T12:00:00Z',
        updatedAt: '2024-04-22T12:00:00Z'
      }]
    }
  })
  @Get()
  findAll() {
    return this.marathonService.findAll();
  }

  @ApiOperation({ summary: 'Get marathon by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the marathon',
    schema: {
      example: {
        id: '1',
        name: 'Summer Trading Challenge',
        description: 'A 30-day trading challenge with cash prizes',
        entryFee: 100,
        awardsAmount: 10000,
        maxPlayers: 100,
        startDate: '2024-06-01T00:00:00Z',
        endDate: '2024-06-30T23:59:59Z',
        rules: {
          minTrades: 10,
          maxDrawdown: 20,
          minProfit: 5
        },
        isActive: true,
        createdAt: '2024-04-22T12:00:00Z',
        updatedAt: '2024-04-22T12:00:00Z'
      }
    }
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.marathonService.findOne(id);
  }

  @ApiOperation({ summary: 'Update marathon' })
  @ApiResponse({ 
    status: 200, 
    description: 'Marathon updated successfully',
    schema: {
      example: {
        id: '1',
        name: 'Summer Trading Challenge 2024',
        description: 'A 30-day trading challenge with cash prizes',
        entryFee: 150,
        awardsAmount: 15000,
        maxPlayers: 150,
        startDate: '2024-06-01T00:00:00Z',
        endDate: '2024-06-30T23:59:59Z',
        rules: {
          minTrades: 15,
          maxDrawdown: 25,
          minProfit: 7
        },
        isActive: true,
        createdAt: '2024-04-22T12:00:00Z',
        updatedAt: '2024-04-22T12:30:00Z'
      }
    }
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @ApiBody({ type: UpdateMarathonDto })
  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() updateMarathonDto: UpdateMarathonDto) {
    return this.marathonService.update(id, updateMarathonDto);
  }

  @ApiOperation({ summary: 'Delete marathon' })
  @ApiResponse({ 
    status: 200, 
    description: 'Marathon deleted successfully',
    schema: {
      example: {
        message: 'Marathon deleted successfully'
      }
    }
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.marathonService.remove(id);
  }

  @ApiOperation({ summary: 'Join a marathon' })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully joined the marathon',
    schema: {
      example: {
        id: '1',
        marathonId: '1',
        userId: '1',
        joinedAt: '2024-04-22T13:00:00Z',
        status: 'active',
        currentBalance: 10000,
        profit: 0,
        trades: 0
      }
    }
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' }
      },
      required: ['userId']
    }
  })
  @Post(':id/join')
  joinMarathon(@Param('id') id: string, @Body('userId') userId: string) {
    return this.marathonService.joinMarathon(id, userId);
  }

  @ApiOperation({ summary: 'Get marathon participants' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all participants of the marathon',
    schema: {
      example: [{
        id: '1',
        marathonId: '1',
        userId: '1',
        joinedAt: '2024-04-22T13:00:00Z',
        status: 'active',
        currentBalance: 10000,
        profit: 500,
        trades: 15,
        user: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com'
        }
      }]
    }
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Get(':id/participants')
  getMarathonParticipants(@Param('id') id: string) {
    return this.marathonService.getMarathonParticipants(id);
  }
} 