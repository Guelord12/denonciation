import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapPin } from 'lucide-react-native';

interface ReportMapProps {
  reports: Array<{
    id: number;
    title: string;
    latitude: number;
    longitude: number;
    category_color?: string;
  }>;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMarkerPress?: (reportId: number) => void;
}

export default function ReportMapView({
  reports,
  initialRegion = {
    latitude: -4.4419,
    longitude: 15.2663,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  onMarkerPress,
}: ReportMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (reports.length > 0 && mapRef.current) {
      const validReports = reports.filter((r) => r.latitude && r.longitude);
      if (validReports.length > 0) {
        mapRef.current.fitToCoordinates(
          validReports.map((r) => ({ latitude: r.latitude, longitude: r.longitude })),
          {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          }
        );
      }
    }
  }, [reports]);

  const validReports = reports.filter((r) => r.latitude && r.longitude);

  if (validReports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MapPin color="#CCC" size={48} />
        <Text style={styles.emptyText}>Aucune localisation disponible</Text>
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={initialRegion}
    >
      {validReports.map((report) => (
        <Marker
          key={report.id}
          coordinate={{
            latitude: report.latitude,
            longitude: report.longitude,
          }}
          onPress={() => onMarkerPress?.(report.id)}
        >
          <View
            style={[
              styles.marker,
              { backgroundColor: report.category_color || '#EF4444' },
            ]}
          />
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 250,
    borderRadius: 12,
  },
  marker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  emptyContainer: {
    height: 250,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
});