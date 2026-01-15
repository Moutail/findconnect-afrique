import { useEffect, useMemo, useState } from 'react';
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
import { auth, db, storage } from '@/config/firebaseConfig';
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
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';

type ChatMessage = {
  id: string;
  type: 'text' | 'image' | 'audio';
  text?: string;
  mediaUrl?: string;
  durationMs?: number;
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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingAudioUri, setPendingAudioUri] = useState<string | null>(null);
  const [pendingAudioDurationMs, setPendingAudioDurationMs] = useState<number | undefined>(undefined);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [activeSound, setActiveSound] = useState<Audio.Sound | null>(null);
  const [playbackPositionMs, setPlaybackPositionMs] = useState<number>(0);
  const [playbackDurationMs, setPlaybackDurationMs] = useState<number | undefined>(undefined);

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
              type: data.type === 'image' || data.type === 'audio' ? data.type : 'text',
              text: data.text || '',
              mediaUrl: data.mediaUrl,
              durationMs: typeof data.durationMs === 'number' ? data.durationMs : undefined,
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

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => undefined);
      }
      if (previewSound) {
        previewSound.unloadAsync().catch(() => undefined);
      }
      if (activeSound) {
        activeSound.unloadAsync().catch(() => undefined);
      }
    };
  }, [recording, previewSound, activeSound]);

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

  const uploadFileToStorage = async (uri: string, path: string, contentType: string): Promise<string> => {
    console.log('uploadFileToStorage (base64)', { uri, path, contentType });
    
    // Lire le fichier en base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    
    console.log('Base64 read success, length:', base64.length);
    
    if (!base64 || base64.length === 0) {
      throw new Error('File is empty');
    }
    
    const objectRef = ref(storage, path);
    
    // Upload en base64
    await uploadString(objectRef, base64, 'base64', { contentType });
    
    const downloadURL = await getDownloadURL(objectRef);
    console.log('Upload complete, URL:', downloadURL);
    return downloadURL;
  };

  const handlePickImage = async () => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (!uri) return;
    setPendingImageUri(uri);
  };

  const handleSendPendingImage = async () => {
    if (!id || !pendingImageUri) return;
    const user = auth.currentUser;
    if (!user) return;

    setSending(true);
    try {
      const mediaUrl = await uploadFileToStorage(
        pendingImageUri,
        `conversations/${id}/messages/${user.uid}/image_${Date.now()}.jpg`,
        'image/jpeg'
      );

      await addDoc(collection(db, 'conversations', id, 'messages'), {
        type: 'image',
        mediaUrl,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'conversations', id), {
        lastMessageText: '📷 Photo',
        lastMessageAt: serverTimestamp(),
      });

      setPendingImageUri(null);
    } catch (e) {
      console.error('Send image error', e);
      Alert.alert('Erreur', "Impossible d'envoyer l'image pour le moment.");
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
    } catch (e) {
      console.error('Start recording error', e);
      setRecording(null);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
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
      console.error('Stop recording error', e);
      setRecording(null);
    }
  };

  const toggleRecording = async () => {
    if (recording) return stopRecording();
    return startRecording();
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

  const handleSendPendingAudio = async () => {
    if (!id || !pendingAudioUri) return;
    const user = auth.currentUser;
    if (!user) return;

    setSending(true);
    try {
      const mediaUrl = await uploadFileToStorage(
        pendingAudioUri,
        `conversations/${id}/messages/${user.uid}/audio_${Date.now()}.m4a`,
        'audio/mp4'
      );

      await addDoc(collection(db, 'conversations', id, 'messages'), {
        type: 'audio',
        mediaUrl,
        durationMs: pendingAudioDurationMs,
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'conversations', id), {
        lastMessageText: '🎤 Audio',
        lastMessageAt: serverTimestamp(),
      });

      setPendingAudioUri(null);
      setPendingAudioDurationMs(undefined);
    } catch (e) {
      const err: any = e;
      console.error('Send audio error', err);
      try {
        console.error('Send audio error details', {
          code: err?.code,
          message: err?.message,
          name: err?.name,
          serverResponse: err?.serverResponse ?? err?.customData?.serverResponse,
          customData: err?.customData,
        });
      } catch {
        // ignore
      }
      Alert.alert('Erreur', "Impossible d'envoyer l'audio pour le moment.");
    } finally {
      setSending(false);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms || ms <= 0) return 'Audio';
    const sec = Math.round(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatTime = (ms?: number) => {
    if (!ms || ms < 0) return '0:00';
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const playAudio = async (msgId: string, url?: string) => {
    if (!url) return;
    try {
      if (activeSound) {
        await activeSound.unloadAsync().catch(() => undefined);
        setActiveSound(null);
      }
      setPlayingId(msgId);
      setPlaybackPositionMs(0);
      setPlaybackDurationMs(undefined);
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      setActiveSound(sound);
      sound.setOnPlaybackStatusUpdate((st: any) => {
        if (!st?.isLoaded) return;

        const pos = typeof st.positionMillis === 'number' ? st.positionMillis : 0;
        const dur = typeof st.durationMillis === 'number' ? st.durationMillis : undefined;
        setPlaybackPositionMs(pos);
        setPlaybackDurationMs(dur);

        if (st.didJustFinish) {
          setPlayingId(null);
          setPlaybackPositionMs(0);
          setPlaybackDurationMs(undefined);
          sound.unloadAsync().catch(() => undefined);
          setActiveSound(null);
        }
      });
    } catch (e) {
      console.error('Play audio error', e);
      setPlayingId(null);
      setPlaybackPositionMs(0);
      setPlaybackDurationMs(undefined);
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(0, insets.top + 64) : 0}
    >
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
        contentContainerStyle={{
          padding: 14,
          paddingBottom: 14,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => {
          const isMe = item.senderId === auth.currentUser?.uid;
          return (
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
              {item.type === 'image' && item.mediaUrl ? (
                <ExpoImage source={{ uri: item.mediaUrl }} style={styles.bubbleImage} contentFit="cover" transition={150} />
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
                    {playingId === item.id
                      ? `${formatTime(playbackPositionMs)} / ${formatTime(playbackDurationMs ?? item.durationMs)}`
                      : formatDuration(item.durationMs)}
                  </ThemedText>
                </TouchableOpacity>
              ) : (
                <ThemedText style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                  {item.text}
                </ThemedText>
              )}
            </View>
          );
        }}
      />

      {pendingImageUri || pendingAudioUri ? (
        <View style={styles.pendingWrap}>
          {pendingImageUri ? (
            <>
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
            </>
          ) : (
            <View style={styles.pendingAudioRow}>
              <TouchableOpacity style={styles.pendingAudioPlay} onPress={playPendingAudio} activeOpacity={0.85}>
                <Ionicons name="play" size={18} color={Colors.light.togoGreen} />
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
          )}
        </View>
      ) : null}

      <View style={[styles.composer, { paddingBottom: Math.max(12, insets.bottom + 12) }]}>
        <TouchableOpacity
          style={[styles.mediaBtn, (!!pendingImageUri || !!pendingAudioUri) && styles.mediaBtnActive]}
          onPress={handlePickImage}
          disabled={sending || !!recording || !!pendingAudioUri || !!pendingImageUri}
          activeOpacity={0.85}
        >
          <Ionicons
            name="image-outline"
            size={20}
            color={sending || recording ? '#94a3b8' : !!pendingImageUri || !!pendingAudioUri ? '#ffffff' : Colors.light.togoGreen}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mediaBtn, recording && styles.mediaBtnActive]}
          onPress={toggleRecording}
          disabled={sending || !!pendingAudioUri || !!pendingImageUri}
          activeOpacity={0.85}
        >
          <Ionicons
            name={recording ? 'stop-circle-outline' : 'mic-outline'}
            size={20}
            color={recording ? '#ffffff' : sending ? '#94a3b8' : Colors.light.togoGreen}
          />
        </TouchableOpacity>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Écrire un message…"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          editable={!sending && !recording && !pendingAudioUri && !pendingImageUri}
        />
        <TouchableOpacity
          onPress={send}
          disabled={sending || !!recording || !!pendingAudioUri || !!pendingImageUri || !text.trim()}
          style={styles.sendBtn}
        >
          {sending ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="send" size={18} color="#ffffff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  bubbleImage: { width: 240, height: 180, borderRadius: 14 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  audioText: { fontSize: 14, fontWeight: '600' },
  composer: {
    backgroundColor: 'rgba(248,250,252,0.98)',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  mediaBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBtnActive: {
    backgroundColor: Colors.light.togoGreen,
    borderColor: Colors.light.togoGreen,
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
  pendingWrap: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  pendingImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
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
    backgroundColor: Colors.light.togoGreen,
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
    backgroundColor: 'rgba(0, 106, 78, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 78, 0.22)',
  },
  pendingAudioText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.togoGreen,
  },
});
