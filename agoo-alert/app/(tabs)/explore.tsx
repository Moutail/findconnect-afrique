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
        status: 'open',
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
      Alert.alert('Erreur', 'Une erreur est survenue lors de la création de votre publication. Veuillez réessayer.');
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 60}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Sélecteur de contexte (user vs organisation) */}
          <PublishContextSelector selectedContext={publishContext} onContextChange={setPublishContext} />

          {/* Titre */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Titre <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Ex: Portefeuille perdu"
              value={title}
              onChangeText={setTitle}
              editable={!loading}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Description <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez en détail..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              editable={!loading}
            />
          </View>

          {/* Catégorie avancée */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Catégorie</ThemedText>
            <CategorySelector value={categoryMetadata} onChange={setCategoryMetadata} />
          </View>

          {/* Localisation */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Localisation (optionnel)</ThemedText>
            <LocationPicker value={location} onChange={setLocation} showMap={true} />
          </View>

          {/* Images */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Photos (max 5)</ThemedText>
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickImages} disabled={loading || imageUris.length >= 5}>
              <Ionicons name="camera-outline" size={32} color={imageUris.length >= 5 ? '#94a3b8' : Colors.light.togoGreen} />
              <ThemedText style={styles.uploadText}>
                {imageUris.length >= 5 ? 'Maximum 5 photos' : 'Ajouter des photos'}
              </ThemedText>
              <ThemedText style={styles.uploadHint}>
                {imageUris.length}/5 photos
              </ThemedText>
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
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Contact */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Téléphone de contact (optionnel)</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="+228 XX XX XX XX"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Bouton Publier */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.submitText}>Publier</ThemedText>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  uploadHint: {
    fontSize: 12,
    color: '#94a3b8',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  imageContainer: {
    width: '48%',
    aspectRatio: 1,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: Colors.light.togoGreen,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
