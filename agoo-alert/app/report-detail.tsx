import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { db } from '@/config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

type ReportDetail = {
  id: string;
  type: 'person' | 'object';
  title: string;
  description?: string;
  city?: string;
  locationDetail?: string;
  contactPhone?: string;
  status?: string;
};

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Alerte introuvable.');
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, 'reports', id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError('Cette alerte n\'existe plus.');
        } else {
          const d = snap.data() as any;
          setReport({
            id: snap.id,
            type: d.type === 'object' ? 'object' : 'person',
            title: d.title || '',
            description: d.description,
            city: d.city,
            locationDetail: d.locationDetail,
            contactPhone: d.contactPhone,
            status: d.status || 'open',
          });
        }
      } catch (e) {
        console.error('Error loading report detail', e);
        setError('Impossible de charger cette alerte.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const isPerson = report?.type === 'person';
  const statusLabel = report?.status === 'resolved' ? 'Résolu' : 'En cours';
  const statusColor = report?.status === 'resolved' ? '#16a34a' : '#f59e0b';
  const typeGradient: [string, string] = isPerson
    ? ['#3b82f6', '#1d4ed8']
    : ['#64748b', '#334155'];

  const handleCall = () => {
    if (report?.contactPhone) {
      Linking.openURL(`tel:${report.contactPhone}`);
    }
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
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Détail de l'alerte</ThemedText>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <ThemedText style={styles.loadingText}>Chargement de l'alerte…</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.errorCircle}>
            <Ionicons name="warning-outline" size={40} color="#ef4444" />
          </View>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <ThemedText style={styles.retryText}>Retour</ThemedText>
          </TouchableOpacity>
        </View>
      ) : report ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Carte principale */}
          <View style={styles.mainCard}>
            {/* Badge type avec accent */}
            <View style={styles.typeHeader}>
              <LinearGradient
                colors={typeGradient}
                style={styles.typeIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={isPerson ? 'person' : 'briefcase'}
                  size={24}
                  color="#ffffff"
                />
              </LinearGradient>
              <View style={styles.typeInfo}>
                <ThemedText style={styles.typeLabel}>
                  {isPerson ? 'Personne disparue' : 'Objet perdu'}
                </ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <View style={styles.statusDot} />
                  <ThemedText style={styles.statusText}>{statusLabel}</ThemedText>
                </View>
              </View>
            </View>

            {/* Titre */}
            <ThemedText style={styles.mainTitle}>{report.title}</ThemedText>

            {/* Localisation */}
            {(report.city || report.locationDetail) && (
              <View style={styles.infoCard}>
                <View style={styles.infoIconCircle}>
                  <Ionicons name="location" size={18} color="#3b82f6" />
                </View>
                <View style={styles.infoContent}>
                  <ThemedText style={styles.infoLabel}>Localisation</ThemedText>
                  {report.city && (
                    <ThemedText style={styles.infoText}>{report.city}</ThemedText>
                  )}
                  {report.locationDetail && (
                    <ThemedText style={styles.infoSubtext}>{report.locationDetail}</ThemedText>
                  )}
                </View>
              </View>
            )}

            {/* Description */}
            {report.description && (
              <View style={styles.descriptionCard}>
                <View style={styles.descriptionHeader}>
                  <Ionicons name="document-text-outline" size={18} color="#64748b" />
                  <ThemedText style={styles.descriptionLabel}>Description</ThemedText>
                </View>
                <ThemedText style={styles.descriptionText}>{report.description}</ThemedText>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsCard}>
            <ThemedText style={styles.actionsTitle}>Actions</ThemedText>

            {/* Appeler */}
            {report.contactPhone && (
              <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="call" size={20} color="#16a34a" />
                </View>
                <View style={styles.actionContent}>
                  <ThemedText style={styles.actionLabel}>Appeler</ThemedText>
                  <ThemedText style={styles.actionValue}>{report.contactPhone}</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* Chat */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push({ pathname: '/chat', params: { reportId: report.id } })}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="chatbubbles" size={20} color="#3b82f6" />
              </View>
              <View style={styles.actionContent}>
                <ThemedText style={styles.actionLabel}>Chat sécurisé</ThemedText>
                <ThemedText style={styles.actionValue}>Échanger avec le déclarant</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Message de sécurité */}
          <View style={styles.securityCard}>
            <LinearGradient
              colors={['#fef3c7', '#fde68a']}
              style={styles.securityGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.securityIconCircle}>
                <Ionicons name="shield-checkmark" size={20} color="#d97706" />
              </View>
              <View style={styles.securityContent}>
                <ThemedText style={styles.securityTitle}>Conseils de sécurité</ThemedText>
                <ThemedText style={styles.securityText}>
                  Pour tout rendez-vous, privilégiez les commissariats et lieux officiels 
                  recommandés par les autorités.
                </ThemedText>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      ) : null}
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
    paddingBottom: 20,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  errorCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#3b82f6',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  typeIconGradient: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: {
    flex: 1,
    gap: 6,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 28,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    marginBottom: 12,
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoSubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  descriptionCard: {
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  descriptionText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  actionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  actionValue: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  securityCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  securityGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  securityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 13,
    color: '#a16207',
    lineHeight: 18,
  },
});
