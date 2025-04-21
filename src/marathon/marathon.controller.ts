import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { MarathonService } from './marathon.service';
import { CreateMarathonDto } from './dto/create-marathon.dto';
import { UpdateMarathonDto } from './dto/update-marathon.dto';
import { UserRole } from '@/users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '@/auth/guards/admin.guard';

@Controller('marathons')
@UseGuards(AuthGuard('jwt'))
export class MarathonController {
  constructor(private readonly marathonService: MarathonService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() createMarathonDto: CreateMarathonDto) {
    return this.marathonService.create(createMarathonDto);
  }

  @Get()
  findAll() {
    return this.marathonService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.marathonService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() updateMarathonDto: UpdateMarathonDto) {
    return this.marathonService.update(id, updateMarathonDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.marathonService.remove(id);
  }

  @Post(':id/join')
  joinMarathon(@Param('id') id: string, @Body('userId') userId: string) {
    return this.marathonService.joinMarathon(id, userId);
  }

  @Get(':id/participants')
  getMarathonParticipants(@Param('id') id: string) {
    return this.marathonService.getMarathonParticipants(id);
  }
} 