import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { auth, db } from '@/config/firebaseConfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

type ReportType = 'person' | 'object';

export default function DeclareScreen() {
  const [type, setType] = useState<ReportType>('person');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !description || !city || !contactPhone) {
      Alert.alert('Champs manquants', 'Merci de remplir au moins le titre, la description, la ville et un numéro de contact.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter avant de déclarer une perte.');
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'reports'), {
        type,
        title: title.trim(),
        description: description.trim(),
        city: city.trim(),
        locationDetail: locationDetail.trim(),
        contactPhone: contactPhone.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      setTitle('');
      setDescription('');
      setCity('');
      setLocationDetail('');
      setContactPhone('');

      Alert.alert('Déclaration envoyée', 'Votre alerte a été enregistrée. Elle apparaîtra bientôt dans la liste des pertes.');
    } catch (error: any) {
      console.error('Error creating report', error);
      Alert.alert('Erreur', "Impossible d'enregistrer la déclaration. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  const isPerson = type === 'person';

  return (
    <View style={styles.screen}>
      {/* Header avec dégradé */}
      <LinearGradient
        colors={['#0f172a', '#1e3a5f', '#0f172a']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <View style={styles.headerContent}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="megaphone" size={24} color="#ffffff" />
          </View>
          <View>
            <ThemedText style={styles.headerTitle}>Déclarer une perte</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Aidez la communauté à retrouver
            </ThemedText>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Choix du type */}
          <View style={styles.typeCard}>
            <ThemedText style={styles.sectionTitle}>Type de déclaration</ThemedText>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeButton, isPerson && styles.typeButtonActive]}
                onPress={() => setType('person')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isPerson ? ['#3b82f6', '#1d4ed8'] : ['#f1f5f9', '#f1f5f9']}
                  style={styles.typeIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name="person"
                    size={24}
                    color={isPerson ? '#ffffff' : '#64748b'}
                  />
                </LinearGradient>
                <ThemedText style={[styles.typeLabel, isPerson && styles.typeLabelActive]}>
                  Personne
                </ThemedText>
                <ThemedText style={styles.typeDesc}>disparue</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, !isPerson && styles.typeButtonActive]}
                onPress={() => setType('object')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={!isPerson ? ['#64748b', '#334155'] : ['#f1f5f9', '#f1f5f9']}
                  style={styles.typeIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name="briefcase"
                    size={24}
                    color={!isPerson ? '#ffffff' : '#64748b'}
                  />
                </LinearGradient>
                <ThemedText style={[styles.typeLabel, !isPerson && styles.typeLabelActive]}>
                  Objet
                </ThemedText>
                <ThemedText style={styles.typeDesc}>perdu</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Formulaire */}
          <View style={styles.formCard}>
            <ThemedText style={styles.sectionTitle}>Informations</ThemedText>

            {/* Titre */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name={isPerson ? 'person-outline' : 'pricetag-outline'} size={16} color="#64748b" />
                <ThemedText style={styles.label}>
                  {isPerson ? 'Nom de la personne' : "Titre de l'objet"}
                </ThemedText>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={isPerson ? 'Nom complet ou surnom' : 'Ex: Téléphone Samsung, sac à dos...'}
                  placeholderTextColor="#94a3b8"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            </View>

            {/* Ville */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="location-outline" size={16} color="#64748b" />
                <ThemedText style={styles.label}>Ville / Localité</ThemedText>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Lomé, Kara..."
                  placeholderTextColor="#94a3b8"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>

            {/* Détail du lieu */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="navigate-outline" size={16} color="#64748b" />
                <ThemedText style={styles.label}>Dernier lieu vu / Lieu de perte</ThemedText>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Marché, quartier, arrêt de bus..."
                  placeholderTextColor="#94a3b8"
                  value={locationDetail}
                  onChangeText={setLocationDetail}
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="document-text-outline" size={16} color="#64748b" />
                <ThemedText style={styles.label}>Description détaillée</ThemedText>
              </View>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={
                    isPerson
                      ? 'Signalement, vêtements portés, signes particuliers...'
                      : 'Couleur, marque, contenu, numéro de série...'
                  }
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </View>

            {/* Contact */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="call-outline" size={16} color="#64748b" />
                <ThemedText style={styles.label}>Numéro de contact</ThemedText>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Numéro joignable pour ce cas"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={contactPhone}
                  onChangeText={setContactPhone}
                />
              </View>
            </View>
          </View>

          {/* Bouton envoyer */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.9}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#94a3b8', '#64748b'] : ['#3b82f6', '#1d4ed8']}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <View style={styles.submitContent}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <ThemedText style={styles.submitText}>Envoi en cours…</ThemedText>
                </View>
              ) : (
                <View style={styles.submitContent}>
                  <Ionicons name="send" size={18} color="#ffffff" />
                  <ThemedText style={styles.submitText}>Publier la déclaration</ThemedText>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Message d'aide */}
          <View style={styles.helpCard}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <ThemedText style={styles.helpText}>
              Merci de rester précis et honnête. Les fausses déclarations pourront être signalées et
              bloquées par les autorités.
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 1,
  },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  typeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  typeButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  typeIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  typeLabelActive: {
    color: '#1e293b',
  },
  typeDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  inputWrapper: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textAreaWrapper: {
    minHeight: 120,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    shadowOpacity: 0.1,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
