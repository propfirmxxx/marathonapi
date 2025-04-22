import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { MetaApiService } from './metaapi.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('MetaAPI')
@ApiBearerAuth()
@Controller('metaapi')
@UseGuards(AuthGuard('jwt'))
export class MetaApiController {
  constructor(private readonly metaApiService: MetaApiService) {}

  @ApiOperation({ summary: 'Get all MetaTrader accounts' })
  @ApiResponse({ status: 200, description: 'Returns all MetaTrader accounts' })
  @Get('accounts')
  @UseGuards(AdminGuard)
  async getAccounts() {
    return this.metaApiService.getAccounts();
  }

  @ApiOperation({ summary: 'Create a new MetaTrader account' })
  @ApiResponse({ status: 201, description: 'MetaTrader account created successfully' })
  @Post('accounts')
  @UseGuards(AdminGuard)
  async createAccount(@Body() createAccountDto: CreateAccountDto, @Request() req) {
    return this.metaApiService.createAccount(createAccountDto, req.user.id);
  }
} 