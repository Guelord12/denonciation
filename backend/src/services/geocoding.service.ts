import axios from 'axios';
import { logger } from '../utils/logger';

// =====================================================
// TYPES ET INTERFACES
// =====================================================

interface GeocodingResult {
  address: string;
  city: string | null;
  region: string | null;
  country: string | null;
  postalCode: string | null;
  displayName: string;
  confidence: number;
  isValidForReport: boolean;
  validationIssues: string[];
}

interface LocationValidationResult {
  isValid: boolean;
  issues: string[];
  location: GeocodingResult | null;
  suggestedLocation: GeocodingResult | null;
}

// =====================================================
// CONFIGURATION
// =====================================================

const API_CONFIG = {
  nominatim: {
    url: 'https://nominatim.openstreetmap.org/reverse',
    userAgent: 'DenonciationApp/1.0.0 (denonciation.world@gmail.com)',
  },
  opencage: {
    apiKey: process.env.OPENCAGE_API_KEY || '',
    url: 'https://api.opencagedata.com/geocode/v1/json',
  },
  geoapify: {
    apiKey: process.env.GEOAPIFY_API_KEY || '',
    url: 'https://api.geoapify.com/v1/geocode/reverse',
  },
};

// =====================================================
// CLASSE PRINCIPALE DE GÉOCODAGE
// =====================================================

export class GeocodingService {
  
