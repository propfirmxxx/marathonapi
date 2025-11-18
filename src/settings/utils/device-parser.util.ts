/**
 * Utility functions for parsing device information from user agent
 */

export interface DeviceInfo {
  device?: string;
  os?: string;
  browser?: string;
  platform?: string;
}

export function parseUserAgent(userAgent: string): DeviceInfo {
  if (!userAgent) {
    return {};
  }

  const info: DeviceInfo = {};

  // Detect OS
  if (userAgent.includes('Windows')) {
    info.os = 'Windows';
    if (userAgent.includes('Windows NT 10.0')) {
      info.os = 'Windows 10/11';
    } else if (userAgent.includes('Windows NT 6.3')) {
      info.os = 'Windows 8.1';
    } else if (userAgent.includes('Windows NT 6.2')) {
      info.os = 'Windows 8';
    } else if (userAgent.includes('Windows NT 6.1')) {
      info.os = 'Windows 7';
    }
  } else if (userAgent.includes('Mac OS X')) {
    info.os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    info.os = 'Linux';
  } else if (userAgent.includes('Android')) {
    info.os = 'Android';
    const androidVersion = userAgent.match(/Android (\d+\.\d+)/);
    if (androidVersion) {
      info.os = `Android ${androidVersion[1]}`;
    }
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    info.os = 'iOS';
    const iosVersion = userAgent.match(/OS (\d+[._]\d+)/);
    if (iosVersion) {
      info.os = `iOS ${iosVersion[1].replace('_', '.')}`;
    }
  }

  // Detect Browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    info.browser = 'Chrome';
    const chromeVersion = userAgent.match(/Chrome\/(\d+)/);
    if (chromeVersion) {
      info.browser = `Chrome ${chromeVersion[1]}`;
    }
  } else if (userAgent.includes('Firefox')) {
    info.browser = 'Firefox';
    const firefoxVersion = userAgent.match(/Firefox\/(\d+)/);
    if (firefoxVersion) {
      info.browser = `Firefox ${firefoxVersion[1]}`;
    }
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    info.browser = 'Safari';
    const safariVersion = userAgent.match(/Version\/(\d+)/);
    if (safariVersion) {
      info.browser = `Safari ${safariVersion[1]}`;
    }
  } else if (userAgent.includes('Edg')) {
    info.browser = 'Edge';
    const edgeVersion = userAgent.match(/Edg\/(\d+)/);
    if (edgeVersion) {
      info.browser = `Edge ${edgeVersion[1]}`;
    }
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    info.browser = 'Opera';
  }

  // Detect Device
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    if (userAgent.includes('iPad')) {
      info.device = 'Tablet';
      info.platform = 'iOS';
    } else if (userAgent.includes('iPhone')) {
      info.device = 'Mobile';
      info.platform = 'iOS';
    } else if (userAgent.includes('Android')) {
      info.device = 'Mobile';
      info.platform = 'Android';
    } else {
      info.device = 'Mobile';
    }
  } else {
    info.device = 'Desktop';
  }

  return info;
}

