import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ReportsMapView } from '@/components/ReportsMapView';
import { DistanceFilter } from '@/components/DistanceFilter';
import { Coordinates } from '@/types/location';
import { Colors } from '@/constants/theme';
import { fetchReportsBackendFirst } from '@/utils/reportsSource';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'backend' | 'firebase'>('backend');
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Filtre de distance
  const [distanceFilterEnabled, setDistanceFilterEnabled] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);

  // Récupérer la position de l'utilisateur
  const getUserLocation = async () => {
    setLocationLoading(true);
    try {
      // Vérifier si les services de localisation sont disponibles
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Localisation indisponible',
          'Les services de localisation ne sont pas disponibles sur cet appareil. La carte affichera les alertes sans votre position.'
        );
        setLocationLoading(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre permission pour afficher votre position sur la carte.'
        );
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      // Erreur silencieuse - la carte fonctionne sans position utilisateur
    } finally {
      setLocationLoading(false);
    }
  };

  // Charger la position au montage
  useEffect(() => {
    getUserLocation();
  }, []);

  // Charger les publications
  useEffect(() => {
    setLoading(true);

    let cancelled = false;

    (async () => {
      try {
        const { reports: list, source: src } = await fetchReportsBackendFirst({ limit: 200 });
        if (cancelled) return;
        setReports(list as any);
        setSource(src);
      } catch (error) {
        console.error('Error loading reports:', error);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Filtrer par distance si activé
  const filteredReports = distanceFilterEnabled && maxDistance && userLocation
    ? reports.filter((report) => {
        if (!report.location?.coordinates) return false;

        const distance = calculateDistance(
          userLocation,
          report.location.coordinates
        );

        return distance <= maxDistance;
      })
    : reports;

  // Calculer la distance entre deux points (formule de Haversine)
  const calculateDistance = (
    coord1: Coordinates,
    coord2: Coordinates
  ): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.latitude * Math.PI) / 180) *
        Math.cos((coord2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.togoGreen} />
          <ThemedText style={styles.loadingText}>Chargement de la carte...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="map" size={24} color={Colors.light.togoGreen} />
          <ThemedText type="title" style={styles.title}>
            Carte
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={getUserLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color={Colors.light.togoGreen} />
            ) : (
              <Ionicons name="locate" size={20} color={Colors.light.togoGreen} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowDistanceFilter(!showDistanceFilter)}
          >
            <Ionicons
              name={showDistanceFilter ? 'options' : 'options-outline'}
              size={20}
              color={Colors.light.togoGreen}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtre de distance */}
      {showDistanceFilter && (
        <View style={styles.filterContainer}>
          <DistanceFilter
            maxDistance={maxDistance}
            onChange={setMaxDistance}
            enabled={distanceFilterEnabled}
            onToggle={setDistanceFilterEnabled}
          />
        </View>
      )}

      {source === 'firebase' ? (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#0f172a" />
          <ThemedText style={styles.offlineText}>Mode hors-ligne: données Firebase (lecture seule)</ThemedText>
        </View>
      ) : null}

      {/* Carte */}
      <View style={styles.mapContainer}>
        <ReportsMapView
          reports={filteredReports}
          userLocation={userLocation}
          loading={loading}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  locationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff7ed',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  offlineText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
  },
});
