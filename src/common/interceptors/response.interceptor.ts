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

              // Add ban information if user is banned (only if response is an object)
              if (response && typeof response === 'object' && !Array.isArray(response)) {
                if (user.isBanned) {
                  response.isBanned = true;
                  response.banReason = user.banReason;
                  response.bannedAt = user.bannedAt;
                  response.bannedUntil = user.bannedUntil;
                  response.banMessage = this.i18nService.translate(
                    'Your account has been banned',
                    language,
                  );
                }
              }

              // Return response as is (dates will be serialized to ISO strings by default)
              return response;
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