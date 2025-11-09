import { ApiProperty } from '@nestjs/swagger';

export class CancelMarathonResponseDto {
  @ApiProperty()
  participantId: string;

  @ApiProperty()
  marathonId: string;

  @ApiProperty({ description: 'Refunded amount credited back to the virtual wallet' })
  refundedAmount: number;

  @ApiProperty({ description: 'Refund rate applied to the original entry fee' })
  refundRate: number;

  @ApiProperty()
  refundTransactionId: string;

  @ApiProperty({ description: 'Virtual wallet balance after refund' })
  walletBalance: number;

  @ApiProperty({ type: String, format: 'date-time' })
  cancelledAt: Date;
}

