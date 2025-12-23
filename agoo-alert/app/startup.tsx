import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { auth } from '@/config/firebaseConfig';
import { Colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

const HAS_SEEN_ONBOARDING_KEY = 'hasSeenOnboarding:v1';

export default function StartupScreen() {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => undefined);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.1)),
      }),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        })
      ),
    ]).start();

    const t = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // ignore
      }

      const user = auth.currentUser;
      if (user) {
        router.replace('/(tabs)');
        return;
      }

      const hasSeen = await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY);
      if (hasSeen === '1') {
        router.replace('/welcome' as any);
      } else {
        router.replace('/onboarding' as any);
      }
    }, 1200);

    return () => clearTimeout(t);
  }, [fadeAnim, rotateAnim, router, scaleAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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

      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
        }}
      >
        <View style={styles.logoWrap}>
          <LinearGradient
            colors={[Colors.light.togoGreen, '#004b37']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Ionicons name="search" size={isSmallDevice ? 42 : 52} color="white" />
          </LinearGradient>
          <Animated.View style={[styles.ring, { transform: [{ rotate: spin }] }]} />
        </View>

        <ThemedText style={styles.title}>Agoo Alert</ThemedText>
        <ThemedText style={styles.subtitle}>Signalement & recherche en temps réel</ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  logoWrap: {
    width: isSmallDevice ? 104 : 124,
    height: isSmallDevice ? 104 : 124,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logoGradient: {
    width: isSmallDevice ? 92 : 110,
    height: isSmallDevice ? 92 : 110,
    borderRadius: isSmallDevice ? 46 : 55,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#006a4e',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  ring: {
    position: 'absolute',
    width: isSmallDevice ? 110 : 132,
    height: isSmallDevice ? 110 : 132,
    borderRadius: isSmallDevice ? 55 : 66,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  title: {
    fontSize: isSmallDevice ? 30 : 36,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 8,
    fontSize: isSmallDevice ? 14 : 15,
    color: 'rgba(255,255,255,0.75)',
  },
});
