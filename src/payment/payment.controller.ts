import { Controller, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payment')
@UseGuards(AuthGuard('jwt'))
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ summary: 'Create payment for marathon registration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns payment URL',
    schema: {
      type: 'object',
      properties: {
        paymentUrl: {
          type: 'string',
          example: 'https://nowpayments.io/payment/...'
        }
      }
    }
  })
  @ApiParam({ name: 'marathonId', description: 'Marathon ID' })
  @Post('marathon/:marathonId')
  async createMarathonPayment(
    @Param('marathonId') marathonId: string,
    @Req() req: any,
  ) {
    return this.paymentService.createPayment(marathonId, req.user.id);
  }

  @ApiOperation({ summary: 'Handle payment webhook' })
  @ApiResponse({ 
    status: 200, 
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'success'
        }
      }
    }
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        payment_id: { type: 'string' },
        payment_status: { type: 'string' },
        pay_address: { type: 'string' },
        pay_amount: { type: 'number' },
        pay_currency: { type: 'string' },
        order_id: { type: 'string' },
        order_description: { type: 'string' }
      }
    }
  })
  @Post('webhook')
  async handleWebhook(@Body() paymentData: any) {
    await this.paymentService.handleWebhook(paymentData);
    return { status: 'success' };
  }
}