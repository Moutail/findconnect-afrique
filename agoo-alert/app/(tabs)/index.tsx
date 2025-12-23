import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  View,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { db } from '@/config/firebaseConfig';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';

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

    return result;
  }, [reports, searchQuery, filterType]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const mapSnap = (snapshot: any) => {
      const data: Report[] = snapshot.docs.map((doc: any) => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          type: d.type === 'object' ? 'object' : 'person',
          kind: d.kind === 'found' ? 'found' : 'lost',
          title: d.title || '',
          city: d.city,
          status: d.status || 'open',
          imageUrl: d.imageUrl,
          createdAt: d.createdAt ?? null,
        };
      });
      setReports(data);
      setLoading(false);
      setRefreshing(false);
    };

    const qWithOrder = query(
      collection(db, 'reports'),
      where('moderationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    const qNoOrder = query(collection(db, 'reports'), where('moderationStatus', '==', 'approved'));

    const unsubPrimary = onSnapshot(
      qWithOrder,
      (snapshot) => {
        setError(null);
        mapSnap(snapshot);
      },
      (e) => {
        console.error('Error loading reports', e);
        setError((e as any)?.message ?? 'Impossible de charger les publications.');
        setLoading(true);

        const unsubFallback = onSnapshot(
          qNoOrder,
          (snapshot) => {
            mapSnap(snapshot);
          },
          (e2) => {
            console.error('Fallback error loading reports', e2);
            setError(((e2 as any)?.message ?? 'Impossible de charger les publications.') + '\n' + ((e as any)?.message ?? ''));
            setLoading(false);
            setRefreshing(false);
          }
        );

        return () => unsubFallback();
      }
    );

    return () => unsubPrimary();
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
            <ThemedText style={styles.viewMore}>Voir le détail</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={Colors.light.togoGreen} />
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
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/about' as any })}
              activeOpacity={0.85}
              style={styles.aboutBtn}
            >
              <Ionicons name="information-circle" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche */}
          <View style={styles.searchContainer}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
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
                <ThemedText style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>Tout</ThemedText>
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
                <ThemedText style={[styles.filterText, filterType === 'person' && styles.filterTextActive]}>
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
                <ThemedText style={[styles.filterText, filterType === 'object_lost' && styles.filterTextActive]}>
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
                <ThemedText style={[styles.filterText, filterType === 'object_found' && styles.filterTextActive]}>
                  Objets trouvés
                </ThemedText>
              </View>
            )}
          </Pressable>
        </ScrollView>

        {/* Titre de section */}
        <View style={styles.sectionHeader}>
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
              { paddingBottom: Math.max(120, insets.bottom + 120) },
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 206, 0, 0.22)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(210, 16, 52, 0.14)',
  },
  headerContent: {
    zIndex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 206, 0, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
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
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    gap: 12,
  },
  card: {
    flexDirection: 'column',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  coverWrap: {
    width: '100%',
    height: 170,
    backgroundColor: '#f1f5f9',
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
    height: 70,
  },
  cardBody: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconGradient: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  cityText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  viewMore: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
    flex: 1,
  },
  // Styles pour la barre de recherche
  searchContainer: {
    marginTop: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  // Styles pour les filtres
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingRight: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: Colors.light.togoGreen,
    borderColor: Colors.light.togoGreen,
  },
  filterChipPressed: {
    backgroundColor: 'rgba(255, 206, 0, 0.22)',
    borderColor: 'rgba(255, 206, 0, 0.35)',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  // Styles pour le header de section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultCount: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
