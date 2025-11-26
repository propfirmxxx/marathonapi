import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Optional Auth Guard - validates JWT token if present but doesn't block request if missing
 * Sets req.user if token is valid, otherwise leaves it undefined
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if authorization header exists
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    // If no auth header, allow request to proceed without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    // If auth header exists, try to validate it
    // Wrap in try-catch and always return true to allow request even if auth fails
    try {
      const result = super.canActivate(context);
      
      if (result instanceof Promise) {
        return result.catch(() => true); // Allow request even if auth fails
      }
      
      if (result instanceof Observable) {
        return result.pipe(
          catchError(() => of(true)) // Allow request even if auth fails
        );
      }
      
      return true;
    } catch (error) {
      // If any error occurs, allow request to proceed
      return true;
    }
  }

  handleRequest(err: any, user: any, info: any) {
    // If token is invalid or missing, don't throw error, just return undefined
    // This allows the request to proceed without authentication
    if (err || !user || info) {
      // Return undefined to allow request to proceed without user
      return undefined;
    }
    return user;
  }
}

