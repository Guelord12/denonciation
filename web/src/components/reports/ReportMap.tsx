import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface ReportMapProps {
  reports: Array<{
    id: number;
    title: string;
    latitude: number;
    longitude: number;
    category_color?: string;
  }>;
  center?: { lat: number; lng: number };
  zoom?: number;
  onMarkerClick?: (reportId: number) => void;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function ReportMap({ reports, center, zoom = 10, onMarkerClick }: ReportMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = initMap;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.L) return;

    const defaultCenter = center || { lat: -4.4419, lng: 15.2663 }; // Kinshasa

    mapInstanceRef.current = window.L.map(mapRef.current).setView(
      [defaultCenter.lat, defaultCenter.lng],
      zoom
    );

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapInstanceRef.current);

    addMarkers();
  };

  const addMarkers = () => {
    if (!mapInstanceRef.current || !window.L) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    reports.forEach((report) => {
      if (report.latitude && report.longitude) {
        const icon = window.L.divIcon({
          html: `<div style="background-color: ${report.category_color || '#EF4444'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
          className: 'custom-marker',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = window.L.marker([report.latitude, report.longitude], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="max-width: 200px;">
              <h4 style="font-weight: 600; margin-bottom: 4px;">${report.title}</h4>
              <button 
                onclick="window.dispatchEvent(new CustomEvent('report-click', { detail: ${report.id} }))"
                style="color: #EF4444; text-decoration: underline; font-size: 12px;"
              >
                Voir le signalement
              </button>
            </div>
          `);

        markersRef.current.push(marker);
      }
    });

    // Fit bounds if there are markers
    if (markersRef.current.length > 0) {
      const group = window.L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  useEffect(() => {
    if (mapInstanceRef.current && window.L) {
      addMarkers();
    }
  }, [reports]);

  useEffect(() => {
    const handleReportClick = (e: CustomEvent) => {
      if (onMarkerClick) {
        onMarkerClick(e.detail);
      }
    };

    window.addEventListener('report-click', handleReportClick as EventListener);
    return () => {
      window.removeEventListener('report-click', handleReportClick as EventListener);
    };
  }, [onMarkerClick]);

  if (reports.filter((r) => r.latitude && r.longitude).length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Aucune localisation disponible</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-64 rounded-lg" />;
}