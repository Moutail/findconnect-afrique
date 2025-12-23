import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { Audio } from 'expo-av';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { auth, db, storage } from '@/config/firebaseConfig';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

type ChatMessage = {
  id: string;
  type: 'text' | 'image' | 'audio';
  text?: string;
  mediaUrl?: string;
  durationMs?: number;
  senderId: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

export default function ChatScreen() {
  const { reportId } = useLocalSearchParams<{ reportId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingAudioUri, setPendingAudioUri] = useState<string | null>(null);
  const [pendingAudioDurationMs, setPendingAudioDurationMs] = useState<number | undefined>(undefined);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);

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
            type: d.type === 'image' || d.type === 'audio' ? d.type : 'text',
            text: d.text || '',
            mediaUrl: d.mediaUrl,
            durationMs: typeof d.durationMs === 'number' ? d.durationMs : undefined,
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

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => undefined);
      }
      if (previewSound) {
        previewSound.unloadAsync().catch(() => undefined);
      }
    };
  }, [recording, previewSound]);

  const uploadBlobToStorage = async (blob: Blob, path: string, contentType: string) => {
    const objectRef = ref(storage, path);
    await uploadBytes(objectRef, blob, { contentType });
    return await getDownloadURL(objectRef);
  };

  const uriToBlobAsync = (uri: string) => {
    return new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        resolve(xhr.response as Blob);
      };
      xhr.onerror = () => {
        reject(new Error('Failed to read file as blob'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  };

  const handleSendText = async () => {
    if (!text.trim() || !reportId) return;
    const user = auth.currentUser;
    if (!user) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'reports', reportId, 'messages'), {
        type: 'text',
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

  const playPendingAudio = async () => {
    if (!pendingAudioUri) return;
    try {
      if (previewSound) {
        await previewSound.unloadAsync().catch(() => undefined);
        setPreviewSound(null);
      }
      const { sound } = await Audio.Sound.createAsync({ uri: pendingAudioUri }, { shouldPlay: true });
      setPreviewSound(sound);
    } catch (e) {
      console.error('Play pending audio error', e);
    }
  };

  const deleteMessage = async (item: ChatMessage) => {
    if (!reportId) return;
    const user = auth.currentUser;
    if (!user) return;
    if (item.senderId !== user.uid) return;

    setSending(true);
    try {
      if (item.mediaUrl) {
        try {
          const objRef = ref(storage, item.mediaUrl);
          await deleteObject(objRef);
        } catch {
          // ignore (best-effort)
        }
      }

      await deleteDoc(doc(db, 'reports', reportId, 'messages', item.id));
    } catch (e) {
      console.error('Delete message error', e);
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = (item: ChatMessage) => {
    const isMe = item.senderId === auth.currentUser?.uid;
    if (!isMe) return;

    Alert.alert('Supprimer', 'Supprimer ce message ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMessage(item) },
    ]);
  };

  const handlePickImage = async () => {
    if (!reportId) return;
    const user = auth.currentUser;
    if (!user) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (!uri) return;

    setPendingImageUri(uri);
  };

  const handleSendPendingImage = async () => {
    if (!reportId || !pendingImageUri) return;
    const user = auth.currentUser;
    if (!user) return;

    setSending(true);
    try {
      const blob = await uriToBlobAsync(pendingImageUri);
      const mediaUrl = await uploadBlobToStorage(
        blob,
        `reports/${reportId}/messages/${user.uid}/image_${Date.now()}.jpg`,
        'image/jpeg'
      );

      await addDoc(collection(db, 'reports', reportId, 'messages'), {
        type: 'image',
        mediaUrl,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      setPendingImageUri(null);
    } catch (e) {
      console.error('Send image error', e);
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (!reportId) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
    } catch (e) {
      console.error('Start recording error', e);
      setRecording(null);
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recording || !reportId) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) return;

      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
      const st = await sound.getStatusAsync();
      const durationMs = (st as any)?.isLoaded ? (st as any)?.durationMillis : undefined;
      await sound.unloadAsync().catch(() => undefined);

      setPendingAudioUri(uri);
      setPendingAudioDurationMs(typeof durationMs === 'number' ? durationMs : undefined);
    } catch (e) {
      console.error('Stop recording/send error', e);
      try {
        console.error('Stop recording/send error details', JSON.stringify(e));
      } catch {
        // ignore
      }
      setRecording(null);
    }
  };

  const handleSendPendingAudio = async () => {
    if (!reportId || !pendingAudioUri) return;
    const user = auth.currentUser;
    if (!user) return;

    setSending(true);
    try {
      const blob = await uriToBlobAsync(pendingAudioUri);
      const mediaUrl = await uploadBlobToStorage(
        blob,
        `reports/${reportId}/messages/${user.uid}/audio_${Date.now()}.m4a`,
        'audio/mp4'
      );

      await addDoc(collection(db, 'reports', reportId, 'messages'), {
        type: 'audio',
        mediaUrl,
        durationMs: pendingAudioDurationMs,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      setPendingAudioUri(null);
      setPendingAudioDurationMs(undefined);
    } catch (e) {
      console.error('Send audio error', e);
    } finally {
      setSending(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      await stopRecordingAndSend();
    } else {
      await startRecording();
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms || ms <= 0) return 'Audio';
    const sec = Math.round(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const playAudio = async (id: string, url?: string) => {
    if (!url) return;
    try {
      setPlayingId(id);
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate((st: any) => {
        const done = st?.didJustFinish;
        if (done) {
          setPlayingId(null);
          sound.unloadAsync().catch(() => undefined);
        }
      });
    } catch (e) {
      console.error('Play audio error', e);
      setPlayingId(null);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === auth.currentUser?.uid;
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        {!isMe && (
          <Ionicons name="person-circle-outline" size={22} color="#64748b" />
        )}
        <TouchableOpacity
          activeOpacity={0.95}
          onLongPress={() => confirmDelete(item)}
          delayLongPress={450}
          style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
        >
          {item.type === 'image' && item.mediaUrl ? (
            <ExpoImage
              source={{ uri: item.mediaUrl }}
              style={styles.bubbleImage}
              contentFit="cover"
              transition={150}
            />
          ) : item.type === 'audio' ? (
            <TouchableOpacity
              style={styles.audioRow}
              onPress={() => playAudio(item.id, item.mediaUrl)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={playingId === item.id ? 'pause' : 'play'}
                size={18}
                color={isMe ? '#ffffff' : '#0f172a'}
              />
              <ThemedText style={[styles.audioText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                {formatDuration(item.durationMs)}
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <ThemedText style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
              {item.text}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Math.max(0, insets.top + 44)}
    >
      <ThemedView style={[styles.container, { paddingTop: insets.top + 6 }]}>
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

        {pendingImageUri ? (
          <View style={styles.pendingWrap}>
            <ExpoImage source={{ uri: pendingImageUri }} style={styles.pendingImage} contentFit="cover" />
            <View style={styles.pendingActions}>
              <TouchableOpacity
                style={[styles.pendingButton, styles.pendingCancel]}
                onPress={() => setPendingImageUri(null)}
                activeOpacity={0.85}
                disabled={sending}
              >
                <ThemedText style={styles.pendingCancelText}>Annuler</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pendingButton, styles.pendingSend]}
                onPress={handleSendPendingImage}
                activeOpacity={0.85}
                disabled={sending}
              >
                <ThemedText style={styles.pendingSendText}>Envoyer</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ) : pendingAudioUri ? (
          <View style={styles.pendingWrap}>
            <View style={styles.pendingAudioRow}>
              <TouchableOpacity
                style={styles.pendingAudioPlay}
                onPress={playPendingAudio}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={18} color="#1d4ed8" />
                <ThemedText style={styles.pendingAudioText}>{formatDuration(pendingAudioDurationMs)}</ThemedText>
              </TouchableOpacity>
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={[styles.pendingButton, styles.pendingCancel]}
                  onPress={() => {
                    setPendingAudioUri(null);
                    setPendingAudioDurationMs(undefined);
                  }}
                  activeOpacity={0.85}
                  disabled={sending}
                >
                  <ThemedText style={styles.pendingCancelText}>Annuler</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pendingButton, styles.pendingSend]}
                  onPress={handleSendPendingAudio}
                  activeOpacity={0.85}
                  disabled={sending}
                >
                  <ThemedText style={styles.pendingSendText}>Envoyer</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        <View style={[styles.inputRow, { paddingBottom: Math.max(10, insets.bottom + 10) }]}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={handlePickImage}
            disabled={sending || !!recording || !!pendingAudioUri || !!pendingImageUri}
            activeOpacity={0.85}
          >
            <Ionicons name="image-outline" size={20} color={sending || recording ? '#94a3b8' : '#1d4ed8'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mediaButton, recording && styles.mediaButtonActive]}
            onPress={toggleRecording}
            disabled={sending || !!pendingAudioUri || !!pendingImageUri}
            activeOpacity={0.85}
          >
            <Ionicons
              name={recording ? 'stop-circle-outline' : 'mic-outline'}
              size={20}
              color={recording ? '#ffffff' : sending ? '#94a3b8' : '#1d4ed8'}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Écrire un message…"
            value={text}
            onChangeText={setText}
            editable={!sending && !recording && !pendingAudioUri && !pendingImageUri}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendText}
            disabled={sending || !!recording || !!pendingAudioUri || !!pendingImageUri || !text.trim()}
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
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: '#ffffff',
  },
  bubbleTextOther: {
    color: '#0f172a',
  },
  bubbleImage: {
    width: 220,
    height: 180,
    borderRadius: 12,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  audioText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  mediaButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  mediaButtonActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  pendingWrap: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
  },
  pendingImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  pendingAudioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pendingAudioPlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  pendingAudioText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  pendingButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pendingCancel: {
    backgroundColor: '#f1f5f9',
  },
  pendingSend: {
    backgroundColor: '#1d4ed8',
  },
  pendingCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  pendingSendText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  input: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#ffffff',
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
