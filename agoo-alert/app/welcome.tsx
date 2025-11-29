import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

export default function WelcomeScreen() {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  }, []);

  const features = [
    { icon: 'shield-checkmark', label: 'Sécurisé', color: '#10b981' },
    { icon: 'people', label: 'Communauté', color: '#3b82f6' },
    { icon: 'business', label: 'Autorités', color: '#f59e0b' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f172a', '#1e3a5f', '#0f172a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Cercles décoratifs */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo animé */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoAnim,
              transform: [
                {
                  scale: logoAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#3b82f6', '#06b6d4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Ionicons name="search" size={isSmallDevice ? 36 : 44} color="white" />
          </LinearGradient>
        </Animated.View>

        {/* Titre principal */}
        <Animated.View
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <ThemedText style={styles.title}>Agoo Alert</ThemedText>
          <ThemedText style={styles.subtitle}>
            Plateforme nationale d'alerte{'\n'}et de recherche
          </ThemedText>
        </Animated.View>

        {/* Badges des fonctionnalités */}
        <Animated.View
          style={[
            styles.featuresRow,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {features.map((feature, index) => (
            <View key={index} style={styles.featureBadge}>
              <Ionicons name={feature.icon as any} size={18} color={feature.color} />
              <ThemedText style={styles.featureText}>{feature.label}</ThemedText>
            </View>
          ))}
        </Animated.View>

        {/* Carte principale */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <ThemedText style={styles.cardTitle}>
            Signalez. Recherchez. Retrouvez.
          </ThemedText>
          <ThemedText style={styles.cardDescription}>
            Déclarez une personne disparue ou un objet perdu et laissez la communauté
            et les forces de l'ordre vous aider à les retrouver en toute sécurité.
          </ThemedText>

          <View style={styles.bulletPoints}>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <ThemedText style={styles.bulletText}>
                Déclarations centralisées et vérifiées
              </ThemedText>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <ThemedText style={styles.bulletText}>
                Messagerie sécurisée entre utilisateurs
              </ThemedText>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <ThemedText style={styles.bulletText}>
                Points de rendez-vous officiels (commissariats)
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        {/* Boutons */}
        <Animated.View
          style={[
            styles.buttonsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/login?mode=register')}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="person-add" size={20} color="white" />
              <ThemedText style={styles.primaryButtonText}>
                Créer un compte citoyen
              </ThemedText>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/login?mode=login')}
          >
            <Ionicons name="log-in-outline" size={20} color="#3b82f6" />
            <ThemedText style={styles.secondaryButtonText}>
              J'ai déjà un compte
            </ThemedText>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <ThemedText style={styles.footerText}>
            En collaboration avec les autorités togolaises
          </ThemedText>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: width * 0.06,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    justifyContent: 'center',
    minHeight: height,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.08,
  },
  circle1: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: '#3b82f6',
    top: -width * 0.3,
    right: -width * 0.3,
  },
  circle2: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: '#06b6d4',
    bottom: height * 0.15,
    left: -width * 0.3,
  },
  circle3: {
    width: width * 0.4,
    height: width * 0.4,
    backgroundColor: '#10b981',
    bottom: -width * 0.1,
    right: -width * 0.1,
  },
  logoContainer: {
    alignSelf: 'center',
    marginBottom: isSmallDevice ? 16 : 24,
  },
  logoGradient: {
    width: isSmallDevice ? 72 : 88,
    height: isSmallDevice ? 72 : 88,
    borderRadius: isSmallDevice ? 36 : 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 16 : 24,
  },
  title: {
    fontSize: isSmallDevice ? 32 : 40,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: isSmallDevice ? 15 : 17,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: isSmallDevice ? 22 : 26,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: isSmallDevice ? 20 : 28,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 24,
    padding: isSmallDevice ? 20 : 24,
    marginBottom: isSmallDevice ? 20 : 28,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  cardTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  cardDescription: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#475569',
    lineHeight: isSmallDevice ? 20 : 23,
    marginBottom: 16,
  },
  bulletPoints: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  bulletText: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#334155',
    flex: 1,
  },
  buttonsContainer: {
    gap: 12,
    marginBottom: isSmallDevice ? 20 : 28,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallDevice ? 14 : 16,
    gap: 10,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallDevice ? 14 : 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  secondaryButtonText: {
    color: '#93c5fd',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});

