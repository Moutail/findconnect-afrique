import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import Constants from 'expo-constants';
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

  const isExpoGoAndroid = Platform.OS === 'android' && Constants.appOwnership === 'expo';

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
  }, [reportsWithLocation, userLocation]);

  const handleMarkerPress = (reportId: string) => {
    if (onReportPress) {
      onReportPress(reportId);
    } else {
      router.push({ pathname: '/report-detail', params: { id: reportId } });
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

  if (isExpoGoAndroid) {
    return (
      <ThemedView style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <View style={styles.fallbackIconWrap}>
            <Ionicons name="map-outline" size={26} color={Colors.light.togoGreen} />
          </View>
          <ThemedText style={styles.fallbackTitle}>Carte indisponible</ThemedText>
          <ThemedText style={styles.fallbackText}>
            Sur Android, l'affichage de la carte dans Expo Go peut ne pas fonctionner si Google Play Services n'est pas
            disponible sur l'appareil.
          </ThemedText>
          <View style={styles.fallbackRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
            <ThemedText style={styles.fallbackHint}>Teste sur un téléphone Android avec Google Play Services</ThemedText>
          </View>
          <View style={styles.fallbackRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
            <ThemedText style={styles.fallbackHint}>Ou utilise un émulateur Android "Google Play"</ThemedText>
          </View>
          <View style={styles.fallbackRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
            <ThemedText style={styles.fallbackHint}>Ou crée une build de développement (dev client)</ThemedText>
          </View>
        </View>
      </ThemedView>
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
                    <View style={styles.calloutCategoryBadge}>
                      <ThemedText style={styles.calloutCategory}>
                        {report.mainCategory}
                      </ThemedText>
                    </View>
                    {report.isOfficialPost && (
                      <View style={styles.officialBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#1d4ed8" />
                        <ThemedText style={styles.officialBadgeText}>Officiel</ThemedText>
                      </View>
                    )}
                  </View>

                  <ThemedText style={styles.calloutTitle} numberOfLines={2}>
                    {report.title}
                  </ThemedText>

                  {report.organizationName && (
                    <View style={styles.calloutRow}>
                      <Ionicons name="business-outline" size={12} color={Colors.light.togoGreen} />
                      <ThemedText style={styles.calloutOrg} numberOfLines={1}>
                        {report.organizationName}
                      </ThemedText>
                    </View>
                  )}

                  {report.location?.address && (
                    <View style={styles.calloutRow}>
                      <Ionicons name="location-outline" size={12} color="#64748b" />
                      <ThemedText style={styles.calloutAddress} numberOfLines={1}>
                        {report.location.address}
                      </ThemedText>
                    </View>
                  )}

                  {report.location?.city && (
                    <ThemedText style={styles.calloutCity}>
                      {report.location.city}
                    </ThemedText>
                  )}

                  {distance !== null && (
                    <View style={styles.calloutDistanceRow}>
                      <Ionicons name="navigate-outline" size={12} color="#1d4ed8" />
                      <ThemedText style={styles.calloutDistance}>A {formatDistance(distance)}</ThemedText>
                    </View>
                  )}

                  <View style={styles.calloutFooter}>
                    <Ionicons name="hand-left-outline" size={12} color="#94a3b8" />
                    <ThemedText style={styles.calloutTap}>Appuyer pour voir les details</ThemedText>
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Legende */}
      <View style={styles.legend}>
        <View style={styles.legendHeader}>
          <Ionicons name="information-circle-outline" size={14} color="#64748b" />
          <ThemedText style={styles.legendTitle}>Legende</ThemedText>
        </View>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <ThemedText style={styles.legendText}>Perdu</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <ThemedText style={styles.legendText}>Trouve</ThemedText>
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

      {/* Compteur de resultats */}
      <View style={styles.counter}>
        <Ionicons name="location" size={16} color={Colors.light.togoGreen} />
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
    backgroundColor: '#f8fafc',
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fallbackCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  fallbackIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 106, 78, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  fallbackText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    marginBottom: 12,
  },
  fallbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  fallbackHint: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
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
    borderRadius: 16,
    padding: 14,
    width: 260,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calloutCategoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  calloutCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  officialBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
    lineHeight: 20,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  calloutOrg: {
    fontSize: 12,
    fontWeight: '600',
    color: '#006A4E',
    flex: 1,
  },
  calloutAddress: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  calloutCity: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    marginLeft: 18,
  },
  calloutDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  calloutDistance: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  calloutFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  calloutTap: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  legend: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  counter: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
});
