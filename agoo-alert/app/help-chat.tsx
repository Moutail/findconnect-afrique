import { useEffect, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ChatMessage, sendMessageToGroq } from '@/config/groqConfig';

type DisplayMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const WELCOME_MESSAGE: DisplayMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Bonjour ! 👋 Je suis l'assistant Agoo Alert.

Je peux vous aider à :
• Comprendre comment déclarer une personne ou objet perdu
• Utiliser le chat pour contacter un déclarant
• Naviguer dans l'application
• Répondre à vos questions sur Agoo Alert

Comment puis-je vous aider aujourd'hui ?`,
  timestamp: new Date(),
};

const QUICK_QUESTIONS = [
  'Comment déclarer un objet perdu ?',
  'Comment contacter un déclarant ?',
  'Comment voir les alertes sur la carte ?',
  'Comment fonctionne le chat ?',
];

export default function HelpChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  const scrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToEnd();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    const newHistory: ChatMessage[] = [
      ...conversationHistory,
      { role: 'user', content: text.trim() },
    ];

    try {
      const response = await sendMessageToGroq(newHistory);

      const assistantMessage: DisplayMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationHistory([
        ...newHistory,
        { role: 'assistant', content: response },
      ]);
    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage: DisplayMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Désolé, une erreur s'est produite. Réessayez.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const renderMessage = ({ item }: { item: DisplayMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.avatarBot}>
            <Ionicons name="help-buoy" size={20} color="#ffffff" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.messageBubbleUser : styles.messageBubbleBot,
          ]}
        >
          <ThemedText
            style={[
              styles.messageText,
              isUser && styles.messageTextUser,
            ]}
          >
            {item.content}
          </ThemedText>
        </View>
      </View>
    );
  };

  const showQuickQuestions = messages.length === 1 && !isLoading;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#003c2c', Colors.light.togoGreen, Colors.light.togoYellow]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Ionicons name="help-buoy" size={22} color="#ffffff" />
            </View>
            <View>
              <ThemedText style={styles.headerTitle}>Assistant Agoo</ThemedText>
              <ThemedText style={styles.headerSub}>En ligne • Prêt à vous aider</ThemedText>
            </View>
          </View>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {isLoading && (
                <View style={styles.loadingRow}>
                  <View style={styles.avatarBot}>
                    <Ionicons name="help-buoy" size={20} color="#ffffff" />
                  </View>
                  <View style={styles.loadingBubble}>
                    <ActivityIndicator size="small" color={Colors.light.togoGreen} />
                    <ThemedText style={styles.loadingText}>En train d'écrire...</ThemedText>
                  </View>
                </View>
              )}
              {showQuickQuestions && (
                <View style={styles.quickSection}>
                  <ThemedText style={styles.quickTitle}>Questions fréquentes :</ThemedText>
                  {QUICK_QUESTIONS.map((q, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.quickBtn}
                      onPress={() => handleQuickQuestion(q)}
                    >
                      <ThemedText style={styles.quickBtnText}>{q}</ThemedText>
                      <Ionicons name="arrow-forward" size={16} color={Colors.light.togoGreen} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          }
        />

        <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            placeholder="Posez votre question..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 14,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  avatarBot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.togoGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleBot: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  messageBubbleUser: {
    backgroundColor: Colors.light.togoGreen,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextUser: {
    color: '#ffffff',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  quickSection: {
    marginTop: 16,
    gap: 8,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.6,
    marginBottom: 4,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  quickBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.togoGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
