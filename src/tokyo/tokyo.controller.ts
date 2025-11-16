import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
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
  PingResponseDto,
  HistoryRatesResponseDto,
  HistoryTicksResponseDto,
  BalanceHistoryResponseDto,
  EquityHistoryResponseDto,
  PerformanceReportResponseDto,
  StatementResponseDto,
  TradeHistoryResponseDto,
  SymbolStatisticsResponseDto,
  MinimalTradesResponseDto,
  SymbolInfoResponseDto,
  SymbolTickResponseDto,
  DebugConnectionsResponseDto,
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

  // ==================== MT5 Query Passthrough Endpoints ====================

  @ApiOperation({ summary: 'Ping the connected EA for this login and expect a pong' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: PingResponseDto })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiQuery({ name: 'timeout', required: false, type: Number, description: 'Timeout seconds', example: 5.0 })
  @Get('account/:login/ping')
  pingAccount(@Param('login') login: string, @Query('timeout') timeout?: number) {
    return this.tokyoService.pingAccount(login, timeout);
  }

  @ApiOperation({ summary: 'Fetch historical OHLCV rates via the connected MT5 terminal' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: HistoryRatesResponseDto })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiQuery({ name: 'symbol', required: true, type: String, description: 'Symbol name (e.g., XAUUSDm)' })
  @ApiQuery({ name: 'timeframe', required: true, type: Number, description: 'ENUM_TIMEFRAMES integer (e.g., 1=M1,5=M5,15=M15,60=H1)' })
  @ApiQuery({ name: 'count', required: false, type: Number, description: 'Number of bars', example: 100 })
  @ApiQuery({ name: 'from', required: false, type: Number, description: 'Epoch seconds from' })
  @ApiQuery({ name: 'to', required: false, type: Number, description: 'Epoch seconds to' })
  @ApiQuery({ name: 'timeout', required: false, type: Number, description: 'Timeout seconds', example: 10.0 })
  @Get('account/:login/history/rates')
  getHistoryRates(
    @Param('login') login: string,
    @Query('symbol') symbol: string,
    @Query('timeframe') timeframe: number,
    @Query('count') count?: number,
    @Query('from') from?: number,
    @Query('to') to?: number,
    @Query('timeout') timeout?: number,
  ) {
    return this.tokyoService.getHistoryRates(login, symbol, timeframe, count, from, to, timeout);
  }

  @ApiOperation({ summary: 'Fetch historical ticks via the connected MT5 terminal' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: HistoryTicksResponseDto })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiQuery({ name: 'symbol', required: true, type: String, description: 'Symbol name' })
  @ApiQuery({ name: 'count', required: false, type: Number, description: 'Number of ticks', example: 1000 })
  @ApiQuery({ name: 'flags', required: false, type: Number, description: 'Tick flags (MetaTrader constants bitmask)', example: 0 })
  @ApiQuery({ name: 'from', required: false, type: Number, description: 'Epoch seconds from' })
  @ApiQuery({ name: 'to', required: false, type: Number, description: 'Epoch seconds to' })
  @ApiQuery({ name: 'timeout', required: false, type: Number, description: 'Timeout seconds', example: 10.0 })
  @Get('account/:login/history/ticks')
  getHistoryTicks(
    @Param('login') login: string,
    @Query('symbol') symbol: string,
    @Query('count') count?: number,
    @Query('flags') flags?: number,
    @Query('from') from?: number,
    @Query('to') to?: number,
    @Query('timeout') timeout?: number,
  ) {
    return this.tokyoService.getHistoryTicks(login, symbol, count, flags, from, to, timeout);
  }

  @ApiOperation({ summary: 'Fetch balance-affecting history via the connected MT5 terminal' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: BalanceHistoryResponseDto })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiQuery({ name: 'from', required: false, type: Number, description: 'Epoch seconds from' })
  @ApiQuery({ name: 'to', required: false, type: Number, description: 'Epoch seconds to' })
  @ApiQuery({ name: 'timeout', required: false, type: Number, description: 'Timeout seconds', example: 10.0 })
  @Get('account/:login/history/balance')
  getBalanceHistory(
    @Param('login') login: string,
    @Query('from') from?: number,
    @Query('to') to?: number,
    @Query('timeout') timeout?: number,
  ) {
    return this.tokyoService.getBalanceHistory(login, from, to, timeout);
  }

  @ApiOperation({ summary: 'Fetch closed-equity curve via the connected MT5 terminal' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: EquityHistoryResponseDto })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiQuery({ name: 'from', required: false, type: Number, description: 'Epoch seconds from' })
  @ApiQuery({ name: 'to', required: false, type: Number, description: 'Epoch seconds to' })
  @ApiQuery({ name: 'timeout', required: false, type: Number, description: 'Timeout seconds', example: 10.0 })
  @Get('account/:login/history/equity')
  getEquityHistory(
    @Param('login') login: string,
    @Query('from') from?: number,
    @Query('to') to?: number,
    @Query('timeout') timeout?: number,
  ) {
    return this.tokyoService.getEquityHistory(login, from, to, timeout);
  }

  @ApiOperation({ summary: 'Fetch performance/report statistics via the connected MT5 terminal' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: PerformanceReportResponseDto })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiQuery({ name: 'from', required: false, type: Number, description: 'Epoch seconds from' })
  @ApiQuery({ name: 'to', required: false, type: Number, description: 'Epoch seconds to' })
  @ApiQuery({ name: 'timeout', required: false, type: Number, description: 'Timeout seconds', example: 10.0 })
  @Get('account/:login/performance')
  getPerformanceReport(
    @Param('login') login: string,
    @Query('from') from?: number,
    @Query('to') to?: number,
    @Query('timeout') timeout?: number,
  ) {
    return this.tokyoService.getPerformanceReport(login, from, to, timeout);
  }

  @ApiOperation({ summary: 'Fetch detailed account statement (orders, deals, summary) via MT5 terminal' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: StatementResponseDto })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiQuery({ name: 'from', required: false, type: Number, description: 'Epoch seconds from' })
  @ApiQuery({ name: 'to', required: false, type: Number, description: 'Epoch seconds to' })
  @ApiQuery({ name: 'timeout', required: false, type: Number, description: 'Timeout seconds', example: 10.0 })
  @Get('account/:login/statement')
  getStatement(
    @Param('login') login: string,
    @Query('from') from?: number,
    @Query('to') to?: number,
    @Query('timeout') timeout?: number,
  ) {
    return this.tokyoService.getStatement(login, from, to, timeout);
  }

  @ApiOperation({ summary: 'Fetch complete trade history (grouped by position) via the connected MT5 terminal' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: TradeHistoryResponseDto })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiQuery({ name: 'from', required: false, type: Number, description: 'Epoch seconds from' })
  @ApiQuery({ name: 'to', required: false, type: Number, description: 'Epoch seconds to' })
  @ApiQuery({ name: 'timeout', required: false, type: Number, description: 'Timeout seconds', example: 10.0 })
  @Get('account/:login/history/trades')
  getTradeHistory(
    @Param('login') login: string,
    @Query('from') from?: number,
    @Query('to') to?: number,
    @Query('timeout') timeout?: number,
  ) {
    return this.tokyoService.getTradeHistory(login, from, to, timeout);
  }

  @ApiOperation({ summary: 'Get trade statistics grouped by symbol (total trades, win/loss counts, profit/loss, etc.)' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: SymbolStatisticsResponseDto })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiQuery({ name: 'from', required: false, type: Number, description: 'Epoch seconds from' })
  @ApiQuery({ name: 'to', required: false, type: Number, description: 'Epoch seconds to' })
  @ApiQuery({ name: 'timeout', required: false, type: Number, description: 'Timeout seconds', example: 30.0 })
  @Get('account/:login/statistics/symbols')
  getSymbolStatistics(
    @Param('login') login: string,
    @Query('from') from?: number,
    @Query('to') to?: number,
    @Query('timeout') timeout?: number,
  ) {
    return this.tokyoService.getSymbolStatistics(login, from, to, timeout);
  }

  @ApiOperation({
    summary: 'Get minimal essential trade data for storage and future analysis (all accounts)',
    description: 'Returns minimal essential trade data for storage and future analysis. This endpoint provides all necessary fields to calculate any statistics in the future.',
  })
  @ApiResponse({ status: 200, description: 'Successful Response', type: MinimalTradesResponseDto })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiQuery({ name: 'from', required: false, type: Number, description: 'Epoch seconds from' })
  @ApiQuery({ name: 'to', required: false, type: Number, description: 'Epoch seconds to' })
  @ApiQuery({ name: 'timeout', required: false, type: Number, description: 'Timeout seconds', example: 30.0 })
  @Get('account/:login/trades/minimal')
  getTradesMinimal(
    @Param('login') login: string,
    @Query('from') from?: number,
    @Query('to') to?: number,
    @Query('timeout') timeout?: number,
  ) {
    return this.tokyoService.getTradesMinimal(login, from, to, timeout);
  }

  @ApiOperation({ summary: 'Get symbol info via the connected MT5 terminal' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: SymbolInfoResponseDto })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiParam({ name: 'symbol', description: 'Symbol name', type: String })
  @ApiQuery({ name: 'timeout', required: false, type: Number, description: 'Timeout seconds', example: 10.0 })
  @Get('account/:login/symbol/:symbol')
  getSymbolInfo(@Param('login') login: string, @Param('symbol') symbol: string, @Query('timeout') timeout?: number) {
    return this.tokyoService.getSymbolInfo(login, symbol, timeout);
  }

  @ApiOperation({ summary: 'Get latest tick via the connected MT5 terminal' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: SymbolTickResponseDto })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiParam({ name: 'symbol', description: 'Symbol name', type: String })
  @ApiQuery({ name: 'timeout', required: false, type: Number, description: 'Timeout seconds', example: 10.0 })
  @Get('account/:login/symbol/:symbol/tick')
  getSymbolTick(@Param('login') login: string, @Param('symbol') symbol: string, @Query('timeout') timeout?: number) {
    return this.tokyoService.getSymbolTick(login, symbol, timeout);
  }

  @ApiOperation({ summary: 'List currently mapped logins to sockets (debug)' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: DebugConnectionsResponseDto })
  @Get('debug/connections')
  getDebugConnections() {
    return this.tokyoService.getDebugConnections();
  }

  @ApiOperation({ summary: 'Send a raw line to the EA socket for this login (debug)' })
  @ApiResponse({ status: 200, description: 'Successful Response', type: Object })
  @ApiParam({ name: 'login', description: 'Account login number', type: String })
  @ApiQuery({ name: 'text', required: false, type: String, description: 'Text to send', example: 'PING_TEST' })
  @Get('debug/push/:login')
  debugPush(@Param('login') login: string, @Query('text') text?: string) {
    return this.tokyoService.debugPush(login, text);
  }
}

