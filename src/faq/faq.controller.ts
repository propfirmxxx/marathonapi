import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { FaqResponseDto, FaqListResponseDto } from './dto/faq-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Language } from '../i18n/decorators/language.decorator';

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
  @ApiHeader({
    name: 'Accept-Language',
    description: 'Language code (en, fa, ar, tr)',
    required: false,
    example: 'fa'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all active FAQs in the requested language',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/FaqResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' }
      }
    }
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'query', required: false, type: String, description: 'Search in question or answer' })
  async findAll(
    @Language() language: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('query') query?: string,
  ): Promise<PaginatedResponseDto<FaqResponseDto>> {
    const pageNum = page && Number(page) > 0 ? Number(page) : 1;
    const limitNum = limit && Number(limit) > 0 ? Number(limit) : 10;
    const { faqs, total } = await this.faqService.findAll(pageNum, limitNum, language, query);
    return {
      data: faqs as any,
      total,
      page: pageNum,
      limit: limitNum,
    };
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