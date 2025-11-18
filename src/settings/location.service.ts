import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

export interface LocationData {
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
}

export interface LocationResult {
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly ipApiUrl = 'http://ip-api.com/json';
  private readonly cache = new Map<string, LocationResult>();
  private readonly cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get location data from IP address
   * Uses IP-API service with caching
   */
  async getLocationFromIp(ip: string): Promise<LocationResult | null> {
    // Skip for private/local IPs
    if (this.isPrivateIp(ip) || this.isLocalhost(ip)) {
      return null;
    }

    // Check cache first
    const cached = this.getFromCache(ip);
    if (cached) {
      return cached;
    }

    try {
      this.logger.debug(`Fetching location for IP: ${ip}`);

      const response: AxiosResponse<LocationData> = await axios.get(
        `${this.ipApiUrl}/${ip}`,
        {
          timeout: 5000, // 5 second timeout
          headers: {
            'User-Agent': 'MarathonAPI/1.0',
          },
        }
      );

      // IP-API returns location data directly, check if we got valid data
      const data = response.data;
      if (data && data.country) {
        const location: LocationResult = {
          country: data.country,
          city: data.city,
          region: data.regionName || data.region,
          timezone: data.timezone,
          coordinates: data.lat && data.lon ? {
            lat: typeof data.lat === 'string' ? parseFloat(data.lat) : data.lat,
            lon: typeof data.lon === 'string' ? parseFloat(data.lon) : data.lon,
          } : undefined,
        };

        // Cache the result
        this.setCache(ip, location);

        this.logger.debug(`Location found for IP ${ip}: ${location.city}, ${location.country}`);
        return location;
      } else {
        this.logger.warn(`Failed to get location for IP ${ip}: Invalid response data`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error fetching location for IP ${ip}:`, error.message);
      return null;
    }
  }

  /**
   * Get location from cache
   */
  private getFromCache(ip: string): LocationResult | null {
    const expiry = this.cacheExpiry.get(ip);
    if (expiry && Date.now() > expiry) {
      // Cache expired, remove it
      this.cache.delete(ip);
      this.cacheExpiry.delete(ip);
      return null;
    }

    return this.cache.get(ip) || null;
  }

  /**
   * Set location in cache
   */
  private setCache(ip: string, location: LocationResult): void {
    this.cache.set(ip, location);
    this.cacheExpiry.set(ip, Date.now() + this.CACHE_TTL);
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    const expiredIps: string[] = [];

    for (const [ip, expiry] of this.cacheExpiry) {
      if (now > expiry) {
        expiredIps.push(ip);
      }
    }

    expiredIps.forEach(ip => {
      this.cache.delete(ip);
      this.cacheExpiry.delete(ip);
    });

    if (expiredIps.length > 0) {
      this.logger.debug(`Cleared ${expiredIps.length} expired location cache entries`);
    }
  }

  /**
   * Check if IP is private
   */
  private isPrivateIp(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Check if IP is localhost
   */
  private isLocalhost(ip: string): boolean {
    return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
  }
}
