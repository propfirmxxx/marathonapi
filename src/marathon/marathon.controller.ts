import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { MarathonService } from './marathon.service';
import { CreateMarathonDto } from './dto/create-marathon.dto';
import { UpdateMarathonDto } from './dto/update-marathon.dto';
import { UserRole } from '@/users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '@/auth/guards/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { 
  MarathonResponseDto, 
  MarathonListResponseDto, 
  MarathonParticipantResponseDto, 
  MarathonParticipantListResponseDto 
} from './dto/marathon-response.dto';

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
    type: MarathonResponseDto
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
    type: MarathonListResponseDto
  })
  @Get()
  findAll() {
    return this.marathonService.findAll();
  }

  @ApiOperation({ summary: 'Get marathon by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the marathon',
    type: MarathonResponseDto
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
    type: MarathonResponseDto
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
    type: MarathonParticipantResponseDto
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
    type: MarathonParticipantListResponseDto
  })
  @ApiParam({ name: 'id', description: 'Marathon ID' })
  @Get(':id/participants')
  getMarathonParticipants(@Param('id') id: string) {
    return this.marathonService.getMarathonParticipants(id);
  }
} 