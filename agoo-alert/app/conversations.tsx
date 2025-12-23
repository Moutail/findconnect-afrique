import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { auth, db } from '@/config/firebaseConfig';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { Colors } from '@/constants/theme';
import { onAuthStateChanged } from 'firebase/auth';

type ConversationRow = {
  id: string;
  reportId: string;
  ownerId: string;
  contactId: string;
  participants: string[];
  lastMessageText?: string;
  lastMessageAt?: { seconds: number; nanoseconds: number } | null;
};

export default function ConversationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
    });
  }, []);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setRows([]);
      return;
    }

    setLoading(true);

    const mapSnap = (snap: any) => {
      setRows(
        snap.docs.map((d: any) => {
          const data = d.data() as any;
          return {
            id: d.id,
            reportId: data.reportId || '',
            ownerId: data.ownerId || '',
            contactId: data.contactId || '',
            participants: Array.isArray(data.participants) ? data.participants : [],
            lastMessageText: data.lastMessageText,
            lastMessageAt: data.lastMessageAt ?? null,
          } as ConversationRow;
        })
      );
      setLoading(false);
    };

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc')
    );

    const qNoOrder = query(collection(db, 'conversations'), where('participants', 'array-contains', uid));

    const unsubPrimary = onSnapshot(
      q,
      (snap) => {
        setError(null);
        mapSnap(snap);
      },
      (e) => {
        console.error('Error loading conversations', e);
        setError((e as any)?.message ?? 'Impossible de charger les conversations.');
        setLoading(true);

        const unsubFallback = onSnapshot(
          qNoOrder,
          (snap) => {
            mapSnap(snap);
          },
          (e2) => {
            console.error('Fallback error loading conversations', e2);
            setError(((e2 as any)?.message ?? 'Impossible de charger les conversations.') + '\n' + ((e as any)?.message ?? ''));
            setLoading(false);
          }
        );

        return () => unsubFallback();
      }
    );

    return () => unsubPrimary();
  }, [uid]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const as = a.lastMessageAt?.seconds ?? 0;
      const bs = b.lastMessageAt?.seconds ?? 0;
      return bs - as;
    });
  }, [rows]);

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
      <View style={styles.header}>
        <ThemedText style={styles.title}>Messages</ThemedText>
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
      </View>

      {sorted.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.muted}>Aucune conversation.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 120 }}
          renderItem={({ item }) => {
            const user = auth.currentUser;
            const otherId = item.ownerId === user?.uid ? item.contactId : item.ownerId;
            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/conversation' as any, params: { id: item.id } })}
              >
                <View style={styles.avatar}>
                  <Ionicons name="chatbubbles" size={18} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.rowTitle}>Conversation</ThemedText>
                  <ThemedText style={styles.rowSub} numberOfLines={1}>
                    {item.lastMessageText || '—'}
                  </ThemedText>
                  <ThemedText style={styles.rowMeta} numberOfLines={1}>
                    Report: {item.reportId} • Avec: {otherId}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  muted: { opacity: 0.7 },
  errorText: { marginTop: 6, color: '#991b1b', fontSize: 12, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  row: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.togoGreen,
  },
  rowTitle: { fontWeight: '800' },
  rowSub: { marginTop: 2, opacity: 0.75 },
  rowMeta: { marginTop: 2, fontSize: 12, opacity: 0.6 },
});
