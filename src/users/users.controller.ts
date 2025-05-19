import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
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

  @ApiOperation({ summary: 'Get user by UID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the user',
    type: UserResponseDto
  })
  @ApiParam({ name: 'uid', description: 'User UID' })
  @Get(':uid')
  findOne(@Param('uid') uid: string) {
    return this.usersService.findOne(uid);
  }

  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User updated successfully',
    type: UserResponseDto
  })
  @ApiParam({ name: 'uid', description: 'User UID' })
  @ApiBody({ type: UpdateUserDto })
  @Patch(':uid')
  @UseGuards(AdminGuard)
  update(@Param('uid') uid: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(uid, updateUserDto);
  }

  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User deleted successfully',
    type: DeleteUserResponseDto
  })
  @ApiParam({ name: 'uid', description: 'User UID' })
  @Delete(':uid')
  @UseGuards(AdminGuard)
  remove(@Param('uid') uid: string) {
    return this.usersService.remove(uid);
  }
} 