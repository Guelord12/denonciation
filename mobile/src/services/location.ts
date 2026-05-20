import * as Location from 'expo-location';
import { API_BASE_URL } from '../config/constants';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

class LocationService {
  async getDeviceLocation(): Promise<LocationData | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('⚠️ Permission de localisation refusée');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode.length > 0) {
        const geo = reverseGeocode[0];
        return {
          latitude,
          longitude,
          city: geo.city || 'Inconnue',
          country: geo.country || 'Inconnue',
        };
      }

      return {
        latitude,
        longitude,
        city: 'Inconnue',
        country: 'Inconnue',
      };
    } catch (error) {
      console.error('❌ Erreur géolocalisation:', error);
      return null;
    }
  }

  async reverseGeocodeCoordinates(
    latitude: number,
    longitude: number
  ): Promise<LocationData | null> {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode.length > 0) {
        const geo = reverseGeocode[0];
        return {
          latitude,
          longitude,
          city: geo.city || 'Inconnue',
          country: geo.country || 'Inconnue',
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur reverse geocoding:', error);
      return null;
    }
  }

  async geocodeCity(city: string): Promise<LocationData | null> {
    try {
      const geocoded = await Location.geocodeAsync(city);
      if (geocoded.length > 0) {
        const { latitude, longitude } = geocoded[0];
        return {
          latitude,
          longitude,
          city,
          country: 'Inconnue',
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur geocoding:', error);
      return null;
    }
  }
}

export const locationService = new LocationService();
