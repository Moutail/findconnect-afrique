import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ReportsMapView } from '@/components/ReportsMapView';
import { DistanceFilter } from '@/components/DistanceFilter';
import { db } from '@/config/firebaseConfig';
import { Coordinates } from '@/types/location';
import { Colors } from '@/constants/theme';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      console.error('Error getting location:', error);
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

    const q = query(
      collection(db, 'reports'),
      where('moderationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReports(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading reports:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterContainer: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  mapContainer: {
    flex: 1,
  },
});
