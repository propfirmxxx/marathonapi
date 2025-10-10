import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  // In development we want to avoid websocket throttling to prevent 429s on startup/dev workflow
  canActivate(context: ExecutionContext) {
    if (process.env.NODE_ENV === 'development') return true as any;
    return super.canActivate(context);
  }

  // Protect against a missing ThrottlerModule configuration which can leave `this.options` undefined
  // The parent ThrottlerGuard.onModuleInit expects options to exist and calls .sort on them. If
  // options are undefined (e.g. module not registered) we short-circuit initialization here.
  async onModuleInit(): Promise<void> {
    // If options are not provided or malformed, set the derived properties the
    // parent would normally set and skip calling the parent implementation.
    const opts = this['options'];
    const isMalformed = !opts || (typeof opts === 'object' && !Array.isArray(opts) && !opts.throttlers);

    if (isMalformed) {
      // Mirror the minimal state the parent expects after initialization.
      this.throttlers = [];
      this.commonOptions = {} as any;
      this.commonOptions.getTracker = this.getTracker.bind(this);
      this.commonOptions.generateKey = this.generateKey.bind(this);
      return;
    }

    // If options look OK, delegate to parent initialization which will populate
    // `throttlers` and `commonOptions` correctly.
    if (typeof super.onModuleInit === 'function') {
      await super.onModuleInit();
    }
  }
  getRequestResponse(context: ExecutionContext) {
    const ws = context.switchToWs();
    return { req: ws.getClient(), res: ws.getClient() };
  }

  protected async throwThrottlingException(context: ExecutionContext, throttlerLimitDetail: ThrottlerLimitDetail): Promise<void> {
    const client = context.switchToWs().getClient();
    client.emit('error', { message: 'Too many requests', ...throttlerLimitDetail });
    client.disconnect();
    throw new ThrottlerException('Too many requests');
  }

  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    const client = context.switchToWs().getClient();
    const ip = client.handshake.address;
    return `ws-${ip}-${suffix}-${name}`;
  }
} 