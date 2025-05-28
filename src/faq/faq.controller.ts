import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FaqResponseDto, FaqListResponseDto } from './dto/faq-response.dto';

@ApiTags('FAQ')
@ApiBearerAuth()
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post()
  @UseGuards(AuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create a new FAQ' })
  @ApiResponse({ 
    status: 201, 
    description: 'FAQ created successfully',
    type: FaqResponseDto
  })
  create(@Body() createFaqDto: CreateFaqDto) {
    return this.faqService.create(createFaqDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active FAQs' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all active FAQs',
    type: FaqListResponseDto
  })
  findAll() {
    return this.faqService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get FAQ by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the FAQ',
    type: FaqResponseDto
  })
  findOne(@Param('id') id: string) {
    return this.faqService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update FAQ' })
  @ApiResponse({ 
    status: 200, 
    description: 'FAQ updated successfully',
    type: FaqResponseDto
  })
  update(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto) {
    return this.faqService.update(id, updateFaqDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete FAQ' })
  @ApiResponse({ 
    status: 200, 
    description: 'FAQ deleted successfully'
  })
  remove(@Param('id') id: string) {
    return this.faqService.remove(id);
  }
} 