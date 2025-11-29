import { useEffect, useState } from 'react';
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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { auth, db } from '@/config/firebaseConfig';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

export default function ChatScreen() {
  const { reportId } = useLocalSearchParams<{ reportId?: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'reports', reportId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: ChatMessage[] = snapshot.docs.map((doc) => {
          const d = doc.data() as any;
          return {
            id: doc.id,
            text: d.text || '',
            senderId: d.senderId || '',
            createdAt: d.createdAt ?? null,
          };
        });
        setMessages(data);
        setLoading(false);
      },
      (error) => {
        console.error('Chat listen error', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [reportId]);

  const handleSend = async () => {
    if (!text.trim() || !reportId) return;
    const user = auth.currentUser;
    if (!user) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'reports', reportId, 'messages'), {
        text: text.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });
      setText('');
    } catch (e) {
      console.error('Send message error', e);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === auth.currentUser?.uid;
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        {!isMe && (
          <Ionicons name="person-circle-outline" size={22} color="#64748b" />
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <ThemedText style={styles.bubbleText}>{item.text}</ThemedText>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Ionicons
            name="arrow-back"
            size={24}
            onPress={() => router.back()}
            style={styles.backIcon}
          />
          <ThemedText type="title" style={styles.title}>
            Chat sécurisé
          </ThemedText>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <ThemedText style={styles.helper}>Chargement des messages…</ThemedText>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.messagesList}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Écrire un message…"
            value={text}
            onChangeText={setText}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={sending || !text.trim()}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="send" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backIcon: {
    marginRight: 8,
  },
  title: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  helper: {
    fontSize: 13,
  },
  messagesList: {
    paddingVertical: 8,
    gap: 4,
  },
  messageRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  bubbleMe: {
    backgroundColor: '#1d4ed8',
  },
  bubbleOther: {
    backgroundColor: '#e5e7eb',
  },
  bubbleText: {
    color: '#0f172a',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
