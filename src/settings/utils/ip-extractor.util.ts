import { Request } from 'express';

export interface IpInfo {
  ip: string;
  forwardedFor?: string;
  realIp?: string;
}

/**
 * Extract IP address from Express request
 * Handles various proxy headers and scenarios
 */
export function extractIpFromRequest(req: Request): IpInfo {
  const forwardedFor = req.headers['x-forwarded-for'] as string;
  const realIp = req.headers['x-real-ip'] as string;
  const cfConnectingIp = req.headers['cf-connecting-ip'] as string;

  // Cloudflare header (most reliable for Cloudflare)
  if (cfConnectingIp) {
    return {
      ip: cfConnectingIp.split(',')[0].trim(),
      forwardedFor,
      realIp,
    };
  }

  // X-Real-IP header (nginx, etc.)
  if (realIp) {
    return {
      ip: realIp,
      forwardedFor,
      realIp,
    };
  }

  // X-Forwarded-For header (most common proxy header)
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return {
      ip: forwardedFor.split(',')[0].trim(),
      forwardedFor,
      realIp,
    };
  }

  // Connection remote address (direct connection)
  if (req.connection && req.connection.remoteAddress) {
    return {
      ip: req.connection.remoteAddress.replace(/^::ffff:/, ''), // Remove IPv6 prefix for IPv4
      forwardedFor,
      realIp,
    };
  }

  // Socket remote address (fallback)
  if (req.socket && req.socket.remoteAddress) {
    return {
      ip: req.socket.remoteAddress.replace(/^::ffff:/, ''), // Remove IPv6 prefix for IPv4
      forwardedFor,
      realIp,
    };
  }

  // Ultimate fallback
  return {
    ip: req.ip || 'unknown',
    forwardedFor,
    realIp,
  };
}

/**
 * Get clean IP address string from request
 */
export function getClientIp(req: Request): string {
  const ipInfo = extractIpFromRequest(req);
  return ipInfo.ip;
}

/**
 * Check if IP is a private/internal address
 */
export function isPrivateIp(ip: string): boolean {
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,             // 192.168.0.0/16
    /^127\./,                  // 127.0.0.0/8 (localhost)
    /^169\.254\./,             // 169.254.0.0/16 (link-local)
    /^::1$/,                   // IPv6 localhost
    /^fc00:/,                  // IPv6 private
    /^fe80:/,                  // IPv6 link-local
  ];

  return privateRanges.some(range => range.test(ip));
}

/**
 * Check if IP is localhost/loopback
 */
export function isLocalhost(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
}
