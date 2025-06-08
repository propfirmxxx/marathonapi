import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FaqResponseDto, FaqListResponseDto } from './dto/faq-response.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('FAQ')
@ApiBearerAuth()
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post()
  @UseGuards(AdminGuard)
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new FAQ' })
  @ApiResponse({ 
    status: 201, 
    description: 'FAQ created successfully',
    type: FaqResponseDto
  })
  async create(@Body() createFaqDto: CreateFaqDto) {
    const data = await this.faqService.create(createFaqDto);
    return {
      message: 'faq.created'
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all active FAQs' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all active FAQs',
    type: [FaqResponseDto]
  })
  async findAll() {
    const data = await this.faqService.findAll();
    return data
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @UseGuards(AuthGuard('jwt'))  @ApiOperation({ summary: 'Update FAQ' })
  @ApiResponse({ 
    status: 200, 
    description: 'FAQ updated successfully',
    type: FaqResponseDto
  })
  async update(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto) {
    const data = await this.faqService.update(id, updateFaqDto);
    return {
      message: 'faq.updated'
    };
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @UseGuards(AuthGuard('jwt'))  @ApiOperation({ summary: 'Delete FAQ' })
  @ApiResponse({ 
    status: 200, 
    description: 'FAQ deleted successfully'
  })
  async remove(@Param('id') id: string) {
    await this.faqService.remove(id);
    return {
      message: 'faq.deleted'
    };
  }
} 