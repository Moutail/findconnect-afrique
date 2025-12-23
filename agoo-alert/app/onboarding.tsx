import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

const HAS_SEEN_ONBOARDING_KEY = 'hasSeenOnboarding:v1';

type Slide = {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
};

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const slides: Slide[] = useMemo(
    () => [
      {
        key: 's1',
        title: 'Signaler rapidement',
        description:
          "Déclarez une personne disparue ou un objet perdu en quelques secondes, avec photo et informations utiles.",
        icon: 'megaphone-outline',
        accent: Colors.light.togoGreen,
      },
      {
        key: 's2',
        title: 'Alerter la communauté',
        description:
          "Partagez l’alerte pour mobiliser les citoyens autour de vous et augmenter les chances de retrouver rapidement.",
        icon: 'people-outline',
        accent: Colors.light.togoYellow,
      },
      {
        key: 's3',
        title: 'Discuter en sécurité',
        description:
          "Contactez les personnes qui ont des informations via la messagerie intégrée (texte, image, audio).",
        icon: 'chatbubbles-outline',
        accent: Colors.light.togoRed,
      },
    ],
    []
  );

  const [index, setIndex] = useState(0);

  const goTo = (nextIndex: number) => {
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, '1');
    router.replace('/welcome' as any);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / width);
    setIndex(Math.max(0, Math.min(slides.length - 1, i)));
  };

  const isLast = index === slides.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#003c2c', Colors.light.togoGreen, Colors.light.togoYellow]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />

      <View style={styles.topRow}>
        <TouchableOpacity style={styles.skipButton} activeOpacity={0.85} onPress={handleFinish}>
          <ThemedText style={styles.skipText}>Passer</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={styles.slidesContent}
      >
        {slides.map((s) => (
          <View key={s.key} style={styles.slide}>
            <View style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: `${s.accent}20` }]}
              >
                <Ionicons name={s.icon} size={34} color={s.accent} />
              </View>
              <ThemedText style={styles.title}>{s.title}</ThemedText>
              <ThemedText style={styles.description}>{s.description}</ThemedText>

              <View style={styles.dotsRow}>
                {slides.map((_, i) => (
                  <View
                    key={`${s.key}-dot-${i}`}
                    style={[styles.dot, i === index && styles.dotActive]}
                  />
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.9}
          onPress={() => {
            if (isLast) {
              handleFinish();
            } else {
              goTo(index + 1);
            }
          }}
        >
          <LinearGradient
            colors={[Colors.light.togoGreen, '#004b37']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryGradient}
          >
            <ThemedText style={styles.primaryText}>{isLast ? 'Commencer' : 'Suivant'}</ThemedText>
            <Ionicons name={isLast ? 'checkmark-circle' : 'arrow-forward'} size={18} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        {!isLast ? (
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={handleFinish}>
            <ThemedText style={styles.secondaryText}>Ignorer</ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.08,
  },
  circle1: {
    width: width * 0.85,
    height: width * 0.85,
    backgroundColor: Colors.light.togoYellow,
    top: -width * 0.35,
    right: -width * 0.35,
  },
  circle2: {
    width: width * 0.55,
    height: width * 0.55,
    backgroundColor: Colors.light.togoRed,
    bottom: -width * 0.25,
    left: -width * 0.25,
  },
  topRow: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: width * 0.06,
    alignItems: 'flex-end',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
  },
  slidesContent: {
    alignItems: 'center',
  },
  slide: {
    width,
    paddingHorizontal: width * 0.06,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 26,
    padding: isSmallDevice ? 22 : 26,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: isSmallDevice ? 20 : 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  description: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#475569',
    lineHeight: isSmallDevice ? 20 : 22,
    marginBottom: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  dotActive: {
    width: 22,
    backgroundColor: Colors.light.togoGreen,
  },
  bottomRow: {
    paddingHorizontal: width * 0.06,
    paddingBottom: isSmallDevice ? 20 : 28,
    paddingTop: 12,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#006a4e',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallDevice ? 14 : 16,
    gap: 10,
  },
  primaryText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  secondaryText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '700',
  },
});
