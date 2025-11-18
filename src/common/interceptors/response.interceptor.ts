import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { from } from 'rxjs';
import { I18nService } from '../../i18n/i18n.service';
import { SettingsService } from '../../settings/settings.service';
import { DateFormatterUtil } from '../../settings/utils/date-formatter.util';

export interface Response<T> {
  [key: string]: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(
    private readonly i18nService: I18nService,
    private readonly settingsService: SettingsService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const language = request['language'] || 'en';
    const user = request.user;

    return next.handle().pipe(
      switchMap((data) => {
        // If user is authenticated, get their settings and format dates
        if (user?.id) {
          return from(
            this.settingsService.getOrCreateSettings(user.id),
          ).pipe(
            map((settings) => {
              const response = data;

              // Translate messages
              if (response && response.message) {
                response.message = this.i18nService.translate(
                  response.message,
                  language,
                  response.params,
                );
              }

              // Format dates according to user preferences
              return DateFormatterUtil.formatDatesInObject(
                response,
                settings.dateFormat,
                settings.timeFormat,
                settings.timezone,
              );
            }),
          );
        }

        // For unauthenticated requests, just translate messages (no date formatting)
        const response = data;

        if (response && response.message) {
          response.message = this.i18nService.translate(
            response.message,
            language,
            response.params,
          );
        }

        return from(Promise.resolve(response));
      }),
    );
  }
} 