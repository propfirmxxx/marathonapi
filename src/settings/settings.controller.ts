import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Query,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SettingsService } from './settings.service';
import { SessionService } from './session.service';
import { LoginHistoryService } from './login-history.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsResponseDto } from './dto/settings-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { LoginHistoryResponseDto } from './dto/login-history-response.dto';
import { GetSessionsQueryDto } from './dto/get-sessions-query.dto';
import { GetLoginHistoryQueryDto } from './dto/get-login-history-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly sessionService: SessionService,
    private readonly loginHistoryService: LoginHistoryService,
  ) {}

  @ApiOperation({ summary: 'Get user settings' })
  @ApiResponse({
    status: 200,
    description: 'Returns user settings',
    type: SettingsResponseDto,
  })
  @Get()
  async getSettings(@GetUser('id') userId: string): Promise<SettingsResponseDto> {
    return await this.settingsService.getSettings(userId);
  }

  @ApiOperation({ summary: 'Update user settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
    type: SettingsResponseDto,
  })
  @Patch()
  async updateSettings(
    @GetUser('id') userId: string,
    @Body() updateDto: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    return await this.settingsService.updateSettings(userId, updateDto);
  }

  @ApiOperation({ summary: 'Get user active sessions' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of user sessions',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @Get('sessions')
  async getSessions(
    @GetUser('id') userId: string,
    @Query() query: GetSessionsQueryDto,
    @Req() req: any,
  ): Promise<PaginatedResponseDto<SessionResponseDto>> {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const currentToken = authHeader?.replace('Bearer ', '');

    return await this.sessionService.getUserSessions(userId, query, currentToken);
  }

  @ApiOperation({ summary: 'Revoke all other sessions (except current)' })
  @ApiResponse({
    status: 200,
    description: 'All other sessions revoked successfully',
  })
  @Delete('sessions/others')
  async revokeAllOtherSessions(
    @GetUser('id') userId: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    const authHeader = req.headers.authorization;
    const currentToken = authHeader?.replace('Bearer ', '');

    if (currentToken) {
      await this.sessionService.revokeAllOtherSessions(userId, currentToken);
    } else {
      await this.sessionService.revokeAllSessions(userId);
    }

    return { message: 'All other sessions revoked successfully' };
  }

  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
  })
  @ApiParam({ name: 'sessionId', type: String })
  @Delete('sessions/:sessionId')
  async revokeSession(
    @GetUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<{ message: string }> {
    await this.sessionService.revokeSession(userId, sessionId);
    return { message: 'Session revoked successfully' };
  }

  @ApiOperation({ summary: 'Get login history' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated login history',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['success', 'failed'],
  })
  @ApiQuery({
    name: 'method',
    required: false,
    enum: ['email', 'google'],
  })
  @Get('login-history')
  async getLoginHistory(
    @GetUser('id') userId: string,
    @Query() query: GetLoginHistoryQueryDto,
  ): Promise<PaginatedResponseDto<LoginHistoryResponseDto>> {
    return await this.loginHistoryService.getUserLoginHistory(userId, query);
  }
}

