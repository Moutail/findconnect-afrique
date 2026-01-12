import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ThemedText } from './themed-text';
import { LocationData, Coordinates, DEFAULT_MAP_REGION, LOME_POI, isValidCoordinates } from '@/types/location';
import { Colors } from '@/constants/theme';

interface LocationPickerProps {
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  showMap?: boolean;
}

export function LocationPicker({ value, onChange, showMap = true }: LocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [tempMarker, setTempMarker] = useState<Coordinates | null>(null);

  useEffect(() => {
    if (value?.coordinates) {
      setTempMarker(value.coordinates);
    }
  }, [value]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre permission pour accéder à votre localisation.'
        );
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocoding pour obtenir l'adresse
      let address = '';
      let city = '';
      let region = '';
      let country = '';

      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode.length > 0) {
          const place = geocode[0];
          address = `${place.street || ''} ${place.streetNumber || ''}`.trim();
          city = place.city || place.subregion || '';
          region = place.region || '';
          country = place.country || '';
        }
      } catch (geocodeError) {
        console.error('Geocoding error:', geocodeError);
      }

      const locationData: LocationData = {
        coordinates: { latitude, longitude },
        address,
        city,
        region,
        country,
        accuracy: location.coords.accuracy || undefined,
        timestamp: Date.now(),
      };

      onChange(locationData);
      setTempMarker({ latitude, longitude });
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir votre localisation. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const selectPOI = (poi: typeof LOME_POI[0]) => {
    const locationData: LocationData = {
      coordinates: poi.coordinates,
      address: poi.address,
      city: 'Lomé',
      region: 'Maritime',
      country: 'Togo',
      timestamp: Date.now(),
    };

    onChange(locationData);
    setTempMarker(poi.coordinates);
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setTempMarker({ latitude, longitude });

    // Reverse geocoding
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        const place = geocode[0];
        const locationData: LocationData = {
          coordinates: { latitude, longitude },
          address: `${place.street || ''} ${place.streetNumber || ''}`.trim(),
          city: place.city || place.subregion || '',
          region: place.region || '',
          country: place.country || '',
          timestamp: Date.now(),
        };
        onChange(locationData);
      } else {
        onChange({
          coordinates: { latitude, longitude },
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      onChange({
        coordinates: { latitude, longitude },
        timestamp: Date.now(),
      });
    }
  };

  const confirmLocation = () => {
    if (tempMarker) {
      setMapExpanded(false);
    }
  };

  const clearLocation = () => {
    onChange(null);
    setTempMarker(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.label}>Localisation</ThemedText>
        {value && (
          <TouchableOpacity onPress={clearLocation} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#ef4444" />
            <ThemedText style={styles.clearText}>Effacer</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Avertissement de confidentialité */}
      {!value && (
        <View style={styles.privacyWarning}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#f59e0b" />
          <ThemedText style={styles.privacyText}>
            Indiquez le lieu de perte/découverte, PAS votre adresse personnelle
          </ThemedText>
        </View>
      )}

      {value ? (
        <View style={styles.selectedLocation}>
          <Ionicons name="location" size={20} color={Colors.light.togoGreen} />
          <View style={{ flex: 1 }}>
            {value.address && <ThemedText style={styles.address}>{value.address}</ThemedText>}
            <ThemedText style={styles.cityText}>
              {[value.city, value.region, value.country].filter(Boolean).join(', ')}
            </ThemedText>
          </View>
          {showMap && (
            <TouchableOpacity onPress={() => setMapExpanded(true)} style={styles.viewMapButton}>
              <ThemedText style={styles.viewMapText}>Voir carte</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.currentLocationButton]}
            onPress={getCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="locate" size={20} color="#ffffff" />
                <ThemedText style={styles.actionButtonText}>Position actuelle</ThemedText>
              </>
            )}
          </TouchableOpacity>

          {showMap && (
            <TouchableOpacity style={styles.actionButton} onPress={() => setMapExpanded(true)}>
              <Ionicons name="map" size={20} color={Colors.light.togoGreen} />
              <ThemedText style={[styles.actionButtonText, { color: Colors.light.togoGreen }]}>
                Choisir sur carte
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Points d'intérêt suggérés */}
      {!value && (
        <View style={styles.poiSection}>
          <ThemedText style={styles.poiTitle}>Ou sélectionner un lieu:</ThemedText>
          <View style={styles.poiList}>
            {LOME_POI.slice(0, 6).map((poi) => (
              <TouchableOpacity key={poi.id} style={styles.poiItem} onPress={() => selectPOI(poi)}>
                <ThemedText style={styles.poiIcon}>{poi.icon}</ThemedText>
                <ThemedText style={styles.poiName} numberOfLines={1}>
                  {poi.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Modal de carte */}
      {mapExpanded && showMap && (
        <View style={styles.mapModal}>
          <View style={styles.mapHeader}>
            <ThemedText style={styles.mapTitle}>Choisir la localisation</ThemedText>
            <TouchableOpacity onPress={() => setMapExpanded(false)}>
              <Ionicons name="close" size={28} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={
              value?.coordinates && isValidCoordinates(value.coordinates)
                ? {
                    ...value.coordinates,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }
                : DEFAULT_MAP_REGION
            }
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton
          >
            {tempMarker && isValidCoordinates(tempMarker) && (
              <Marker coordinate={tempMarker} title="Localisation sélectionnée" pinColor={Colors.light.togoGreen} />
            )}

            {LOME_POI.map((poi) => (
              <Marker
                key={poi.id}
                coordinate={poi.coordinates}
                title={poi.name}
                description={poi.address}
                onPress={() => {
                  selectPOI(poi);
                  setTempMarker(poi.coordinates);
                }}
              />
            ))}
          </MapView>

          <View style={styles.mapFooter}>
            <View style={styles.mapPrivacyNote}>
              <Ionicons name="information-circle" size={14} color="#1d4ed8" />
              <ThemedText style={styles.mapPrivacyText}>
                Choisissez le lieu de l'événement, pas votre domicile
              </ThemedText>
            </View>
            <ThemedText style={styles.mapHint}>📍 Appuyez sur la carte pour placer un marqueur</ThemedText>
            <TouchableOpacity
              style={[styles.confirmButton, !tempMarker && styles.confirmButtonDisabled]}
              onPress={confirmLocation}
              disabled={!tempMarker}
            >
              <ThemedText style={styles.confirmButtonText}>Confirmer la position</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  privacyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 10,
  },
  privacyText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
    lineHeight: 16,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  selectedLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
  },
  address: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  cityText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  viewMapButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.light.togoGreen,
    borderRadius: 6,
  },
  viewMapText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: Colors.light.togoGreen,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  currentLocationButton: {
    backgroundColor: Colors.light.togoGreen,
    borderColor: Colors.light.togoGreen,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  poiSection: {
    marginTop: 8,
  },
  poiTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  poiList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  poiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: '48%',
  },
  poiIcon: {
    fontSize: 16,
  },
  poiName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  mapModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 1000,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  map: {
    flex: 1,
  },
  mapFooter: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  mapPrivacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    padding: 8,
  },
  mapPrivacyText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#1e40af',
    lineHeight: 14,
  },
  mapHint: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: Colors.light.togoGreen,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
