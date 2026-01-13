import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategorySelector } from '@/components/CategorySelector';
import { LocationPicker } from '@/components/LocationPicker';
import { PublishContextSelector, PublishContext } from '@/components/PublishContextSelector';
import { auth, db, storage } from '@/config/firebaseConfig';
import { CategoryMetadata, validateCategoryMetadata } from '@/types/categories';
import { LocationData } from '@/types/location';
import { Colors } from '@/constants/theme';

export default function DeclareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(false);

  // Contexte de publication
  const [publishContext, setPublishContext] = useState<PublishContext>({ type: 'user' });

  // Données du formulaire
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Catégorie avancée
  const [categoryMetadata, setCategoryMetadata] = useState<CategoryMetadata>({
    mainCategory: 'lost',
  });

  // Localisation
  const [location, setLocation] = useState<LocationData | null>(null);

  // Images
  const [imageUris, setImageUris] = useState<string[]>([]);

  const canSubmit = !!user && !!title.trim() && !!description.trim() && validateCategoryMetadata(categoryMetadata) && !loading;

  const handlePickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder aux photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((asset) => asset.uri);
      setImageUris([...imageUris, ...newUris].slice(0, 5)); // Max 5 images
    }
  };

  const removeImage = (index: number) => {
    setImageUris(imageUris.filter((_, i) => i !== index));
  };

  const uploadImageAsync = async (uri: string, reportId: string, index: number) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const objectRef = ref(storage, `reports/${reportId}/image_${index}_${Date.now()}.jpg`);
    await uploadBytes(objectRef, blob, { contentType: 'image/jpeg' });
    return await getDownloadURL(objectRef);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour créer une publication.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      Alert.alert('Champs manquants', 'Veuillez remplir au moins le titre et la description.');
      return;
    }

    if (!validateCategoryMetadata(categoryMetadata)) {
      Alert.alert(
        'Catégorie incomplète',
        'Veuillez remplir toutes les informations requises pour cette catégorie.'
      );
      return;
    }

    setLoading(true);

    try {
      // Créer la publication d'abord pour obtenir l'ID
      // Nettoyer categoryMetadata pour éviter les undefined (récursif)
      const cleanObject = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;

        const cleaned: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          if (value !== undefined) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              const cleanedNested = cleanObject(value);
              if (Object.keys(cleanedNested).length > 0 || cleanedNested === null) {
                cleaned[key] = cleanedNested;
              }
            } else {
              cleaned[key] = value;
            }
          }
        });
        return cleaned;
      };

      const cleanedCategoryMetadata = cleanObject(categoryMetadata);

      const reportData: any = {
        title: title.trim(),
        description: description.trim(),
        contactPhone: contactPhone.trim() || user.phoneNumber || '',

        // Catégorie avancée
        mainCategory: categoryMetadata.mainCategory,
        categoryMetadata: cleanedCategoryMetadata,

        // Localisation
        location: location || null,

        // Contexte de publication
        publishedBy: publishContext.type,
        createdBy: user.uid,

        // Métadonnées
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        moderationStatus: 'pending',
        moderatedAt: null,
        moderatedBy: null,
        status: 'open',

        // Images (initialisées pour schéma stable)
        imageUrls: [],
        imageUrl: '',
      };

      // Ajouter subCategory seulement si définie
      if (categoryMetadata.subCategory) {
        reportData.subCategory = categoryMetadata.subCategory;
      }

      // Ajouter données organisation si applicable
      if (publishContext.type === 'organization') {
        reportData.organizationId = publishContext.organizationId;
        reportData.organizationName = publishContext.organizationName;
        reportData.organizationLogo = publishContext.organizationLogo;
        reportData.isOfficialPost = true;
      } else {
        reportData.isOfficialPost = false;
      }

      const docRef = await addDoc(collection(db, 'reports'), reportData);

      // Upload images si présentes
      if (imageUris.length > 0) {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < imageUris.length; i++) {
          const url = await uploadImageAsync(imageUris[i], docRef.id, i);
          uploadedUrls.push(url);
        }

        // Mettre à jour le document avec les URLs des images
        await updateDoc(doc(db, 'reports', docRef.id), {
          imageUrls: uploadedUrls,
          imageUrl: uploadedUrls[0], // Image principale
        });
      }

      Alert.alert(
        'Publication créée!',
        'Votre publication a été créée avec succès. Elle sera visible après modération.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating report:', error);
      const anyErr: any = error;
      Alert.alert(
        'Erreur',
        anyErr?.message ||
          "Une erreur est survenue lors de la création de votre publication. Vérifiez votre connexion et les règles Firestore/Storage."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          Nouvelle Publication
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 60}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Sélecteur de contexte (user vs organisation) */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(0,106,78,0.12)' }]}>
                <Ionicons name="person-circle-outline" size={18} color={Colors.light.togoGreen} />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <ThemedText style={styles.sectionHeaderTitle}>Contexte</ThemedText>
                <ThemedText style={styles.sectionHeaderSubtitle}>Choisis qui publie cette alerte</ThemedText>
              </View>
            </View>
            <PublishContextSelector selectedContext={publishContext} onContextChange={setPublishContext} />
          </View>

          {/* Résumé */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Ionicons name="pricetag-outline" size={14} color="#64748b" />
                <ThemedText style={styles.summaryText}>{categoryMetadata.mainCategory.toUpperCase()}</ThemedText>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="images-outline" size={14} color="#64748b" />
                <ThemedText style={styles.summaryText}>{imageUris.length}/5</ThemedText>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="location-outline" size={14} color="#64748b" />
                <ThemedText style={styles.summaryText}>{location ? 'OK' : 'Optionnel'}</ThemedText>
              </View>
            </View>
          </View>

          {/* Infos */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(59,130,246,0.12)' }]}
              >
                <Ionicons name="document-text-outline" size={18} color="#2563eb" />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <ThemedText style={styles.sectionHeaderTitle}>Informations</ThemedText>
                <ThemedText style={styles.sectionHeaderSubtitle}>Titre et description sont obligatoires</ThemedText>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Titre <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Ex: Téléphone perdu"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
                editable={!loading}
                returnKeyType="next"
              />
              <ThemedText style={styles.helperText}>Court et précis. Exemple: "Carte d'identité perdue"</ThemedText>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Description <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Décris la situation, le lieu, la date, signes distinctifs..."
                placeholderTextColor="#94a3b8"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                editable={!loading}
              />
            </View>
          </View>

          {/* Catégorie */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(245,158,11,0.14)' }]}>
                <Ionicons name="grid-outline" size={18} color="#b45309" />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <ThemedText style={styles.sectionHeaderTitle}>Catégorie</ThemedText>
                <ThemedText style={styles.sectionHeaderSubtitle}>Aide à classer correctement la publication</ThemedText>
              </View>
            </View>
            <CategorySelector value={categoryMetadata} onChange={setCategoryMetadata} />
          </View>

          {/* Localisation */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                <Ionicons name="location-outline" size={18} color="#059669" />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <ThemedText style={styles.sectionHeaderTitle}>Localisation</ThemedText>
                <ThemedText style={styles.sectionHeaderSubtitle}>Optionnel, mais utile pour retrouver rapidement</ThemedText>
              </View>
            </View>
            <LocationPicker value={location} onChange={setLocation} showMap={true} />
          </View>

          {/* Photos */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(148,163,184,0.18)' }]}>
                <Ionicons name="images-outline" size={18} color="#475569" />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <ThemedText style={styles.sectionHeaderTitle}>Photos</ThemedText>
                <ThemedText style={styles.sectionHeaderSubtitle}>Jusqu'à 5 images (optionnel)</ThemedText>
              </View>
              <View style={{ flex: 1 }} />
              <View style={styles.counterPill}>
                <ThemedText style={styles.counterPillText}>{imageUris.length}/5</ThemedText>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.uploadButton, imageUris.length >= 5 && styles.uploadButtonDisabled]}
              onPress={handlePickImages}
              disabled={loading || imageUris.length >= 5}
              activeOpacity={0.85}
            >
              <View style={styles.uploadIconCircle}>
                <Ionicons
                  name="camera-outline"
                  size={22}
                  color={imageUris.length >= 5 ? '#94a3b8' : Colors.light.togoGreen}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.uploadText}>
                  {imageUris.length >= 5 ? 'Maximum atteint' : 'Ajouter des photos'}
                </ThemedText>
                <ThemedText style={styles.uploadHint}>Les photos améliorent la visibilité de l'alerte</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {imageUris.length > 0 && (
              <View style={styles.imageGrid}>
                {imageUris.map((uri, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <ExpoImage source={{ uri }} style={styles.imagePreview} contentFit="cover" />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeImage(index)}
                      disabled={loading}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="close" size={16} color="#0f172a" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Contact */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(236,72,153,0.12)' }]}>
                <Ionicons name="call-outline" size={18} color="#db2777" />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <ThemedText style={styles.sectionHeaderTitle}>Contact</ThemedText>
                <ThemedText style={styles.sectionHeaderSubtitle}>Optionnel, facilite la prise de contact</ThemedText>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Téléphone de contact</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="+228 XX XX XX XX"
                placeholderTextColor="#94a3b8"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>
          </View>

          {/* Bouton Publier */}
          <TouchableOpacity
            style={[styles.submitButton, (!canSubmit || loading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#ffffff" />
                <ThemedText style={styles.submitText}>Publier</ThemedText>
              </>
            )}
          </TouchableOpacity>

          {!user ? (
            <ThemedText style={styles.bottomHint}>Connexion requise pour publier.</ThemedText>
          ) : !title.trim() || !description.trim() ? (
            <ThemedText style={styles.bottomHint}>Renseigne au moins le titre et la description.</ThemedText>
          ) : !validateCategoryMetadata(categoryMetadata) ? (
            <ThemedText style={styles.bottomHint}>Complète la catégorie pour continuer.</ThemedText>
          ) : null}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  cardSection: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTextWrap: {
    flex: 1,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  summaryDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#e2e8f0',
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  required: {
    color: '#dc2626',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 132,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0,106,78,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  uploadHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  imageContainer: {
    width: '48%',
    aspectRatio: 1,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  counterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  counterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  submitButton: {
    backgroundColor: Colors.light.togoGreen,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.light.togoGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  bottomHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});
