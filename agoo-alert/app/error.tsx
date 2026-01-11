import { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

export default function GlobalError({ error }: { error: Error }) {
  const router = useRouter();

  useEffect(() => {
    console.error('Global error boundary', error);
  }, [error]);

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <ThemedText style={styles.title}>Une erreur est survenue</ThemedText>
        <ThemedText style={styles.message}>{String(error?.message ?? error)}</ThemedText>
        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.9}
          onPress={() => router.replace('/startup' as any)}
        >
          <ThemedText style={styles.btnText}>Redémarrer</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  message: {
    marginTop: 10,
    color: '#475569',
    lineHeight: 20,
  },
  btn: {
    marginTop: 14,
    backgroundColor: Colors.light.togoGreen,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
