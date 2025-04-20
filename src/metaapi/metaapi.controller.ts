import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { MetaApiService } from './metaapi.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('metaapi')
export class MetaApiController {
  constructor(private readonly metaApiService: MetaApiService) {}

  @Post('accounts')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async createAccount(@Body() createAccountDto: CreateAccountDto, @Request() req) {
    return this.metaApiService.createAccount(createAccountDto, req.user.id);
  }
} 