import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateAccountDto } from './dto/create-account.dto';
import {
  MetaTraderAccountListResponseDto,
  MetaTraderAccountResponseDto
} from './dto/metaapi-response.dto';
import { MetaApiService } from './metaapi.service';

@ApiTags('MetaAPI') 
@ApiBearerAuth()
@Controller('metaapi')
@UseGuards(AuthGuard('jwt'))
export class MetaApiController {
  constructor(private readonly metaApiService: MetaApiService) {}

  @ApiOperation({ summary: 'Get all MetaTrader accounts' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all MetaTrader accounts',
    type: MetaTraderAccountListResponseDto
  })
  @Get('accounts')
  @UseGuards(AdminGuard)
  async getAccounts() {
    return this.metaApiService.getAccounts();
  }

  @ApiOperation({ summary: 'Create MetaTrader account' })
  @ApiResponse({ 
    status: 201, 
    description: 'Account created successfully',
    type: MetaTraderAccountResponseDto
  })
  @ApiBody({ type: CreateAccountDto })
  @Post('accounts')
  @UseGuards(AdminGuard)
  async createAccount(@Body() createAccountDto: CreateAccountDto, @Request() req) {
    console.log(req.user, createAccountDto);
    return this.metaApiService.createAccount(createAccountDto, req.user.sub);
  }
} 