import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { auth, db } from '@/config/firebaseConfig';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { Colors } from '@/constants/theme';

type RequestRow = {
  id: string;
  reportId: string;
  requesterId: string;
  requesterDisplayName?: string | null;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

export default function ChatRequestsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [mode, setMode] = useState<'pending' | 'all'>('pending');
  const [profilesByUid, setProfilesByUid] = useState<Record<string, { displayName?: string | null; pseudonym?: string | null; phone?: string | null; email?: string | null }>>({});

  useEffect(() => {
    let cancelled = false;

    const missing = Array.from(
      new Set(
        rows
          .filter((r) => !r.requesterDisplayName && !r.requesterEmail && !r.requesterPhone)
          .map((r) => r.requesterId)
          .filter(Boolean)
      )
    ).filter((uid) => !profilesByUid[uid]);

    if (missing.length === 0) return;

    (async () => {
      const updates: Record<string, any> = {};
      for (const uid of missing) {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          updates[uid] = snap.exists() ? (snap.data() as any) : null;
        } catch {
          updates[uid] = null;
        }
      }
      if (cancelled) return;
      setProfilesByUid((prev) => ({ ...prev, ...updates }));
    })();

    return () => {
      cancelled = true;
    };
  }, [rows, profilesByUid]);

  useEffect(() => {
    const user = auth.currentUser;
    console.log('CHAT-REQUESTS CURRENT UID =', user?.uid);
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Variante sans collectionGroup (plus fiable côté règles):
    // 1) charger les reports de l'utilisateur
    // 2) écouter reports/{reportId}/chatRequests pour chaque report
    const unsubRequestsByReport = new Map<string, () => void>();

    const reportsQuery = query(collection(db, 'reports'), where('createdBy', '==', user.uid));

    const unsubReports = onSnapshot(
      reportsQuery,
      (reportsSnap) => {
        const reportIds = reportsSnap.docs.map((d) => d.id);

        // cleanup listeners for removed reports
        for (const [rid, unsub] of unsubRequestsByReport.entries()) {
          if (!reportIds.includes(rid)) {
            unsub();
            unsubRequestsByReport.delete(rid);
          }
        }

        // (re)subscribe to each report chatRequests
        for (const rid of reportIds) {
          if (unsubRequestsByReport.has(rid)) continue;

          const rq = query(collection(db, 'reports', rid, 'chatRequests'));
          const unsubReq = onSnapshot(
            rq,
            () => {
              const allRows: RequestRow[] = [];

              // rebuild from all active report listeners
              for (const activeRid of reportIds) {
                // no-op: we'll fill rows in per-listener below
              }

              // Since we can't read other listeners' snapshots here, we keep per-report cache
            },
            (error) => {
              console.error('CHAT-REQUESTS SNAP ERROR =', error);
              setLoading(false);
            }
          );

          unsubRequestsByReport.set(rid, unsubReq);
        }

        setLoading(false);
      },
      (error) => {
        console.error('CHAT-REQUESTS SNAP ERROR =', error);
        setLoading(false);
      }
    );

    // Cache: reportId -> rows
    const cache = new Map<string, RequestRow[]>();

    // Patch listeners to fill cache and compute rows
    const resubscribeAll = (reportIds: string[]) => {
      for (const rid of reportIds) {
        const existing = unsubRequestsByReport.get(rid);
        if (existing) continue;

        const rq = query(collection(db, 'reports', rid, 'chatRequests'));
        const unsubReq = onSnapshot(
          rq,
          (reqSnap) => {
            cache.set(
              rid,
              reqSnap.docs.map((d) => {
                const data = d.data() as any;
                return {
                  id: d.id,
                  reportId: rid,
                  requesterId: data.requesterId || d.id,
                  requesterDisplayName: data.requesterDisplayName ?? null,
                  requesterEmail: data.requesterEmail ?? null,
                  requesterPhone: data.requesterPhone ?? null,
                  status: data.status === 'accepted' || data.status === 'rejected' ? data.status : 'pending',
                  createdAt: data.createdAt ?? null,
                } as RequestRow;
              })
            );

            const merged = Array.from(cache.values()).flat();
            console.log('CHAT-REQUESTS SNAP COUNT =', merged.length);
            setRows(merged);
            setLoading(false);
          },
          (error) => {
            console.error('CHAT-REQUESTS SNAP ERROR =', error);
            setLoading(false);
          }
        );

        unsubRequestsByReport.set(rid, unsubReq);
      }
    };

    // Replace reports listener with one that resubscribes using cache
    unsubReports();
    const unsubReports2 = onSnapshot(
      reportsQuery,
      (reportsSnap) => {
        const reportIds = reportsSnap.docs.map((d) => d.id);

        for (const [rid, unsub] of unsubRequestsByReport.entries()) {
          if (!reportIds.includes(rid)) {
            unsub();
            unsubRequestsByReport.delete(rid);
            cache.delete(rid);
          }
        }

        resubscribeAll(reportIds);
        const merged = Array.from(cache.values()).flat();
        setRows(merged);
        setLoading(false);
      },
      (error) => {
        console.error('CHAT-REQUESTS SNAP ERROR =', error);
        setLoading(false);
      }
    );

    return () => {
      unsubReports2();
      for (const unsub of unsubRequestsByReport.values()) unsub();
      unsubRequestsByReport.clear();
      cache.clear();
    };
  }, []);

  const pending = useMemo(() => rows.filter((r) => r.status === 'pending'), [rows]);
  const history = useMemo(() => rows.filter((r) => r.status !== 'pending'), [rows]);
  const list = mode === 'pending' ? pending : history;

  const accept = async (row: RequestRow) => {
    const user = auth.currentUser;
    if (!user) return;
    if (!row.reportId) return;

    setActing(row.id);
    try {
      const requestRef = doc(db, 'reports', row.reportId, 'chatRequests', row.requesterId);
      const reqSnap = await getDoc(requestRef);
      if (!reqSnap.exists()) return;

      const conversationId = `${row.reportId}_${row.requesterId}`;
      await setDoc(
        doc(db, 'conversations', conversationId),
        {
          reportId: row.reportId,
          ownerId: user.uid,
          contactId: row.requesterId,
          participants: [user.uid, row.requesterId],
          createdAt: serverTimestamp(),
          lastMessageText: null,
          lastMessageAt: serverTimestamp(),
        },
        { merge: true }
      );

      await updateDoc(requestRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        conversationId,
      });
    } finally {
      setActing(null);
    }
  };

  const reject = async (row: RequestRow) => {
    const user = auth.currentUser;
    if (!user) return;
    if (!row.reportId) return;

    setActing(row.id);
    try {
      await updateDoc(doc(db, 'reports', row.reportId, 'chatRequests', row.requesterId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
      });
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.togoGreen} />
        <ThemedText style={styles.muted}>Chargement…</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[Colors.light.togoGreen, '#004b37']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.title}>Demandes de chat</ThemedText>
            <ThemedText style={styles.sub}>Tu peux accepter ou refuser avant de discuter.</ThemedText>
          </View>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push({ pathname: '/conversations' as any })}
          >
            <Ionicons name="chatbubbles" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'pending' && styles.segmentBtnActive]}
            onPress={() => setMode('pending')}
          >
            <ThemedText style={[styles.segmentText, mode === 'pending' && styles.segmentTextActive]}>
              En attente ({pending.length})
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'all' && styles.segmentBtnActive]}
            onPress={() => setMode('all')}
          >
            <ThemedText style={[styles.segmentText, mode === 'all' && styles.segmentTextActive]}>
              Historique ({history.length})
            </ThemedText>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {list.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name={mode === 'pending' ? 'mail-open' : 'time'} size={26} color="#ffffff" />
          </View>
          <ThemedText style={styles.emptyTitle}>
            {mode === 'pending' ? 'Aucune demande en attente' : 'Aucun historique'}
          </ThemedText>
          <ThemedText style={styles.mutedCenter}>
            {mode === 'pending'
              ? "Quand quelqu'un demandera à te contacter, tu verras la demande ici."
              : 'Les demandes acceptées ou refusées s\'afficheront ici.'}
          </ThemedText>

          <View style={styles.emptyActions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnOk]}
              onPress={() => router.push({ pathname: '/conversations' as any })}
            >
              <ThemedText style={styles.btnTextOk}>Aller aux messages</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnNo]} onPress={() => router.back()}>
              <ThemedText style={styles.btnTextNo}>Retour</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => `${i.reportId}_${i.requesterId}`}
          contentContainerStyle={{ padding: 14, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: '900' }}>
                    {item.status === 'pending' ? 'Demande' : item.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                  </ThemedText>
                  <ThemedText style={styles.meta}>Report: {item.reportId}</ThemedText>
                  <ThemedText style={styles.meta}>
                    Demandeur:{' '}
                    {item.requesterDisplayName ||
                      item.requesterEmail ||
                      item.requesterPhone ||
                      profilesByUid[item.requesterId]?.displayName ||
                      profilesByUid[item.requesterId]?.pseudonym ||
                      profilesByUid[item.requesterId]?.phone ||
                      profilesByUid[item.requesterId]?.email ||
                      item.requesterId}
                  </ThemedText>
                </View>
                <Ionicons name="chatbubbles" size={20} color={Colors.light.togoGreen} />
              </View>

              {item.status === 'pending' ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnOk]}
                    disabled={acting === item.id}
                    onPress={() => accept(item)}
                  >
                    <ThemedText style={styles.btnTextOk}>{acting === item.id ? '…' : 'Accepter'}</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnNo]}
                    disabled={acting === item.id}
                    onPress={() => reject(item)}
                  >
                    <ThemedText style={styles.btnTextNo}>{acting === item.id ? '…' : 'Refuser'}</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  sub: { marginTop: 4, color: 'rgba(255,255,255,0.85)' },
  segment: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentBtnActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  segmentText: { color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 12 },
  segmentTextActive: { color: '#ffffff' },
  muted: { opacity: 0.7 },
  mutedCenter: { opacity: 0.7, textAlign: 'center', paddingHorizontal: 18, lineHeight: 18 },
  meta: { marginTop: 2, fontSize: 12, opacity: 0.65 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 18 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.light.togoGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 6 },
  emptyActions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 10 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  btnOk: { backgroundColor: Colors.light.togoGreen, borderColor: Colors.light.togoGreen },
  btnNo: { backgroundColor: '#ffffff', borderColor: '#e2e8f0' },
  btnTextOk: { color: '#ffffff', fontWeight: '900' },
  btnTextNo: { color: '#0f172a', fontWeight: '900' },
});
