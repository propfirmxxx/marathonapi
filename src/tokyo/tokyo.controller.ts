import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TokyoService } from './tokyo.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { LoginOnlyDto } from './dto/login-only.dto';
import {
  AccountDeploymentResponseDto,
  MessageResponseDto,
  LatestDataResponseDto,
  AccountListResponseDto,
  AccountDataResponseDto,
  PositionsResponseDto,
  OrdersResponseDto,
} from './dto/tokyo-response.dto';

@ApiTags('Tokyo Service')
@ApiBearerAuth()
@Controller('tokyo')
@UseGuards(AuthGuard('jwt'))
export class TokyoController {
  constructor(private readonly tokyoService: TokyoService) {}

  @ApiOperation({ summary: 'Service heartbeat' })
  @ApiResponse({
    status: 200,
    description: 'Successful Response',
    type: Object,
  })
  @Get()
  getRoot() {
    return this.tokyoService.getRoot();
  }

  @ApiOperation({ summary: 'Detailed health check with RabbitMQ status' })
  @ApiResponse({
    status: 200,
    description: 'Get detailed health status including RabbitMQ connection and statistics',
    type: Object,
  })
  @Get('health')
  getHealth() {
    return this.tokyoService.getHealth();
  }

  @ApiOperation({ summary: 'Retrieve the most recent payload received from the socket server' })
  @ApiResponse({
    status: 200,
    description: 'Successful Response',
    type: LatestDataResponseDto,
  })
  @Get('latest-data')
  getLatestData() {
    return this.tokyoService.getLatestData();
  }

  @ApiOperation({ summary: 'Get list of all active accounts with cached data' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all accounts that have sent data recently',
    type: AccountListResponseDto,
  })
  @Get('accounts')
  getActiveAccounts() {
    return this.tokyoService.getActiveAccounts();
  }

  @ApiOperation({ summary: 'Get complete account data for a specific login' })
  @ApiResponse({
    status: 200,
    description: 'Returns the cached account data for the specified login. This includes balance, equity, profit, margin, positions, and orders.',
    type: AccountDataResponseDto,
  })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @Get('account/:login')
  getAccountData(@Param('login') login: string) {
    return this.tokyoService.getAccountData(login);
  }

  @ApiOperation({ summary: 'Get open positions for a specific account' })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of open positions for the specified account',
    type: PositionsResponseDto,
  })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @Get('account/:login/positions')
  getAccountPositions(@Param('login') login: string) {
    return this.tokyoService.getAccountPositions(login);
  }

  @ApiOperation({ summary: 'Get pending orders for a specific account' })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of pending orders for the specified account',
    type: OrdersResponseDto,
  })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @Get('account/:login/orders')
  getAccountOrders(@Param('login') login: string) {
    return this.tokyoService.getAccountOrders(login);
  }

  @ApiOperation({ summary: 'Create a new account configuration and deploy its container' })
  @ApiResponse({
    status: 200,
    description: 'Successful Response',
    type: AccountDeploymentResponseDto,
  })
  @ApiBody({ type: CreateAccountDto })
  @Post('account')
  createAccount(@Body() createAccountDto: CreateAccountDto) {
    return this.tokyoService.createAccount(
      createAccountDto.login.toString(),
      createAccountDto.password,
      createAccountDto.server,
    );
  }

  @ApiOperation({ summary: 'Update an existing account configuration and redeploy its container' })
  @ApiResponse({
    status: 200,
    description: 'Successful Response',
    type: AccountDeploymentResponseDto,
  })
  @ApiBody({ type: CreateAccountDto })
  @Post('account/update')
  updateAccount(@Body() updateAccountDto: CreateAccountDto) {
    return this.tokyoService.updateAccount(
      updateAccountDto.login,
      updateAccountDto.password,
      updateAccountDto.server,
    );
  }

  @ApiOperation({ summary: 'Deploy an account using an existing configuration' })
  @ApiResponse({
    status: 200,
    description: 'Successful Response',
    type: AccountDeploymentResponseDto,
  })
  @ApiBody({ type: LoginOnlyDto })
  @Post('deploy')
  deployAccount(@Body() loginOnlyDto: LoginOnlyDto) {
    return this.tokyoService.deployAccount(loginOnlyDto.login.toString());
  }

  @ApiOperation({ summary: 'Stop the container associated with an account' })
  @ApiResponse({
    status: 200,
    description: 'Successful Response',
    type: MessageResponseDto,
  })
  @ApiBody({ type: LoginOnlyDto })
  @Post('undeploy')
  undeployAccount(@Body() loginOnlyDto: LoginOnlyDto) {
    return this.tokyoService.undeployAccount(loginOnlyDto.login.toString());
  }
}

