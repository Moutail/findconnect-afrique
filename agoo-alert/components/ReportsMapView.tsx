import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import {
  DEFAULT_MAP_REGION,
  getRegionForCoordinates,
  isValidCoordinates,
  formatDistance,
  calculateDistance,
  Coordinates,
} from '@/types/location';
import { MAIN_CATEGORY_ICONS, MAIN_CATEGORY_COLORS, MainCategory } from '@/types/categories';

interface Report {
  id: string;
  title: string;
  description: string;
  mainCategory: MainCategory;
  location?: {
    coordinates: Coordinates;
    address?: string;
    city?: string;
  };
  createdAt?: any;
  organizationName?: string;
  organizationLogo?: string;
  isOfficialPost?: boolean;
}

interface ReportsMapViewProps {
  reports: Report[];
  userLocation?: Coordinates | null;
  onReportPress?: (reportId: string) => void;
  loading?: boolean;
}

export function ReportsMapView({ reports, userLocation, onReportPress, loading = false }: ReportsMapViewProps) {
  const router = useRouter();
  const [mapRegion, setMapRegion] = useState(DEFAULT_MAP_REGION);

  // Filtrer les rapports avec localisation valide
  const reportsWithLocation = reports.filter(
    (report) => report.location?.coordinates && isValidCoordinates(report.location.coordinates)
  );

  useEffect(() => {
    if (reportsWithLocation.length > 0) {
      const coordinates = reportsWithLocation.map((r) => r.location!.coordinates);
      if (userLocation && isValidCoordinates(userLocation)) {
        coordinates.push(userLocation);
      }
      const region = getRegionForCoordinates(coordinates);
      setMapRegion(region);
    } else if (userLocation && isValidCoordinates(userLocation)) {
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [reportsWithLocation.length, userLocation]);

  const handleMarkerPress = (reportId: string) => {
    if (onReportPress) {
      onReportPress(reportId);
    } else {
      router.push(`/report/${reportId}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006A4E" />
        <ThemedText style={styles.loadingText}>Chargement de la carte...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion}
        region={mapRegion}
        showsUserLocation={!!userLocation}
        showsMyLocationButton
        showsCompass
        showsScale
      >
        {/* Marqueur position utilisateur */}
        {userLocation && isValidCoordinates(userLocation) && (
          <Marker coordinate={userLocation} title="Votre position" pinColor="#1d4ed8">
            <View style={styles.userMarker}>
              <View style={styles.userMarkerDot} />
            </View>
          </Marker>
        )}

        {/* Marqueurs des rapports */}
        {reportsWithLocation.map((report) => {
          const coords = report.location!.coordinates;
          const distance =
            userLocation && isValidCoordinates(userLocation)
              ? calculateDistance(userLocation, coords)
              : null;

          return (
            <Marker
              key={report.id}
              coordinate={coords}
              onPress={() => handleMarkerPress(report.id)}
              pinColor={MAIN_CATEGORY_COLORS[report.mainCategory]}
            >
              <View
                style={[
                  styles.customMarker,
                  {
                    backgroundColor: MAIN_CATEGORY_COLORS[report.mainCategory],
                    borderColor: report.isOfficialPost ? '#1d4ed8' : MAIN_CATEGORY_COLORS[report.mainCategory],
                    borderWidth: report.isOfficialPost ? 3 : 2,
                  },
                ]}
              >
                <ThemedText style={styles.markerIcon}>{MAIN_CATEGORY_ICONS[report.mainCategory]}</ThemedText>
              </View>

              <Callout tooltip onPress={() => handleMarkerPress(report.id)}>
                <View style={styles.callout}>
                  <View style={styles.calloutHeader}>
                    <ThemedText style={styles.calloutCategory}>
                      {MAIN_CATEGORY_ICONS[report.mainCategory]} {report.mainCategory}
                    </ThemedText>
                    {report.isOfficialPost && (
                      <View style={styles.officialBadge}>
                        <ThemedText style={styles.officialBadgeText}>✓ Officiel</ThemedText>
                      </View>
                    )}
                  </View>

                  <ThemedText style={styles.calloutTitle} numberOfLines={2}>
                    {report.title}
                  </ThemedText>

                  {report.organizationName && (
                    <ThemedText style={styles.calloutOrg} numberOfLines={1}>
                      📍 {report.organizationName}
                    </ThemedText>
                  )}

                  {report.location?.address && (
                    <ThemedText style={styles.calloutAddress} numberOfLines={1}>
                      📍 {report.location.address}
                    </ThemedText>
                  )}

                  {report.location?.city && (
                    <ThemedText style={styles.calloutCity}>
                      {report.location.city}
                    </ThemedText>
                  )}

                  {distance !== null && (
                    <ThemedText style={styles.calloutDistance}>📏 À {formatDistance(distance)}</ThemedText>
                  )}

                  <View style={styles.calloutFooter}>
                    <ThemedText style={styles.calloutTap}>👆 Appuyer pour voir les détails</ThemedText>
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Légende */}
      <View style={styles.legend}>
        <ThemedText style={styles.legendTitle}>Légende</ThemedText>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <ThemedText style={styles.legendText}>Perdu</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <ThemedText style={styles.legendText}>Trouvé</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
            <ThemedText style={styles.legendText}>Animal</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <ThemedText style={styles.legendText}>Personne</ThemedText>
          </View>
        </View>
      </View>

      {/* Compteur de résultats */}
      <View style={styles.counter}>
        <ThemedText style={styles.counterText}>
          {reportsWithLocation.length} publication{reportsWithLocation.length > 1 ? 's' : ''} sur la carte
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(29, 78, 216, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1d4ed8',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerIcon: {
    fontSize: 18,
  },
  callout: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    width: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calloutCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  officialBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  officialBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  calloutOrg: {
    fontSize: 12,
    fontWeight: '600',
    color: '#006A4E',
    marginBottom: 4,
  },
  calloutAddress: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  calloutCity: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 6,
  },
  calloutDistance: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1d4ed8',
    marginBottom: 8,
  },
  calloutFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  calloutTap: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  legend: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  legendItems: {
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  legendText: {
    fontSize: 10,
    color: '#64748b',
  },
  counter: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
});
