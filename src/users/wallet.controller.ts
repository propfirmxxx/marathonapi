import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto, UpdateWalletDto, WalletResponseDto } from './dto/wallet.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Wallets')
@ApiBearerAuth()
@Controller('wallets')
@UseGuards(AuthGuard('jwt'))
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({ 
    status: 201, 
    description: 'Wallet created successfully',
    type: WalletResponseDto
  })
  @ApiBody({ type: CreateWalletDto })
  @Post()
  create(@Req() req: any, @Body() createWalletDto: CreateWalletDto) {
    return this.walletService.create(req.user.id, createWalletDto);
  }

  @ApiOperation({ summary: 'Get all user wallets' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all user wallets',
    type: [WalletResponseDto]
  })
  @Get()
  findAll(@Req() req: any) {
    return this.walletService.findAll(req.user.uid);
  }

  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the wallet',
    type: WalletResponseDto
  })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.walletService.findOne(req.user.uid, id);
  }

  @ApiOperation({ summary: 'Update wallet' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet updated successfully',
    type: WalletResponseDto
  })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiBody({ type: UpdateWalletDto })
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() updateWalletDto: UpdateWalletDto) {
    return this.walletService.update(req.user.id, id, updateWalletDto);
  }

  @ApiOperation({ summary: 'Delete wallet' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet deleted successfully'
  })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.walletService.remove(req.user.uid, id);
  }

  @ApiOperation({ summary: 'Set active wallet' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet set as active successfully',
    type: WalletResponseDto
  })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @Post(':id/activate')
  setActiveWallet(@Req() req: any, @Param('id') id: string) {
    return this.walletService.activateWallet(req.user.id, id);
  }

  @ApiOperation({ summary: 'Deactivate wallet' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet deactivated successfully',
    type: WalletResponseDto
  })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @Post(':id/deactivate')
  deactivateWallet(@Req() req: any, @Param('id') id: string) {
    return this.walletService.deactivateWallet(req.user.id, id);
  }

  @ApiOperation({ summary: 'Get active wallet' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the active wallet',
    type: WalletResponseDto
  })
  @Get('active')
  getActiveWallet(@Req() req: any) {
    return this.walletService.getActiveWallets(req.user.id);
  }
} 