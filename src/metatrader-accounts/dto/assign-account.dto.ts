import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAccountDto {
  @ApiProperty({ description: 'Marathon participant ID to assign the account to', example: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  marathonParticipantId: string;
}

