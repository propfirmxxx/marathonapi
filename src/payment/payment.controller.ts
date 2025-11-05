import { Controller, Post, Body, Param, UseGuards, Get, Query, Headers } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CreateWalletChargeDto } from './dto/create-wallet-charge.dto';
import { CreateMarathonPaymentDto } from './dto/create-marathon-payment.dto';
import { NowPaymentsWebhookDto } from './dto/nowpayments-webhook.dto';
import { GetPaymentsDto } from './dto/get-payments.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';

@ApiTags('Payments')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('wallet/charge')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment for wallet charge' })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    schema: {
      type: 'object',
      properties: {
        paymentId: { type: 'string' },
        paymentUrl: { type: 'string' },
        payAddress: { type: 'string' },
        payAmount: { type: 'number' },
        payCurrency: { type: 'string' },
        network: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async createWalletChargePayment(
    @GetUser('id') userId: string,
    @Body() createWalletChargeDto: CreateWalletChargeDto,
  ) {
    return this.paymentService.createWalletChargePayment(userId, createWalletChargeDto);
  }

  @Post('marathon/:marathonId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment for marathon join' })
  @ApiParam({ name: 'marathonId', description: 'Marathon ID' })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    schema: {
      type: 'object',
      properties: {
        paymentId: { type: 'string' },
        paymentUrl: { type: 'string' },
        payAddress: { type: 'string' },
        payAmount: { type: 'number' },
        payCurrency: { type: 'string' },
        network: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async createMarathonPayment(
    @Param('marathonId') marathonId: string,
    @GetUser('id') userId: string,
  ) {
    return this.paymentService.createMarathonPayment(userId, marathonId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle payment webhook from NowPayments' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'success',
        },
      },
    },
  })
  @ApiHeader({ name: 'x-nowpayments-sig', description: 'IPN signature', required: true })
  @ApiBody({
    description: 'Webhook payload from NowPayments',
    type: NowPaymentsWebhookDto,
  })
  async handleWebhook(
    @Body() webhookData: NowPaymentsWebhookDto,
    @Headers('x-nowpayments-sig') signature: string,
  ) {
    if (!signature) {
      throw new Error('Missing IPN signature');
    }

    await this.paymentService.handleWebhook(webhookData, signature);
    return { status: 'success' };
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment details by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment details',
    type: PaymentResponseDto,
  })
  async getPaymentById(
    @Param('id') paymentId: string,
    @GetUser('id') userId: string,
  ) {
    const payment = await this.paymentService.getPaymentById(paymentId, userId);
    return this.transformToResponseDto(payment);
  }

  @Get('my-payments/all')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all user payments with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'] })
  @ApiQuery({ name: 'paymentType', required: false, enum: ['WALLET_CHARGE', 'MARATHON_JOIN'] })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of payments',
    schema: {
      type: 'object',
      properties: {
        payments: {
          type: 'array',
          items: { $ref: '#/components/schemas/PaymentResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getUserPayments(
    @GetUser('id') userId: string,
    @Query() query: GetPaymentsDto,
  ) {
    const { payments, total } = await this.paymentService.getUserPayments(
      userId,
      query.page,
      query.limit,
      {
        status: query.status,
        paymentType: query.paymentType,
      },
    );

    return {
      payments: payments.map((p) => this.transformToResponseDto(p)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  private transformToResponseDto(payment: any): PaymentResponseDto {
    return {
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      paymentType: payment.paymentType,
      gateway: payment.gateway,
      nowpaymentsId: payment.nowpaymentsId,
      payAddress: payment.payAddress,
      payAmount: payment.payAmount,
      payCurrency: payment.payCurrency,
      network: payment.network,
      invoiceUrl: payment.invoiceUrl,
      expiresAt: payment.expiresAt,
      marathonId: payment.marathonId,
      isTest: payment.isTest || false,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}