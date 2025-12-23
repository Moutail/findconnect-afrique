import { useEffect, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { auth, db, storage } from '@/config/firebaseConfig';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Colors } from '@/constants/theme';

type ReportEdit = {
  id: string;
  type: 'person' | 'object';
  title: string;
  description?: string;
  city?: string;
  locationDetail?: string;
  contactPhone?: string;
  status?: string;
  imageUrl?: string;
  createdBy?: string;
};

export default function ReportEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [report, setReport] = useState<ReportEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [status, setStatus] = useState<'open' | 'resolved'>('open');

  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Alerte introuvable.');
        setLoading(false);
        return;
      }

      try {
        const refDoc = doc(db, 'reports', id);
        const snap = await getDoc(refDoc);
        if (!snap.exists()) {
          setError("Cette alerte n'existe plus.");
          return;
        }

        const d = snap.data() as any;
        const data: ReportEdit = {
          id: snap.id,
          type: d.type === 'object' ? 'object' : 'person',
          title: d.title || '',
          description: d.description,
          city: d.city,
          locationDetail: d.locationDetail,
          contactPhone: d.contactPhone,
          status: d.status || 'open',
          imageUrl: d.imageUrl,
          createdBy: d.createdBy,
        };
        setReport(data);

        setTitle(data.title);
        setDescription(data.description || '');
        setCity(data.city || '');
        setLocationDetail(data.locationDetail || '');
        setContactPhone(data.contactPhone || '');
        setStatus(data.status === 'resolved' ? 'resolved' : 'open');
      } catch (e) {
        console.error('Error loading report for edit', e);
        setError('Impossible de charger cette publication.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const isOwner = !!report?.createdBy && report.createdBy === auth.currentUser?.uid;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à vos photos pour changer l'image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (result.canceled) return;
    setPendingImageUri(result.assets[0]?.uri ?? null);
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

  const handleSave = async () => {
    if (!report?.id) return;
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter.');
      return;
    }

    if (!isOwner) {
      Alert.alert('Accès refusé', "Vous ne pouvez modifier que vos propres publications.");
      return;
    }

    if (!title.trim() || !description.trim() || !city.trim() || !contactPhone.trim()) {
      Alert.alert('Champs manquants', 'Merci de remplir au moins le titre, la description, la ville et le contact.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        city: city.trim(),
        locationDetail: locationDetail.trim(),
        contactPhone: contactPhone.trim(),
        status,
        updatedAt: serverTimestamp(),
      };

      if (pendingImageUri) {
        const imageUrl = await uploadImageAsync(pendingImageUri, report.id);
        payload.imageUrl = imageUrl;
      }

      await updateDoc(doc(db, 'reports', report.id), payload);
      Alert.alert('Mis à jour', 'Votre publication a été mise à jour.');
      router.back();
    } catch (e) {
      console.error('Error updating report', e);
      Alert.alert('Erreur', "Impossible de mettre à jour. Réessayez plus tard.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[Colors.light.togoGreen, Colors.light.togoYellow]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Modifier la publication</ThemedText>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.togoGreen} />
          <ThemedText style={styles.loadingText}>Chargement…</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : !isOwner ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>
            Vous ne pouvez modifier que vos propres publications.
          </ThemedText>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Math.max(0, insets.top + 44)}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(160, insets.bottom + 160) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formCard}>
              <ThemedText style={styles.sectionTitle}>Image (optionnel)</ThemedText>

              <View style={styles.imageRow}>
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage} activeOpacity={0.85}>
                  <Ionicons name="images" size={18} color={Colors.light.togoGreen} />
                  <ThemedText style={styles.imagePickerText}>
                    {pendingImageUri ? 'Changer' : report?.imageUrl ? 'Remplacer' : 'Ajouter'}
                  </ThemedText>
                </TouchableOpacity>

                {(pendingImageUri || report?.imageUrl) ? (
                  <View style={styles.imagePreviewWrap}>
                    <ExpoImage
                      source={{ uri: pendingImageUri || report?.imageUrl || undefined }}
                      style={styles.imagePreview}
                      contentFit="cover"
                    />
                    {pendingImageUri ? (
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setPendingImageUri(null)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="close" size={14} color="#ffffff" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.formCard}>
              <ThemedText style={styles.sectionTitle}>Informations</ThemedText>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Titre</ThemedText>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Titre"
                    placeholderTextColor="#94a3b8"
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Ville</ThemedText>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ville"
                    placeholderTextColor="#94a3b8"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Lieu (détails)</ThemedText>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Lieu"
                    placeholderTextColor="#94a3b8"
                    value={locationDetail}
                    onChangeText={setLocationDetail}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Description</ThemedText>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Description"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={5}
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Contact</ThemedText>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Téléphone"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={contactPhone}
                    onChangeText={setContactPhone}
                  />
                </View>
              </View>

              <ThemedText style={styles.sectionTitle}>Statut</ThemedText>
              <View style={styles.statusRow}>
                <TouchableOpacity
                  style={[styles.statusChip, status === 'open' && styles.statusChipActive]}
                  onPress={() => setStatus('open')}
                >
                  <ThemedText style={[styles.statusText, status === 'open' && styles.statusTextActive]}>
                    En cours
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusChip, status === 'resolved' && styles.statusChipActive]}
                  onPress={() => setStatus('resolved')}
                >
                  <ThemedText style={[styles.statusText, status === 'resolved' && styles.statusTextActive]}>
                    Résolu
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={saving ? ['#94a3b8', '#64748b'] : [Colors.light.togoGreen, '#006a4e']}
                style={styles.saveGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {saving ? (
                  <View style={styles.saveContent}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <ThemedText style={styles.saveText}>Enregistrement…</ThemedText>
                  </View>
                ) : (
                  <View style={styles.saveContent}>
                    <Ionicons name="save" size={18} color="#ffffff" />
                    <ThemedText style={styles.saveText}>Enregistrer</ThemedText>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
    backgroundColor: 'rgba(255, 206, 0, 0.18)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(210, 16, 52, 0.12)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
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
    borderColor: 'rgba(0, 106, 78, 0.22)',
    backgroundColor: 'rgba(0, 106, 78, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  imagePickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.togoGreen,
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textAreaWrapper: {
    minHeight: 130,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusChipActive: {
    backgroundColor: Colors.light.togoGreen,
    borderColor: Colors.light.togoGreen,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  statusTextActive: {
    color: '#ffffff',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#006a4e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    shadowOpacity: 0.1,
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
