import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

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
          <ThemedText style={styles.headerTitle}>Politique de confidentialité</ThemedText>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <ThemedText style={styles.h}>1. Données collectées</ThemedText>
          <ThemedText style={styles.p}>
            Nous collectons les informations nécessaires au fonctionnement du service : numéro de téléphone (utilisé pour la connexion),
            nom/prénom (si fourni), et les contenus que vous publiez (déclarations, images, messages).
          </ThemedText>

          <ThemedText style={styles.h}>2. Utilisation</ThemedText>
          <ThemedText style={styles.p}>
            Les données sont utilisées pour afficher les alertes, permettre la modération, et faciliter la mise en relation sécurisée.
          </ThemedText>

          <ThemedText style={styles.h}>3. Partage</ThemedText>
          <ThemedText style={styles.p}>
            Nous ne vendons pas vos données. Les informations d'une déclaration peuvent être visibles publiquement uniquement après validation.
            Les messages sont visibles uniquement par les participants autorisés.
          </ThemedText>

          <ThemedText style={styles.h}>4. Sécurité</ThemedText>
          <ThemedText style={styles.p}>
            Nous appliquons des règles d'accès et des contrôles de modération afin de protéger les utilisateurs.
          </ThemedText>

          <ThemedText style={styles.h}>5. Contact</ThemedText>
          <ThemedText style={styles.p}>
            Pour toute question sur la confidentialité, contactez l'équipe Agoo Alert.
          </ThemedText>
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
  headerTitle: { color: '#ffffff', fontWeight: '900', fontSize: 16, flex: 1 },
  content: { padding: 16, paddingBottom: 120 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 14,
  },
  h: { fontWeight: '900', marginTop: 10 },
  p: { marginTop: 6, opacity: 0.85, lineHeight: 20 },
});
