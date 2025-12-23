import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { auth, db } from '@/config/firebaseConfig';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Colors } from '@/constants/theme';

type ChatMessage = {
  id: string;
  type: 'text';
  text: string;
  senderId: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

type Conversation = {
  id: string;
  reportId: string;
  ownerId: string;
  contactId: string;
  participants: string[];
};

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const convRef = doc(db, 'conversations', id);
    const unsubConv = onSnapshot(
      convRef,
      (snap) => {
        if (!snap.exists()) {
          setConversation(null);
        } else {
          const d = snap.data() as any;
          setConversation({
            id: snap.id,
            reportId: d.reportId || '',
            ownerId: d.ownerId || '',
            contactId: d.contactId || '',
            participants: Array.isArray(d.participants) ? d.participants : [],
          });
        }
        setLoading(false);
      },
      () => setLoading(false)
    );

    const q = query(collection(db, 'conversations', id, 'messages'), orderBy('createdAt', 'asc'));
    const unsubMsg = onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              type: 'text',
              text: data.text || '',
              senderId: data.senderId || '',
              createdAt: data.createdAt ?? null,
            } as ChatMessage;
          })
        );
      },
      () => undefined
    );

    return () => {
      unsubConv();
      unsubMsg();
    };
  }, [id]);

  const sorted = useMemo(() => {
    return [...messages].sort((a, b) => {
      const as = a.createdAt?.seconds ?? 0;
      const bs = b.createdAt?.seconds ?? 0;
      return as - bs;
    });
  }, [messages]);

  const send = async () => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;
    if (!text.trim()) return;

    setSending(true);
    try {
      const clean = text.trim();
      setText('');

      await addDoc(collection(db, 'conversations', id, 'messages'), {
        type: 'text',
        text: clean,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'conversations', id), {
        lastMessageText: clean,
        lastMessageAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
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

  if (!conversation) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.muted}>Conversation introuvable.</ThemedText>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ThemedText style={styles.backText}>Retour</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.topTitle}>Conversation</ThemedText>
          <ThemedText style={styles.topSub} numberOfLines={1}>
            Report: {conversation.reportId}
          </ThemedText>
        </View>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 140 }}
        renderItem={({ item }) => {
          const isMe = item.senderId === auth.currentUser?.uid;
          return (
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
              <ThemedText style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                {item.text}
              </ThemedText>
            </View>
          );
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Math.max(0, insets.bottom + 10)}
        style={styles.composerWrap}
      >
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Écrire un message…"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
          <TouchableOpacity onPress={send} disabled={sending} style={styles.sendBtn}>
            <Ionicons name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  muted: { opacity: 0.7 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 18 },
  backBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  backText: { fontWeight: '700' },
  topbar: {
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: Colors.light.togoGreen,
  },
  backIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  topSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.light.togoGreen,
    borderColor: Colors.light.togoGreen,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  bubbleText: { fontSize: 15 },
  bubbleTextMe: { color: '#ffffff' },
  bubbleTextOther: { color: '#0f172a' },
  composerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  composer: {
    backgroundColor: 'rgba(248,250,252,0.98)',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.light.togoGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
