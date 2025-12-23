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
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { auth, db, storage } from '@/config/firebaseConfig';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

type ReportType = 'person' | 'object';
type ReportKind = 'lost' | 'found';
type PickupPlaceType = 'police' | 'gendarmerie' | 'public_place' | 'other';

export default function DeclareScreen() {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<ReportType>('person');
  const [kind, setKind] = useState<ReportKind>('lost');
  const [pickupPlaceType, setPickupPlaceType] = useState<PickupPlaceType>('police');
  const [pickupPlaceName, setPickupPlaceName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à vos photos pour ajouter une image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (result.canceled) return;
    setImageUri(result.assets[0]?.uri ?? null);
  };

  const uploadImageAsync = async (uri: string, reportId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const response = await fetch(uri);
    const blob = await response.blob();
    const objectRef = ref(storage, `reports/${reportId}/cover_${Date.now()}.jpg`);
    await uploadBytes(objectRef, blob, { contentType: 'image/jpeg' });
    return await getDownloadURL(objectRef);
  };

  const handleSubmit = async () => {
    if (!title || !description || !city || !contactPhone) {
      Alert.alert('Champs manquants', 'Merci de remplir au moins le titre, la description, la ville et un numéro de contact.');
      return;
    }

    const isFoundObject = type === 'object' && kind === 'found';
    if (isFoundObject) {
      if (!pickupPlaceName.trim() || !pickupAddress.trim()) {
        Alert.alert(
          'Lieu de récupération',
          'Merci de renseigner au moins le nom du lieu et l\'adresse pour récupérer l\'objet trouvé.'
        );
        return;
      }
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter avant de déclarer une perte.');
      return;
    }

    setLoading(true);

    try {
      const reportRef = await addDoc(collection(db, 'reports'), {
        type,
        kind: type === 'object' ? kind : 'lost',
        title: title.trim(),
        description: description.trim(),
        city: city.trim(),
        locationDetail: locationDetail.trim(),
        contactPhone: contactPhone.trim(),
        pickupPlaceType: type === 'object' && kind === 'found' ? pickupPlaceType : null,
        pickupPlaceName: type === 'object' && kind === 'found' ? pickupPlaceName.trim() : null,
        pickupAddress: type === 'object' && kind === 'found' ? pickupAddress.trim() : null,
        pickupInstructions: type === 'object' && kind === 'found' ? pickupInstructions.trim() : null,
        status: 'open',
        moderationStatus: 'pending',
        moderatedAt: null,
        moderatedBy: null,
        rejectionReason: null,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      if (imageUri) {
        const imageUrl = await uploadImageAsync(imageUri, reportRef.id);
        await updateDoc(doc(db, 'reports', reportRef.id), { imageUrl });
      }

      setTitle('');
      setDescription('');
      setCity('');
      setLocationDetail('');
      setContactPhone('');
      setKind('lost');
      setPickupPlaceType('police');
      setPickupPlaceName('');
      setPickupAddress('');
      setPickupInstructions('');
      setImageUri(null);

      Alert.alert('Déclaration envoyée', 'Votre alerte a été enregistrée. Elle apparaîtra bientôt dans la liste des pertes.');
    } catch (error: any) {
      console.error('Error creating report', error);
      Alert.alert('Erreur', "Impossible d'enregistrer la déclaration. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  const isPerson = type === 'person';
  const isFoundObject = type === 'object' && kind === 'found';

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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Math.max(0, insets.top + 44)}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(140, insets.bottom + 140) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Choix du type */}
          <View style={styles.typeCard}>
            <ThemedText style={styles.sectionTitle}>Type de déclaration</ThemedText>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeButton, isPerson && styles.typeButtonActive]}
                onPress={() => {
                  setType('person');
                  setKind('lost');
                }}
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
                onPress={() => {
                  setType('object');
                  setKind('lost');
                }}
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
                <ThemedText style={styles.typeDesc}>perdu / trouvé</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Objet: perdu vs trouvé */}
          {type === 'object' ? (
            <View style={styles.typeCard}>
              <ThemedText style={styles.sectionTitle}>Objet</ThemedText>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeButton, kind === 'lost' && styles.typeButtonActive]}
                  onPress={() => setKind('lost')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={kind === 'lost' ? ['#64748b', '#334155'] : ['#f1f5f9', '#f1f5f9']}
                    style={styles.typeIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="alert" size={22} color={kind === 'lost' ? '#ffffff' : '#64748b'} />
                  </LinearGradient>
                  <ThemedText style={[styles.typeLabel, kind === 'lost' && styles.typeLabelActive]}>
                    Perdu
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeButton, kind === 'found' && styles.typeButtonActive]}
                  onPress={() => setKind('found')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={kind === 'found' ? ['#006a4e', '#004b37'] : ['#f1f5f9', '#f1f5f9']}
                    style={styles.typeIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="checkmark" size={22} color={kind === 'found' ? '#ffffff' : '#64748b'} />
                  </LinearGradient>
                  <ThemedText style={[styles.typeLabel, kind === 'found' && styles.typeLabelActive]}>
                    Trouvé
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Formulaire */}
          <View style={styles.formCard}>
            <ThemedText style={styles.sectionTitle}>Informations</ThemedText>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="image-outline" size={16} color="#64748b" />
                <ThemedText style={styles.label}>Image (optionnel)</ThemedText>
              </View>
              <View style={styles.imageRow}>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickImage}
                  activeOpacity={0.85}
                >
                  <Ionicons name="images" size={18} color="#1d4ed8" />
                  <ThemedText style={styles.imagePickerText}>
                    {imageUri ? 'Changer' : 'Ajouter'}
                  </ThemedText>
                </TouchableOpacity>
                {imageUri ? (
                  <View style={styles.imagePreviewWrap}>
                    <ExpoImage source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setImageUri(null)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="close" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>

            {isFoundObject ? (
              <View style={styles.formCard}>
                <ThemedText style={styles.sectionTitle}>Récupération (lieu sécurisé)</ThemedText>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.statusChip, pickupPlaceType === 'police' && styles.statusChipActive]}
                    onPress={() => setPickupPlaceType('police')}
                  >
                    <ThemedText style={[styles.statusText, pickupPlaceType === 'police' && styles.statusTextActive]}>
                      Police
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusChip, pickupPlaceType === 'gendarmerie' && styles.statusChipActive]}
                    onPress={() => setPickupPlaceType('gendarmerie')}
                  >
                    <ThemedText style={[styles.statusText, pickupPlaceType === 'gendarmerie' && styles.statusTextActive]}>
                      Gendarmerie
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.statusChip, pickupPlaceType === 'public_place' && styles.statusChipActive]}
                    onPress={() => setPickupPlaceType('public_place')}
                  >
                    <ThemedText style={[styles.statusText, pickupPlaceType === 'public_place' && styles.statusTextActive]}>
                      Lieu public
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusChip, pickupPlaceType === 'other' && styles.statusChipActive]}
                    onPress={() => setPickupPlaceType('other')}
                  >
                    <ThemedText style={[styles.statusText, pickupPlaceType === 'other' && styles.statusTextActive]}>
                      Autre
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputGroup, { marginTop: 12 }]}
                >
                  <View style={styles.labelRow}>
                    <Ionicons name="business-outline" size={16} color="#64748b" />
                    <ThemedText style={styles.label}>Nom du lieu</ThemedText>
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Commissariat Central"
                      placeholderTextColor="#94a3b8"
                      value={pickupPlaceName}
                      onChangeText={setPickupPlaceName}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Ionicons name="map-outline" size={16} color="#64748b" />
                    <ThemedText style={styles.label}>Adresse</ThemedText>
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Quartier, rue, repère"
                      placeholderTextColor="#94a3b8"
                      value={pickupAddress}
                      onChangeText={setPickupAddress}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Ionicons name="information-circle-outline" size={16} color="#64748b" />
                    <ThemedText style={styles.label}>Instructions (optionnel)</ThemedText>
                  </View>
                  <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Heures d'ouverture, pièce à présenter…"
                      placeholderTextColor="#94a3b8"
                      multiline
                      numberOfLines={3}
                      value={pickupInstructions}
                      onChangeText={setPickupInstructions}
                    />
                  </View>
                </View>
              </View>
            ) : null}

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
                <ThemedText style={styles.label}>
                  {isFoundObject ? 'Lieu où l\'objet a été trouvé' : 'Dernier lieu vu / Lieu de perte'}
                </ThemedText>
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
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipActive: {
    borderColor: '#006a4e',
    backgroundColor: 'rgba(0, 106, 78, 0.10)',
  },
  statusText: {
    fontWeight: '800',
    color: '#0f172a',
    fontSize: 13,
  },
  statusTextActive: {
    color: '#006a4e',
  },
  inputGroup: {
    marginBottom: 16,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  imagePickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  imagePreviewWrap: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
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
