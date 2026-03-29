import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DistanceFilter } from '@/components/DistanceFilter';
import { ThemedText } from '@/components/themed-text';
import { authAPI } from '@/config/apiConfig';
import { Colors } from '@/constants/theme';
import { Coordinates, calculateDistance } from '@/types/location';
import { fetchReportsBackendFirst } from '@/utils/reportsSource';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

type Report = {
  id: string;
  type: 'person' | 'object';
  kind?: 'lost' | 'found';
  title: string;
  city?: string;
  status?: string;
  imageUrl?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

type FilterType = 'all' | 'person' | 'object_lost' | 'object_found';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Distance filter
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [distanceFilterEnabled, setDistanceFilterEnabled] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);

  const [tourVisible, setTourVisible] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourTargets, setTourTargets] = useState<Record<string, { x: number; y: number; width: number; height: number }>>(
    {}
  );

  const searchRef = useRef<View>(null);
  const filtersRef = useRef<ScrollView>(null);
  const listRef = useRef<View>(null);

  const TOUR_KEY = 'onboarding_tour_home_v1';
  const tourSteps: Array<{ id: 'search' | 'filters' | 'list'; title: string; body: string }> = [
    {
      id: 'search',
      title: 'Rechercher',
      body: "Tape ici pour retrouver rapidement une alerte par titre ou par ville.",
    },
    {
      id: 'filters',
      title: 'Filtrer',
      body: "Utilise ces filtres pour voir seulement les personnes, objets perdus/trouvés, ou activer le filtre de distance.",
    },
    {
      id: 'list',
      title: 'Ouvrir une alerte',
      body: "Appuie sur une carte pour voir le détail, les photos et demander un chat.",
    },
  ];

  // Filtrer les résultats
  const filteredReports = useMemo(() => {
    let result = reports;

    // Filtre par type
    if (filterType === 'person') {
      result = result.filter((r) => r.type === 'person');
    }
    if (filterType === 'object_lost') {
      result = result.filter((r) => r.type === 'object' && (r.kind ?? 'lost') === 'lost');
    }
    if (filterType === 'object_found') {
      result = result.filter((r) => r.type === 'object' && (r.kind ?? 'lost') === 'found');
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.city && r.city.toLowerCase().includes(q))
      );
    }

    // Filtre par distance
    if (distanceFilterEnabled && maxDistance && userLocation) {
      result = result.filter((r: any) => {
        if (!r.location?.coordinates) return false;
        const distance = calculateDistance(userLocation, r.location.coordinates);
        return distance <= maxDistance;
      });
    }

    return result;
  }, [reports, searchQuery, filterType, distanceFilterEnabled, maxDistance, userLocation]);

  // Get user location for distance filtering
  useEffect(() => {
    (async () => {
      try {
        // Vérifier si les services de localisation sont disponibles
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          // Services non disponibles (pas de Google Play Services ou localisation désactivée)
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        // Silencieux - la localisation n'est pas critique pour l'accueil
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(TOUR_KEY);
        if (!seen) {
          setTourStep(0);
          setTourVisible(true);
        }
      } catch {
        // no-op
      }
    })();
  }, []);

  const finishTour = async () => {
    setTourVisible(false);
    try {
      await AsyncStorage.setItem(TOUR_KEY, '1');
    } catch {
      // no-op
    }
  };

  const currentTour = tourSteps[tourStep];
  const targetRect = currentTour ? tourTargets[currentTour.id] : undefined;
  const modalOffsetY = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

  const measureCurrentTarget = () => {
    if (!currentTour) return;
    const ref =
      currentTour.id === 'search'
        ? (searchRef as any)
        : currentTour.id === 'filters'
          ? (filtersRef as any)
          : (listRef as any);

    const node = ref?.current;
    if (!node?.measureInWindow) return;

    node.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return;
      setTourTargets((prev) => ({ ...prev, [currentTour.id]: { x, y, width, height } }));
    });
  };

  useEffect(() => {
    if (!tourVisible) return;
    const t = setTimeout(() => {
      measureCurrentTarget();
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourVisible, tourStep]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    let cancelled = false;

    (async () => {
      try {
        const { reports: list, source } = await fetchReportsBackendFirst({ limit: 50 });
        if (cancelled) return;
        setReports(list as any);
        setError(source === 'firebase' ? 'Mode hors-ligne: données Firebase (lecture seule).' : null);
      } catch (e: any) {
        if (cancelled) return;
        console.error('Error loading reports', e);
        setError(e?.message ?? 'Impossible de charger les publications.');
      } finally {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const onRefresh = () => {
    setRefreshing(true);
    setReloadKey((k) => k + 1);
  };

  const renderItem = ({ item }: { item: Report }) => {
    const isPerson = item.type === 'person';
    const iconName = isPerson ? 'person-circle-outline' : 'briefcase-outline';
    const statusLabel = item.status === 'resolved' ? 'Résolu' : 'En cours';
    const statusColor = item.status === 'resolved' ? '#16a34a' : '#f59e0b';
    const typeGradient: [string, string] = isPerson
      ? [Colors.light.togoGreen, '#004b37']
      : ['#64748b', '#334155'];

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: '/report-detail', params: { id: item.id } })}
      >
        {item.imageUrl ? (
          <View style={styles.coverWrap}>
            <ExpoImage
              source={{ uri: item.imageUrl }}
              style={styles.coverImage}
              contentFit="cover"
              transition={150}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)']}
              style={styles.coverOverlay}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </View>
        ) : null}

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.typeBadge}>
              <LinearGradient
                colors={typeGradient}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={iconName} size={18} color="#ffffff" />
              </LinearGradient>
              <View>
                <ThemedText style={styles.typeText}>
                  {isPerson ? 'Personne disparue' : 'Objet perdu'}
                </ThemedText>
                {item.city && (
                  <View style={styles.cityRow}>
                    <Ionicons name="location-outline" size={12} color="#94a3b8" />
                    <ThemedText style={styles.cityText}>{item.city}</ThemedText>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <ThemedText style={styles.statusText}>{statusLabel}</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.title} numberOfLines={2}>{item.title}</ThemedText>

          <View style={styles.footerRow}>
            <View style={styles.ctaButton}>
              <ThemedText style={styles.ctaText}>Voir le détail</ThemedText>
              <Ionicons name="chevron-forward" size={16} color="#ffffff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header avec dégradé */}
      <LinearGradient
        colors={['#003c2c', Colors.light.togoGreen, Colors.light.togoYellow]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Cercle décoratif */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <View style={styles.headerContent}>
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <Ionicons name="search" size={24} color="#ffffff" />
            </View>
            <View>
              <ThemedText style={styles.headerTitle}>Agoo Alert</ThemedText>
              <ThemedText style={styles.headerSubtitle}>Plateforme nationale d'alerte</ThemedText>
            </View>

            <View style={{ flex: 1 }} />
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await authAPI.logout();
                  } finally {
                    router.replace('/login');
                  }
                }}
                activeOpacity={0.85}
                style={styles.aboutBtn}
              >
                <Ionicons name="log-out-outline" size={18} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/create-organization' as any })}
                activeOpacity={0.85}
                style={styles.aboutBtn}
              >
                <Ionicons name="business" size={18} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/about' as any })}
                activeOpacity={0.85}
                style={styles.aboutBtn}
              >
                <Ionicons name="information-circle" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Barre de recherche */}
          <View
            style={styles.searchContainer}
            ref={searchRef}
            onLayout={() => {
              if (tourVisible && currentTour?.id === 'search') measureCurrentTarget();
            }}
          >
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une alerte..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Statistiques rapides */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{reports.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Alertes</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>
                {reports.filter((r) => r.type === 'person').length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Personnes</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>
                {reports.filter((r) => r.type === 'object').length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Objets</ThemedText>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Liste */}
      <View style={styles.listContainer}>
        {/* Filtres par type */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          ref={filtersRef}
          onLayout={() => {
            if (tourVisible && currentTour?.id === 'filters') measureCurrentTarget();
          }}
        >
          <Pressable onPress={() => setFilterType('all')}>
            {({ pressed }) => (
              <View
                style={[
                  styles.filterChip,
                  filterType === 'all' && styles.filterChipActive,
                  pressed && styles.filterChipPressed,
                ]}
              >
                <Ionicons name="grid-outline" size={14} color={filterType === 'all' ? '#ffffff' : '#64748b'} />
                <ThemedText
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}
                >
                  Tout
                </ThemedText>
              </View>
            )}
          </Pressable>

          <Pressable onPress={() => setFilterType('person')}>
            {({ pressed }) => (
              <View
                style={[
                  styles.filterChip,
                  filterType === 'person' && styles.filterChipActive,
                  pressed && styles.filterChipPressed,
                ]}
              >
                <Ionicons name="person-outline" size={14} color={filterType === 'person' ? '#ffffff' : '#64748b'} />
                <ThemedText
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.filterText, filterType === 'person' && styles.filterTextActive]}
                >
                  Personnes
                </ThemedText>
              </View>
            )}
          </Pressable>

          <Pressable onPress={() => setFilterType('object_lost')}>
            {({ pressed }) => (
              <View
                style={[
                  styles.filterChip,
                  filterType === 'object_lost' && styles.filterChipActive,
                  pressed && styles.filterChipPressed,
                ]}
              >
                <Ionicons name="briefcase-outline" size={14} color={filterType === 'object_lost' ? '#ffffff' : '#64748b'} />
                <ThemedText
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.filterText, filterType === 'object_lost' && styles.filterTextActive]}
                >
                  Objets perdus
                </ThemedText>
              </View>
            )}
          </Pressable>

          <Pressable onPress={() => setFilterType('object_found')}>
            {({ pressed }) => (
              <View
                style={[
                  styles.filterChip,
                  filterType === 'object_found' && styles.filterChipActive,
                  pressed && styles.filterChipPressed,
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={14}
                  color={filterType === 'object_found' ? '#ffffff' : '#64748b'}
                />
                <ThemedText
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.filterText, filterType === 'object_found' && styles.filterTextActive]}
                >
                  Objets trouvés
                </ThemedText>
              </View>
            )}
          </Pressable>

          {/* Distance Filter Toggle Button */}
          <TouchableOpacity
            onPress={() => setShowDistanceFilter(!showDistanceFilter)}
            style={[styles.filterChip, showDistanceFilter && styles.filterChipActive]}
          >
            <Ionicons
              name="location-outline"
              size={14}
              color={showDistanceFilter ? '#ffffff' : '#64748b'}
            />
            <ThemedText
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.filterText, showDistanceFilter && styles.filterTextActive]}
            >
              Distance
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>

        {/* Distance Filter Component */}
        {showDistanceFilter && (
          <View style={styles.distanceFilterContainer}>
            <DistanceFilter
              maxDistance={maxDistance}
              onChange={setMaxDistance}
              enabled={distanceFilterEnabled}
              onToggle={setDistanceFilterEnabled}
            />
          </View>
        )}

        {/* Titre de section */}
        <View
          style={styles.sectionHeader}
          ref={listRef}
          onLayout={() => {
            if (tourVisible && currentTour?.id === 'list') measureCurrentTarget();
          }}
        >
          <ThemedText style={styles.sectionTitle}>
            {searchQuery ? 'Résultats' : 'Alertes récentes'}
          </ThemedText>
          <ThemedText style={styles.resultCount}>
            {filteredReports.length} {filteredReports.length > 1 ? 'alertes' : 'alerte'}
          </ThemedText>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <ThemedText style={styles.loadingText}>Chargement des déclarations…</ThemedText>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="megaphone-outline" size={40} color="#94a3b8" />
            </View>
            <ThemedText style={styles.emptyTitle}>Aucune déclaration</ThemedText>
            <ThemedText style={styles.emptyText}>
              Utilisez l'onglet "Déclarer" pour publier la première alerte.
            </ThemedText>
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="search-outline" size={40} color="#94a3b8" />
            </View>
            <ThemedText style={styles.emptyTitle}>Aucun résultat</ThemedText>
            <ThemedText style={styles.emptyText}>
              Essayez de modifier votre recherche ou vos filtres.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredReports}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(180, insets.bottom + 180) },
            ]}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
                tintColor="#3b82f6"
              />
            }
          />
        )}
      </View>

      <Modal transparent visible={tourVisible} animationType="fade" statusBarTranslucent>
        <View style={styles.tourOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTourVisible(false)} />

          {targetRect ? (
            <View
              pointerEvents="none"
              style={[
                styles.tourHighlight,
                {
                  left: targetRect.x - 6,
                  top: targetRect.y + modalOffsetY - 6,
                  width: targetRect.width + 12,
                  height: targetRect.height + 12,
                },
              ]}
            />
          ) : null}

          <View
            style={[
              styles.tourCard,
              targetRect
                ? {
                    top: (() => {
                      const windowH = Dimensions.get('window').height;
                      const y = targetRect.y + modalOffsetY;
                      const preferBelow = y + targetRect.height + 220 < windowH - 20;
                      const belowTop = y + targetRect.height + 18;
                      const aboveTop = Math.max((insets.top || 0) + 16, y - 220);
                      return preferBelow ? belowTop : aboveTop;
                    })(),
                  }
                : { top: (insets.top || 0) + 120 },
            ]}
          >
            <View style={styles.tourCardHeader}>
              <ThemedText style={styles.tourTitle}>{currentTour?.title ?? 'Guide'}</ThemedText>
              <TouchableOpacity onPress={finishTour} activeOpacity={0.85} style={styles.tourCloseBtn}>
                <Ionicons name="close" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.tourBody}>{currentTour?.body ?? ''}</ThemedText>

            <View style={styles.tourActions}>
              <TouchableOpacity onPress={finishTour} style={styles.tourSkipBtn} activeOpacity={0.9}>
                <ThemedText style={styles.tourSkipText}>Passer</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  if (tourStep >= tourSteps.length - 1) {
                    await finishTour();
                  } else {
                    setTourStep((s) => s + 1);
                  }
                }}
                style={styles.tourNextBtn}
                activeOpacity={0.9}
              >
                <ThemedText style={styles.tourNextText}>
                  {tourStep >= tourSteps.length - 1 ? 'Terminer' : 'Suivant'}
                </ThemedText>
                <Ionicons
                  name={tourStep >= tourSteps.length - 1 ? 'checkmark' : 'arrow-forward'}
                  size={18}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bouton flottant d'aide */}
      <TouchableOpacity
        style={styles.helpFab}
        activeOpacity={0.9}
        onPress={() => router.push('/help-chat' as any)}
      >
        <Ionicons name="help-buoy" size={26} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tourOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.62)',
  },
  tourHighlight: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tourCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
  },
  tourCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tourCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  tourBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    marginBottom: 12,
  },
  tourActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tourSkipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  tourSkipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  tourNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.togoGreen,
    flex: 1,
  },
  tourNextText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerGradient: {
    paddingTop: 36,
    paddingBottom: 12,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    zIndex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  aboutBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 3,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 0.2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    gap: 16,
  },
  card: {
    flexDirection: 'column',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  coverWrap: {
    width: '100%',
    height: 180,
    backgroundColor: '#e2e8f0',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  cardBody: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  cityText: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 22,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.light.togoGreen,
    shadowColor: Colors.light.togoGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  // Styles pour la barre de recherche
  searchContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    height: '100%',
  },
  clearButton: {
    padding: 6,
  },
  // Styles pour les filtres
  filtersRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    paddingRight: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    flexShrink: 0,
    flexGrow: 0,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: Colors.light.togoGreen,
    borderColor: Colors.light.togoGreen,
  },
  filterChipPressed: {
    backgroundColor: '#f8fafc',
    borderColor: Colors.light.togoGreen,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    flexShrink: 0,
    lineHeight: 16,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  distanceFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  // Styles pour le header de section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  helpFab: {
    position: 'absolute',
    right: 20,
    bottom: 110,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.togoGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});
