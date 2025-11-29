import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { auth } from '@/config/firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(params.mode === 'register');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.1)),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  }, []);

  const phoneToEmail = (rawPhone: string) => {
    const normalized = rawPhone.replace(/[^0-9]/g, '');
    return `${normalized}@agoo-alert.tg`;
  };

  const handleSubmit = async () => {
    if (!phone || !password) {
      Alert.alert('Erreur', 'Veuillez renseigner un numéro de téléphone et un mot de passe.');
      return;
    }

    if (isRegisterMode) {
      if (!firstName || !lastName) {
        Alert.alert('Erreur', 'Veuillez renseigner votre nom et prénom.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Erreur', 'La confirmation du mot de passe ne correspond pas.');
        return;
      }
    }

    setLoading(true);
    try {
      const emailFromPhone = phoneToEmail(phone.trim());

      if (isRegisterMode) {
        await createUserWithEmailAndPassword(auth, emailFromPhone, password);
      } else {
        await signInWithEmailAndPassword(auth, emailFromPhone, password);
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Auth error', error);
      Alert.alert('Authentification', error?.message || "Une erreur s'est produite.");
    } finally {
      setLoading(false);
    }
  };

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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Bouton retour */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          {/* Header */}
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#3b82f6', '#06b6d4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Ionicons
                name={isRegisterMode ? 'person-add' : 'log-in'}
                size={isSmallDevice ? 28 : 32}
                color="white"
              />
            </LinearGradient>
            <ThemedText style={styles.title}>
              {isRegisterMode ? 'Créer un compte' : 'Se connecter'}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {isRegisterMode
                ? 'Rejoignez la communauté Agoo Alert'
                : 'Accédez à vos alertes et déclarations'}
            </ThemedText>
          </Animated.View>

          {/* Formulaire */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            {/* Champ Téléphone */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Numéro de téléphone</ThemedText>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+228 90 00 00 00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            {/* Champs Inscription seulement */}
            {isRegisterMode && (
              <>
                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <ThemedText style={styles.label}>Nom</ThemedText>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Nom"
                        placeholderTextColor="#94a3b8"
                        value={lastName}
                        onChangeText={setLastName}
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <ThemedText style={styles.label}>Prénom</ThemedText>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Prénom"
                        placeholderTextColor="#94a3b8"
                        value={firstName}
                        onChangeText={setFirstName}
                      />
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Champ Mot de passe */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Mot de passe</ThemedText>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirmation mot de passe (inscription) */}
            {isRegisterMode && (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Confirmer le mot de passe</ThemedText>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Bouton principal */}
            <TouchableOpacity
              style={styles.submitButton}
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#64748b', '#475569'] : ['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={isRegisterMode ? 'checkmark-circle' : 'arrow-forward-circle'}
                      size={22}
                      color="white"
                    />
                    <ThemedText style={styles.submitText}>
                      {isRegisterMode ? "S'inscrire" : 'Se connecter'}
                    </ThemedText>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Séparateur */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <ThemedText style={styles.separatorText}>ou</ThemedText>
              <View style={styles.separatorLine} />
            </View>

            {/* Lien vers l'autre mode */}
            <TouchableOpacity
              style={styles.switchButton}
              activeOpacity={0.7}
              onPress={() => setIsRegisterMode(!isRegisterMode)}
            >
              <ThemedText style={styles.switchText}>
                {isRegisterMode ? 'Vous avez déjà un compte ?' : "Pas encore de compte ?"}
              </ThemedText>
              <ThemedText style={styles.switchLink}>
                {isRegisterMode ? 'Se connecter' : "S'inscrire"}
              </ThemedText>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer sécurité */}
          <Animated.View style={[styles.securityNote, { opacity: fadeAnim }]}>
            <Ionicons name="shield-checkmark" size={16} color="rgba(255,255,255,0.6)" />
            <ThemedText style={styles.securityText}>
              Vos données sont protégées et sécurisées
            </ThemedText>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 40,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.08,
  },
  circle1: {
    width: width * 0.7,
    height: width * 0.7,
    backgroundColor: '#3b82f6',
    top: -width * 0.2,
    right: -width * 0.2,
  },
  circle2: {
    width: width * 0.5,
    height: width * 0.5,
    backgroundColor: '#06b6d4',
    bottom: height * 0.1,
    left: -width * 0.25,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isSmallDevice ? 16 : 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 20 : 28,
  },
  logoGradient: {
    width: isSmallDevice ? 56 : 64,
    height: isSmallDevice ? 56 : 64,
    borderRadius: isSmallDevice ? 28 : 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  title: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: isSmallDevice ? 14 : 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 24,
    padding: isSmallDevice ? 20 : 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  inputGroup: {
    marginBottom: isSmallDevice ? 14 : 18,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: isSmallDevice ? 12 : 14,
    fontSize: 15,
    color: '#0f172a',
  },
  eyeButton: {
    padding: 8,
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isSmallDevice ? 14 : 16,
    gap: 10,
  },
  submitText: {
    color: 'white',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '700',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: isSmallDevice ? 16 : 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  separatorText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#94a3b8',
  },
  switchButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  switchText: {
    fontSize: 14,
    color: '#64748b',
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: isSmallDevice ? 20 : 28,
    gap: 6,
  },
  securityText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
});
