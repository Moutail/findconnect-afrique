import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { auth, db } from '@/config/firebaseConfig';
import { collectionGroup, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { Colors } from '@/constants/theme';

type RequestRow = {
  id: string;
  reportId: string;
  requesterId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

export default function ChatRequestsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [mode, setMode] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // On lit via collectionGroup: reports/*/chatRequests where ownerId == uid
    const q = query(collectionGroup(db, 'chatRequests'), where('ownerId', '==', user.uid));

    return onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              reportId: data.reportId || '',
              requesterId: data.requesterId || '',
              status: data.status === 'accepted' || data.status === 'rejected' ? data.status : 'pending',
              createdAt: data.createdAt ?? null,
            } as RequestRow;
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
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
                  <ThemedText style={styles.meta}>Demandeur: {item.requesterId}</ThemedText>
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
