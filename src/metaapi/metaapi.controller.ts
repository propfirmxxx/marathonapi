import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { MetaApiService } from './metaapi.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('metaapi')
@UseGuards(AuthGuard('jwt'))
export class MetaApiController {
  constructor(private readonly metaApiService: MetaApiService) {}

  @Get('accounts')
  @UseGuards(AdminGuard)
  async getAccounts() {
    return this.metaApiService.getAccounts();
  }

  @Post('accounts')
  @UseGuards(AdminGuard)
  async createAccount(@Body() createAccountDto: CreateAccountDto, @Request() req) {
    return this.metaApiService.createAccount(createAccountDto, req.user.id);
  }
} 