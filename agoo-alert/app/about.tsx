import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { auth } from '@/config/firebaseConfig';

export default function AboutScreen() {
  const router = useRouter();

  const doSignOut = async () => {
    await signOut(auth);
    router.replace('/welcome' as any);
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#003c2c', Colors.light.togoGreen, Colors.light.togoYellow]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>À propos</ThemedText>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <ThemedText style={styles.title}>Agoo Alert</ThemedText>
          <ThemedText style={styles.sub}>Plateforme nationale d'alerte</ThemedText>

          <View style={styles.row}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.light.togoGreen} />
            <ThemedText style={styles.rowText}>Sécurité & confidentialité</ThemedText>
          </View>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => router.push({ pathname: '/privacy-policy' as any })}
          >
            <Ionicons name="document-text" size={18} color={Colors.light.togoGreen} />
            <ThemedText style={styles.linkText}>Politique de confidentialité</ThemedText>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {auth.currentUser ? (
            <TouchableOpacity style={styles.logoutBtn} onPress={doSignOut}>
              <Ionicons name="log-out" size={18} color="#ffffff" />
              <ThemedText style={styles.logoutText}>Se déconnecter</ThemedText>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 18, paddingBottom: 12, paddingHorizontal: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
  content: { padding: 16, paddingBottom: 120 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 14,
  },
  title: { fontSize: 22, fontWeight: '900' },
  sub: { marginTop: 6, opacity: 0.7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  rowText: { fontWeight: '700', opacity: 0.85 },
  linkBtn: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkText: { flex: 1, fontWeight: '900' },
  logoutBtn: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Colors.light.togoRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: { color: '#ffffff', fontWeight: '900' },
});
