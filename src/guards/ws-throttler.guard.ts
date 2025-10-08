import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  // In development we want to avoid websocket throttling to prevent 429s on startup/dev workflow
  canActivate(context: ExecutionContext) {
    if (process.env.NODE_ENV === 'development') return true as any;
    return super.canActivate(context);
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