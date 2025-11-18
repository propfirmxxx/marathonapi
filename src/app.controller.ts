import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';

@ApiTags('App')
@Controller('')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns a hello message' })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @Get('health')
  health() {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'marathon-api'
    };
  }

  @ApiOperation({ 
    summary: 'Generate admin token for development (DEV ONLY)',
    description: 'This endpoint generates an admin token without expiration time. Only available in development mode.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin token generated successfully',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user'] }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 403, 
    description: 'This endpoint is only available in development mode' 
  })
  @Get('dev/admin-token')
  async getDevAdminToken() {
    return await this.appService.generateDevAdminToken();
  }
}
