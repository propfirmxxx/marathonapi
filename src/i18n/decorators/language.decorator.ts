import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract the language from the request
 * The language is set by the I18nMiddleware based on Accept-Language header
 * 
 * Usage:
 * @Get()
 * async findAll(@Language() language: string) {
 *   // language will be 'en', 'fa', 'ar', or 'tr'
 * }
 */
export const Language = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request['language'] || 'en';
  },
);

