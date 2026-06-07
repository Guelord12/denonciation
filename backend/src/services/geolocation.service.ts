// IP Geolocation Service
// Retrieves approximate location data from IP addresses

import { logger } from '../utils/logger';

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

/**
 * Get location data from IP address using public API
 * Uses ip-api.com (free tier) or falls back to hardcoded defaults
 */
export async function getLocationFromIP(ipAddress: string): Promise<LocationData | null> {
  try {
    // Skip if IP is localhost or private
    if (!ipAddress || ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168') || ipAddress.startsWith('10.')) {
      logger.debug(`Skipping geolocation for private/local IP: ${ipAddress}`);
      return null;
    }

    // Clean IP address (remove ::ffff: prefix for IPv6-mapped IPv4)
    const cleanIP = ipAddress.replace('::ffff:', '');

    // Try ip-api.com (free, no key required)
    try {
      const response = await fetch(`http://ip-api.com/json/${cleanIP}?fields=status,lat,lon,city,country`, {
        timeout: 5000,
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'success' && data.lat && data.lon) {
          logger.info(`Geolocation for IP ${cleanIP}: ${data.city}, ${data.country}`);
          return {
            latitude: parseFloat(data.lat),
            longitude: parseFloat(data.lon),
            city: data.city,
            country: data.country,
          };
        }
      }
    } catch (apiError) {
      logger.warn(`IP-API error for ${cleanIP}:`, apiError);
      // Continue to fallback
    }

    // Fallback: Return null instead of hardcoded location
    logger.debug(`Could not determine location for IP: ${cleanIP}`);
    return null;

  } catch (error) {
    logger.error('Geolocation service error:', error);
    return null;
  }
}

/**
 * Mock location data for testing
 * Used when API is unavailable
 */
export function getMockLocation(): LocationData {
  // Default to central DRC (Kinshasa area)
  return {
    latitude: -4.3276,
    longitude: 15.3136,
    city: 'Kinshasa',
    country: 'Democratic Republic of the Congo',
  };
}
