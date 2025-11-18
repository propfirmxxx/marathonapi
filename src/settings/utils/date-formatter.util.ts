import { formatInTimeZone } from 'date-fns-tz';
import { DateFormat, TimeFormat } from '../entities/user-settings.entity';

export class DateFormatterUtil {
  /**
   * Format a date according to user preferences
   * @param date - The date to format (Date object or ISO string)
   * @param dateFormat - User's preferred date format
   * @param timeFormat - User's preferred time format
   * @param timezone - User's timezone (IANA format)
   * @returns Formatted date string
   */
  static formatDate(
    date: Date | string | null | undefined,
    dateFormat: DateFormat = DateFormat.DD_MM_YYYY,
    timeFormat: TimeFormat = TimeFormat.TWENTY_FOUR_HOUR,
    timezone: string = 'UTC',
  ): string | null {
    if (!date) {
      return null;
    }

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return null;
    }

    // Map date format enum to date-fns format string
    const dateFormatMap: Record<DateFormat, string> = {
      [DateFormat.DD_MM_YYYY]: 'dd/MM/yyyy',
      [DateFormat.MM_DD_YYYY]: 'MM/dd/yyyy',
      [DateFormat.YYYY_MM_DD]: 'yyyy-MM-dd',
      [DateFormat.DD_MMM_YYYY]: 'dd MMM yyyy',
    };

    // Map time format enum to date-fns format string
    const timeFormatMap: Record<TimeFormat, string> = {
      [TimeFormat.TWELVE_HOUR]: 'hh:mm a',
      [TimeFormat.TWENTY_FOUR_HOUR]: 'HH:mm',
    };

    const dateFormatStr = dateFormatMap[dateFormat];
    const timeFormatStr = timeFormatMap[timeFormat];

    // Combine date and time format
    const formatStr = `${dateFormatStr} ${timeFormatStr}`;

    try {
      // Format date in user's timezone
      return formatInTimeZone(dateObj, timezone, formatStr);
    } catch (error) {
      // Fallback to UTC if timezone is invalid
      try {
        return formatInTimeZone(dateObj, 'UTC', formatStr);
      } catch {
        // Final fallback to ISO string
        return dateObj.toISOString();
      }
    }
  }

  /**
   * Format a date-time string for API responses
   * Recursively formats all Date objects and date strings in an object
   */
  static formatDatesInObject(
    obj: any,
    dateFormat: DateFormat = DateFormat.DD_MM_YYYY,
    timeFormat: TimeFormat = TimeFormat.TWENTY_FOUR_HOUR,
    timezone: string = 'UTC',
  ): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle Date objects
    if (obj instanceof Date) {
      return this.formatDate(obj, dateFormat, timeFormat, timezone);
    }

    // Handle date strings (ISO format)
    if (typeof obj === 'string' && this.isDateString(obj)) {
      return this.formatDate(obj, dateFormat, timeFormat, timezone);
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.formatDatesInObject(item, dateFormat, timeFormat, timezone),
      );
    }

    // Handle objects
    if (typeof obj === 'object') {
      const formatted: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          formatted[key] = this.formatDatesInObject(
            obj[key],
            dateFormat,
            timeFormat,
            timezone,
          );
        }
      }
      return formatted;
    }

    // Return primitive values as-is
    return obj;
  }

  /**
   * Check if a string is a date string (ISO format)
   */
  private static isDateString(str: string): boolean {
    // Check for ISO date format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
    const isoDateRegex =
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
    if (isoDateRegex.test(str)) {
      const date = new Date(str);
      return !isNaN(date.getTime());
    }
    return false;
  }
}

