import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { MetaTraderAccountService } from './metatrader-account.service';
import { CreateMetaTraderAccountDto } from './dto/create-metatrader-account.dto';
import { AssignAccountDto } from './dto/assign-account.dto';
import { 
  MetaTraderAccountResponseDto,
  MetaTraderAccountListResponseDto 
} from './dto/metatrader-account-response.dto';

@ApiTags('MetaTrader Accounts')
@ApiBearerAuth()
@Controller('metatrader-accounts')
@UseGuards(AuthGuard('jwt'))
export class MetaTraderAccountController {
  constructor(private readonly metaTraderAccountService: MetaTraderAccountService) {}

  @ApiOperation({ summary: 'Create a new MetaTrader account (Admin only)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Account created successfully',
    type: MetaTraderAccountResponseDto
  })
  @ApiBody({ type: CreateMetaTraderAccountDto })
  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() createDto: CreateMetaTraderAccountDto) {
    return this.metaTraderAccountService.create(createDto);
  }

  @ApiOperation({ summary: 'Get all MetaTrader accounts' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all accounts',
    type: MetaTraderAccountListResponseDto
  })
  @Get()
  @UseGuards(AdminGuard)
  async findAll() {
    const accounts = await this.metaTraderAccountService.findAll();
    return { accounts };
  }

  @ApiOperation({ summary: 'Get available (unassigned) MetaTrader accounts' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns available accounts',
    type: MetaTraderAccountListResponseDto
  })
  @Get('available')
  @UseGuards(AdminGuard)
  async findAvailable() {
    const accounts = await this.metaTraderAccountService.findAvailable();
    return { accounts };
  }

  @ApiOperation({ summary: 'Get MetaTrader account by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the account',
    type: MetaTraderAccountResponseDto
  })
  @ApiParam({ name: 'id', description: 'MetaTrader account ID' })
  @Get(':id')
  @UseGuards(AdminGuard)
  async findOne(@Param('id') id: string) {
    return this.metaTraderAccountService.findById(id);
  }

  @ApiOperation({ summary: 'Get MetaTrader account for a participant' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the participant\'s account',
    type: MetaTraderAccountResponseDto
  })
  @ApiParam({ name: 'participantId', description: 'Marathon participant ID' })
  @Get('participant/:participantId')
  @UseGuards(AdminGuard)
  async findByParticipantId(@Param('participantId') participantId: string) {
    const account = await this.metaTraderAccountService.findByParticipantId(participantId);
    if (!account) {
      return null;
    }
    return account;
  }

  @ApiOperation({ summary: 'Assign MetaTrader account to a marathon participant' })
  @ApiResponse({ 
    status: 200, 
    description: 'Account assigned successfully',
    type: MetaTraderAccountResponseDto
  })
  @ApiParam({ name: 'id', description: 'MetaTrader account ID' })
  @ApiBody({ type: AssignAccountDto })
  @Post(':id/assign')
  @UseGuards(AdminGuard)
  async assignToParticipant(@Param('id') id: string, @Body() assignDto: AssignAccountDto) {
    return this.metaTraderAccountService.assignToParticipant(id, assignDto);
  }

  @ApiOperation({ summary: 'Unassign MetaTrader account from participant' })
  @ApiResponse({ 
    status: 200, 
    description: 'Account unassigned successfully',
    type: MetaTraderAccountResponseDto
  })
  @ApiParam({ name: 'id', description: 'MetaTrader account ID' })
  @Delete(':id/assign')
  @UseGuards(AdminGuard)
  async unassignFromParticipant(@Param('id') id: string) {
    return this.metaTraderAccountService.unassignFromParticipant(id);
  }

  @ApiOperation({ summary: 'Delete MetaTrader account' })
  @ApiResponse({ 
    status: 200, 
    description: 'Account deleted successfully',
    schema: {
      example: {
        message: 'Account deleted successfully'
      }
    }
  })
  @ApiParam({ name: 'id', description: 'MetaTrader account ID' })
  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string) {
    await this.metaTraderAccountService.remove(id);
    return { message: 'Account deleted successfully' };
  }
}

