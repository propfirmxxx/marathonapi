import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { MetaApiService } from './metaapi.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

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
    schema: {
      example: [
        {
          id: '1',
          name: 'Demo Account',
          login: '12345678',
          server: 'MetaQuotes-Demo',
          type: 'cloud-g2'
        },
        {
          id: '2',
          name: 'Live Account',
          login: '87654321',
          server: 'MetaQuotes-Live',
          type: 'cloud-g2'
        }
      ]
    }
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
    schema: {
      example: {
        id: 1,
        accountId: '12345678',
        login: '12345678',
        password: 'password123',
        server: 'MetaQuotes-Demo',
        platform: 'mt5',
        status: 'active',
        createdAt: '2024-04-22T12:00:00Z',
        updatedAt: '2024-04-22T12:00:00Z'
      }
    }
  })
  @ApiBody({ type: CreateAccountDto })
  @Post('accounts')
  @UseGuards(AdminGuard)
  async createAccount(@Body() createAccountDto: CreateAccountDto, @Request() req) {
    return this.metaApiService.createAccount(createAccountDto, req.user.id);
  }
} 