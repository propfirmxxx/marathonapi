import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ description: 'Name of the department' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description of the department', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: 'Whether the department is active',
    required: false,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 