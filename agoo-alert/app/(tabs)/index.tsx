import { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { db } from '@/config/firebaseConfig';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';

type Report = {
  id: string;
  type: 'person' | 'object';
  title: string;
  city?: string;
  status?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

type FilterType = 'all' | 'person' | 'object';

export default function HomeScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Filtrer les résultats
  const filteredReports = useMemo(() => {
    let result = reports;

    // Filtre par type
    if (filterType !== 'all') {
      result = result.filter((r) => r.type === filterType);
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
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Report[] = snapshot.docs.map((doc) => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            type: d.type === 'object' ? 'object' : 'person',
            title: d.title || '',
            city: d.city,
            status: d.status || 'open',
            createdAt: d.createdAt ?? null,
          };
        });
        setReports(data);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error loading reports', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const renderItem = ({ item }: { item: Report }) => {
    const isPerson = item.type === 'person';
    const iconName = isPerson ? 'person-circle-outline' : 'briefcase-outline';
    const statusLabel = item.status === 'resolved' ? 'Résolu' : 'En cours';
    const statusColor = item.status === 'resolved' ? '#16a34a' : '#f59e0b';
    const typeGradient: [string, string] = isPerson
      ? ['#3b82f6', '#1d4ed8']
      : ['#64748b', '#334155'];

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: '/report-detail', params: { id: item.id } })}
      >
        {/* Bande colorée à gauche */}
        <LinearGradient
          colors={typeGradient}
          style={styles.cardAccent}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.typeBadge}>
              <View style={[styles.iconCircle, { backgroundColor: isPerson ? '#dbeafe' : '#f1f5f9' }]}>
                <Ionicons name={iconName} size={20} color={isPerson ? '#1d4ed8' : '#475569'} />
              </View>
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
            <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header avec dégradé */}
      <LinearGradient
        colors={['#0f172a', '#1e3a5f', '#0f172a']}
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
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
            onPress={() => setFilterType('all')}
          >
            <Ionicons
              name="grid-outline"
              size={14}
              color={filterType === 'all' ? '#ffffff' : '#64748b'}
            />
            <ThemedText style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
              Tout
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'person' && styles.filterChipActive]}
            onPress={() => setFilterType('person')}
          >
            <Ionicons
              name="person-outline"
              size={14}
              color={filterType === 'person' ? '#ffffff' : '#64748b'}
            />
            <ThemedText style={[styles.filterText, filterType === 'person' && styles.filterTextActive]}>
              Personnes
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'object' && styles.filterChipActive]}
            onPress={() => setFilterType('object')}
          >
            <Ionicons
              name="briefcase-outline"
              size={14}
              color={filterType === 'object' ? '#ffffff' : '#64748b'}
            />
            <ThemedText style={[styles.filterText, filterType === 'object' && styles.filterTextActive]}>
              Objets
            </ThemedText>
          </TouchableOpacity>
        </View>

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
            contentContainerStyle={styles.listContent}
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
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
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
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardAccent: {
    width: 5,
  },
  cardContent: {
    flex: 1,
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
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
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
