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
    // If options are not provided, set safe defaults and skip parent initialization
    if (!this['options']) {
      this.throttlers = [];
      this.commonOptions = {} as any;
      // ensure defaults for tracker/generateKey so other methods won't fail
      this.commonOptions.getTracker = this.getTracker.bind(this);
      this.commonOptions.generateKey = this.generateKey.bind(this);
      return;
    }

    // Otherwise delegate to the parent implementation
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