  /**
   * Effectue un géocodage inverse pour obtenir l'adresse à partir des coordonnées
   * @param latitude - Latitude
   * @param longitude - Longitude
   */
  public async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    try {
      // Essayer d'abord Nominatim (gratuit, pas de clé API requise)
      const nominatimResult = await this.tryNominatim(latitude, longitude);
      if (nominatimResult) {
        return nominatimResult;
      }

      // Fallback: OpenCage (si clé API configurée)
      if (API_CONFIG.opencage.apiKey) {
        const opencageResult = await this.tryOpenCage(latitude, longitude);
        if (opencageResult) {
          return opencageResult;
        }
      }

      // Fallback: Geoapify (si clé API configurée)
      if (API_CONFIG.geoapify.apiKey) {
        const geoapifyResult = await this.tryGeoapify(latitude, longitude);
        if (geoapifyResult) {
          return geoapifyResult;
        }
      }

      logger.warn(`Could not reverse geocode coordinates: ${latitude}, ${longitude}`);
      return null;

    } catch (error) {
      logger.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Essaie Nominatim (OpenStreetMap) - Gratuit, pas de clé API
   */
  private async tryNominatim(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    try {
      const response = await axios.get(API_CONFIG.nominatim.url, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
          zoom: 18,
          accept_language: 'fr,en',
        },
        headers: {
          'User-Agent': API_CONFIG.nominatim.userAgent,
        },
        timeout: 5000,
      });

      const data = response.data;
      
      if (!data || !data.address) {
        return null;
      }

      const address = data.address;
      
      const result: GeocodingResult = {
        address: data.display_name || '',
        city: address.city || address.town || address.village || address.municipality || null,
        region: address.state || address.region || address.county || null,
        country: address.country || null,
        postalCode: address.postcode || null,
        displayName: data.display_name || '',
        confidence: 1.0, // Nominatim ne fournit pas de score de confiance
        isValidForReport: true,
        validationIssues: [],
      };

      // Valider le résultat
      this.validateLocation(result);
      
      logger.info(`✅ Reverse geocoded: ${result.displayName}`);
      return result;

    } catch (error) {
      logger.warn('Nominatim geocoding failed:', error);
      return null;
    }
  }

  /**
   * Essaie OpenCage (nécessite une clé API)
   */
  private async tryOpenCage(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    try {
      const response = await axios.get(API_CONFIG.opencage.url, {
        params: {
          q: `${latitude},${longitude}`,
          key: API_CONFIG.opencage.apiKey,
          language: 'fr',
          limit: 1,
          no_annotations: 1,
        },
        timeout: 5000,
      });

      const data = response.data;
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      const firstResult = data.results[0];
      const components = firstResult.components;
      
      const result: GeocodingResult = {
        address: firstResult.formatted || '',
        city: components.city || components.town || components.village || components.municipality || null,
        region: components.state || components.region || components.county || null,
        country: components.country || null,
        postalCode: components.postcode || null,
        displayName: firstResult.formatted || '',
        confidence: firstResult.confidence || 0,
        isValidForReport: true,
        validationIssues: [],
      };

      this.validateLocation(result);
      
      logger.info(`✅ OpenCage geocoded: ${result.displayName} (confidence: ${result.confidence})`);
      return result;

    } catch (error) {
      logger.warn('OpenCage geocoding failed:', error);
      return null;
    }
  }

  /**
   * Essaie Geoapify (nécessite une clé API)
   */
  private async tryGeoapify(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    try {
      const response = await axios.get(API_CONFIG.geoapify.url, {
        params: {
          lat: latitude,
          lon: longitude,
          apiKey: API_CONFIG.geoapify.apiKey,
          format: 'json',
          lang: 'fr',
        },
        timeout: 5000,
      });

      const data = response.data;
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      const firstResult = data.results[0];
      
      const result: GeocodingResult = {
        address: firstResult.formatted || '',
        city: firstResult.city || firstResult.town || firstResult.village || firstResult.municipality || null,
        region: firstResult.state || firstResult.region || firstResult.county || null,
        country: firstResult.country || null,
        postalCode: firstResult.postcode || null,
        displayName: firstResult.formatted || '',
        confidence: firstResult.rank?.confidence || 0.8,
        isValidForReport: true,
        validationIssues: [],
      };

      this.validateLocation(result);
      
      logger.info(`✅ Geoapify geocoded: ${result.displayName}`);
      return result;

    } catch (error) {
      logger.warn('Geoapify geocoding failed:', error);
      return null;
    }
  }

  /**
   * Valide si la localisation est cohérente pour un signalement
   */
  private validateLocation(result: GeocodingResult): void {
    const issues: string[] = [];

    // Vérifier qu'on a au moins une ville ou une région
    if (!result.city && !result.region) {
      issues.push('Localisation imprécise : ville ou région non trouvée');
      result.isValidForReport = result.isValidForReport && false;
    }

    // Vérifier la confiance (si disponible)
    if (result.confidence < 0.5) {
      issues.push('Faible confiance de géocodage');
      result.isValidForReport = result.isValidForReport && false;
    }

    // Vérifier qu'on a un pays
    if (!result.country) {
      issues.push('Pays non trouvé');
      result.isValidForReport = false;
    }

    result.validationIssues = issues;
  }

  /**
   * Valide si une localisation est cohérente avec le contenu du signalement
   * @param latitude - Latitude
   * @param longitude - Longitude
   * @param reportContent - Contenu du signalement (titre + description)
   */
  public async validateLocationWithContent(
    latitude: number,
    longitude: number,
    reportContent: string
  ): Promise<LocationValidationResult> {
    try {
      const location = await this.reverseGeocode(latitude, longitude);
      
      if (!location) {
        return {
          isValid: false,
          issues: ['Impossible de géocoder la localisation'],
          location: null,
          suggestedLocation: null,
        };
      }

      const issues: string[] = [...location.validationIssues];
      const contentLower = reportContent.toLowerCase();
      let isValid = location.isValidForReport;

      // Vérifier la cohérence ville/pays avec le contenu
      if (location.city) {
        const cityInContent = contentLower.includes(location.city.toLowerCase());
        if (!cityInContent) {
          issues.push(`La ville "${location.city}" n'est pas mentionnée dans le signalement`);
          // Ne pas invalider automatiquement, juste un avertissement
        }
      }

      if (location.country) {
        const countryInContent = contentLower.includes(location.country.toLowerCase());
        if (!countryInContent) {
          issues.push(`Le pays "${location.country}" n'est pas mentionné dans le signalement`);
        }
      }

      // Vérifier les mots-clés de localisation dans le contenu
      const locationKeywords = ['à', 'au', 'aux', 'dans', 'sur', 'près de', 'proche de', 'ville', 'commune', 'quartier'];
      const hasLocationContext = locationKeywords.some(kw => contentLower.includes(kw));
      
      if (!hasLocationContext && !location.city) {
        issues.push('Aucun contexte de localisation dans le signalement');
        isValid = false;
      }

      // Vérifier si les coordonnées sont dans une zone sensible ou incohérente
      const isInOcean = await this.isInOcean(latitude, longitude);
      if (isInOcean) {
        issues.push('Les coordonnées pointent vers l\'océan');
        isValid = false;
      }

      const isInRemoteArea = await this.isInRemoteArea(latitude, longitude);
      if (isInRemoteArea) {
        issues.push('Les coordonnées pointent vers une zone très isolée');
        // Ne pas invalider, mais noter
      }

      return {
        isValid,
        issues,
        location,
        suggestedLocation: isValid ? null : await this.findNearbyCity(latitude, longitude),
      };

    } catch (error) {
      logger.error('Location validation error:', error);
      return {
        isValid: false,
        issues: ['Erreur lors de la validation de la localisation'],
        location: null,
        suggestedLocation: null,
      };
    }
  }

  /**
   * Vérifie si les coordonnées sont dans l'océan
   */
  private async isInOcean(latitude: number, longitude: number): Promise<boolean> {
    try {
      // Utiliser l'API OpenStreetMap pour vérifier si c'est de l'eau
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          zoom: 10,
        },
        headers: {
          'User-Agent': API_CONFIG.nominatim.userAgent,
        },
        timeout: 3000,
      });

      const data = response.data;
      
      // Si pas de résultat ou type "water", c'est probablement l'océan
      if (!data || data.type === 'water' || data.class === 'water') {
        return true;
      }

      return false;

    } catch (error) {
      logger.warn('Ocean check failed:', error);
      return false;
    }
  }

  /**
   * Vérifie si les coordonnées sont dans une zone très isolée
   */
  private async isInRemoteArea(latitude: number, longitude: number): Promise<boolean> {
    try {
      // Vérifier la densité de population via l'API Overpass (OpenStreetMap)
      const overpassQuery = `
        [out:json];
        (
          node(around:5000,${latitude},${longitude})[place~"city|town|village"];
          way(around:5000,${latitude},${longitude})[place~"city|town|village"];
          relation(around:5000,${latitude},${longitude})[place~"city|town|village"];
        );
        out count;
      `;

      const response = await axios.post(
        'https://overpass-api.de/api/interpreter',
        overpassQuery,
        {
          headers: { 'Content-Type': 'text/plain' },
          timeout: 5000,
        }
      );

      // S'il y a moins de 2 lieux habités dans un rayon de 5km, c'est une zone isolée
      const count = response.data?.elements?.length || 0;
      return count < 2;

    } catch (error) {
      logger.warn('Remote area check failed:', error);
      return false;
    }
  }

  /**
   * Trouve la ville la plus proche des coordonnées
   */
  private async findNearbyCity(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    try {
      // Chercher les lieux habités dans un rayon de 50km
      const overpassQuery = `
        [out:json];
        (
          node(around:50000,${latitude},${longitude})[place~"city|town"];
          way(around:50000,${latitude},${longitude})[place~"city|town"];
        );
        out body 1;
      `;

      const response = await axios.post(
        'https://overpass-api.de/api/interpreter',
        overpassQuery,
        {
          headers: { 'Content-Type': 'text/plain' },
          timeout: 5000,
        }
      );

      const elements = response.data?.elements || [];
      
      if (elements.length === 0) {
        return null;
      }

      const nearestPlace = elements[0];
      
      if (nearestPlace.lat && nearestPlace.lon) {
        return await this.reverseGeocode(nearestPlace.lat, nearestPlace.lon);
      }

      return null;

    } catch (error) {
      logger.warn('Nearby city search failed:', error);
      return null;
    }
  }
}

// =====================================================
// EXPORT DU SERVICE
// =====================================================

let geocodingServiceInstance: GeocodingService | null = null;

export function getGeocodingService(): GeocodingService {
  if (!geocodingServiceInstance) {
    geocodingServiceInstance = new GeocodingService();
  }
  return geocodingServiceInstance;
}

export default GeocodingService;