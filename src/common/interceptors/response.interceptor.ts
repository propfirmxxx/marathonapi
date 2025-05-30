import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';

export interface Response<T> {
  [key: string]: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private readonly i18nService: I18nService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const language = request['language'] || 'en';

    return next.handle().pipe(
      map(data => {
        const response = data

        if(response.message) {
          response.message = this.i18nService.translate(response.message, language, response.params);
        }

        return response;
      }),
    );
  }
} 