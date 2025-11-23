import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UserResponseDto, UserListResponseDto, DeleteUserResponseDto } from './dto/user-response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all users',
    type: UserListResponseDto
  })
  @Get()
  @UseGuards(AdminGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the user',
    type: UserResponseDto
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User updated successfully',
    type: UserResponseDto
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserDto })
  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User deleted successfully',
    type: DeleteUserResponseDto
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @ApiOperation({ summary: 'Ban user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User banned successfully',
    type: UserResponseDto
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: BanUserDto, required: false })
  @Post(':id/ban')
  @UseGuards(AdminGuard)
  banUser(@Param('id') id: string, @Body() banUserDto?: BanUserDto) {
    return this.usersService.banUser(id, banUserDto?.banReason, banUserDto?.bannedUntil);
  }

  @ApiOperation({ summary: 'Unban user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User unbanned successfully',
    type: UserResponseDto
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @Post(':id/unban')
  @UseGuards(AdminGuard)
  unbanUser(@Param('id') id: string) {
    return this.usersService.unbanUser(id);
  }
} 