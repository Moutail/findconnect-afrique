import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';

interface DistanceFilterProps {
  maxDistance: number | null; // en km, null = illimité
  onChange: (distance: number | null) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const DISTANCE_OPTIONS = [1, 5, 10, 20, 50, 100];

export function DistanceFilter({ maxDistance, onChange, enabled, onToggle }: DistanceFilterProps) {
  const [customDistance, setCustomDistance] = useState(maxDistance || 10);
  const [showCustom, setShowCustom] = useState(false);

  const handleToggle = () => {
    if (enabled) {
      onToggle(false);
      onChange(null);
    } else {
      onToggle(true);
      onChange(customDistance);
    }
  };

  const handlePresetSelect = (distance: number) => {
    setCustomDistance(distance);
    onChange(distance);
    onToggle(true);
    setShowCustom(false);
  };

  const handleCustomChange = (value: number) => {
    const rounded = Math.round(value);
    setCustomDistance(rounded);
    onChange(rounded);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="locate-outline" size={20} color={enabled ? Colors.light.togoGreen : '#64748b'} />
          <ThemedText style={[styles.title, enabled && styles.titleActive]}>Filtrer par distance</ThemedText>
        </View>
        <TouchableOpacity style={styles.toggle} onPress={handleToggle}>
          <View style={[styles.toggleTrack, enabled && styles.toggleTrackActive]}>
            <View style={[styles.toggleThumb, enabled && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>
      </View>

      {enabled && (
        <View style={styles.content}>
          <ThemedText style={styles.subtitle}>Rayon de recherche:</ThemedText>

          <View style={styles.presets}>
            {DISTANCE_OPTIONS.map((distance) => (
              <TouchableOpacity
                key={distance}
                style={[
                  styles.presetButton,
                  maxDistance === distance && !showCustom && styles.presetButtonActive,
                ]}
                onPress={() => handlePresetSelect(distance)}
              >
                <ThemedText
                  style={[
                    styles.presetText,
                    maxDistance === distance && !showCustom && styles.presetTextActive,
                  ]}
                >
                  {distance} km
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.customToggle} onPress={() => setShowCustom(!showCustom)}>
            <ThemedText style={styles.customToggleText}>
              {showCustom ? '◀ Masquer' : 'Distance personnalisée ▶'}
            </ThemedText>
          </TouchableOpacity>

          {showCustom && (
            <View style={styles.customSection}>
              <View style={styles.sliderHeader}>
                <ThemedText style={styles.sliderLabel}>Distance:</ThemedText>
                <ThemedText style={styles.sliderValue}>{customDistance} km</ThemedText>
              </View>

              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={200}
                step={1}
                value={customDistance}
                onValueChange={handleCustomChange}
                minimumTrackTintColor={Colors.light.togoGreen}
                maximumTrackTintColor="#e2e8f0"
                thumbTintColor={Colors.light.togoGreen}
              />

              <View style={styles.sliderLabels}>
                <ThemedText style={styles.sliderLabelText}>1 km</ThemedText>
                <ThemedText style={styles.sliderLabelText}>200 km</ThemedText>
              </View>
            </View>
          )}

          {maxDistance && (
            <View style={styles.info}>
              <Ionicons name="information-circle" size={16} color="#1d4ed8" />
              <ThemedText style={styles.infoText}>
                Affichage des résultats dans un rayon de {maxDistance} km autour de votre position
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  titleActive: {
    color: Colors.light.togoGreen,
  },
  toggle: {
    padding: 4,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: Colors.light.togoGreen,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  content: {
    marginTop: 12,
    gap: 12,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetButtonActive: {
    backgroundColor: Colors.light.togoGreen,
    borderColor: Colors.light.togoGreen,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  presetTextActive: {
    color: '#ffffff',
  },
  customToggle: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  customToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.togoGreen,
  },
  customSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.togoGreen,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabelText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#1e40af',
    lineHeight: 16,
  },
});
