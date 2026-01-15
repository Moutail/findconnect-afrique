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
import * as DocumentPicker from 'expo-document-picker';
import { Image as ExpoImage } from 'expo-image';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { auth, db, storage } from '@/config/firebaseConfig';
import {
  OrganizationType,
  OrganizationCategory,
  ORGANIZATION_TYPE_LABELS,
  ORGANIZATION_CATEGORY_LABELS,
  MemberRole,
  MEMBER_ROLE_LABELS,
} from '@/types/organizations';
import { Colors } from '@/constants/theme';

export default function CreateOrganizationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [type, setType] = useState<OrganizationType>('business');
  const [category, setCategory] = useState<OrganizationCategory>('commerce');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('Togo');

  const [requestedRole, setRequestedRole] = useState<MemberRole>('owner');

  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [documentUris, setDocumentUris] = useState<{ uri: string; name: string }[]>([]);

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const canSubmit =
    !!user &&
    !loading &&
    !!name.trim() &&
    !!legalName.trim() &&
    !!email.trim() &&
    !!phone.trim() &&
    !!street.trim() &&
    !!city.trim() &&
    !!region.trim() &&
    documentUris.length > 0;

  const handlePickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder aux photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const getDocumentMeta = (fileName: string) => {
    const safeName = (fileName || 'document').toLowerCase();
    const isPdf = safeName.endsWith('.pdf');
    const contentType = isPdf ? 'application/pdf' : 'image/jpeg';
    const ext = isPdf ? 'pdf' : 'jpg';
    return { contentType, ext };
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setDocumentUris([...documentUris, { uri: asset.uri, name: asset.name }]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const uriToBlobAsync = (uri: string) => {
    return new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        resolve(xhr.response as Blob);
      };
      xhr.onerror = () => {
        reject(new Error('Failed to read file as blob'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  };

  const uploadFile = async (uri: string, path: string, contentType: string): Promise<string> => {
    const blob = await uriToBlobAsync(uri);
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType });
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour créer une organisation.');
      return;
    }

    if (!name.trim() || !legalName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (!street.trim() || !city.trim() || !region.trim()) {
      Alert.alert('Erreur', "Veuillez renseigner l'adresse complète.");
      return;
    }

    if (documentUris.length === 0) {
      Alert.alert(
        'Documents requis',
        'Veuillez ajouter au moins un document de vérification (registre de commerce, licence, etc.).'
      );
      return;
    }

    setLoading(true);

    try {
      let logoUrl: string | undefined = undefined;
      if (logoUri) {
        logoUrl = await uploadFile(
          logoUri,
          `organizations/logos/${user.uid}_${Date.now()}.jpg`,
          'image/jpeg'
        );
      }

      const documentUrls: string[] = [];
      for (let i = 0; i < documentUris.length; i++) {
        const doc = documentUris[i];
        const meta = getDocumentMeta(doc.name);
        const url = await uploadFile(
          doc.uri,
          `organizations/documents/${user.uid}_${Date.now()}_${i}.${meta.ext}`,
          meta.contentType
        );
        documentUrls.push(url);
      }

      await addDoc(collection(db, 'organizationRequests'), {
        requestType: 'new_organization',
        organizationData: {
          name: name.trim(),
          legalName: legalName.trim(),
          type,
          category,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          address: {
            street: street.trim(),
            city: city.trim(),
            region: region.trim(),
            country: country.trim(),
          },
          logo: logoUrl,
        },
        requestedBy: user.uid,
        requestedByName: user.displayName || '',
        requestedByEmail: user.email || '',
        requestedByPhone: user.phoneNumber || '',
        requestedRole,
        documents: {
          other: documentUrls,
        },
        status: 'pending',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        'Demande envoyée',
        'Votre demande de création d\'organisation a été envoyée. Vous recevrez une notification une fois qu\'elle sera examinée.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)' as any) }]
      );
    } catch (error) {
      console.error('Error creating organization request:', error);
      const anyErr: any = error;
      Alert.alert(
        'Erreur',
        anyErr?.message ||
          'Une erreur est survenue lors de la soumission de votre demande. Vérifiez votre connexion et réessayez.'
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
          Créer une Organisation
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
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Ionicons name="business-outline" size={14} color="#64748b" />
                <ThemedText style={styles.summaryText}>{ORGANIZATION_TYPE_LABELS[type]}</ThemedText>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="documents-outline" size={14} color="#64748b" />
                <ThemedText style={styles.summaryText}>{documentUris.length} doc</ThemedText>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#64748b" />
                <ThemedText style={styles.summaryText}>Vérification</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <ThemedText style={styles.sectionHeaderTitle}>Informations de base</ThemedText>
                <ThemedText style={styles.sectionHeaderSubtitle}>Présente clairement ton organisation</ThemedText>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Nom affiché <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Ex: Gare Routière de Lomé"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
              <ThemedText style={styles.helperText}>C'est ce que les utilisateurs verront dans l'application.</ThemedText>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Raison sociale (officiel) <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Ex: SARL Gare Routière Lomé"
                placeholderTextColor="#94a3b8"
                value={legalName}
                onChangeText={setLegalName}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Type d'organisation</ThemedText>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowTypePicker(!showTypePicker)}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.pickerLeft}>
                  <Ionicons name="briefcase-outline" size={18} color="#64748b" />
                  <ThemedText style={styles.pickerText}>{ORGANIZATION_TYPE_LABELS[type]}</ThemedText>
                </View>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
              </TouchableOpacity>
              {showTypePicker && (
                <View style={styles.pickerDropdown}>
                  {(Object.keys(ORGANIZATION_TYPE_LABELS) as OrganizationType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={styles.pickerItem}
                      onPress={() => {
                        setType(t);
                        setShowTypePicker(false);
                      }}
                    >
                      <ThemedText style={t === type ? styles.pickerItemActive : undefined}>
                        {ORGANIZATION_TYPE_LABELS[t]}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Catégorie</ThemedText>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.pickerLeft}>
                  <Ionicons name="grid-outline" size={18} color="#64748b" />
                  <ThemedText style={styles.pickerText}>{ORGANIZATION_CATEGORY_LABELS[category]}</ThemedText>
                </View>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={styles.pickerDropdown}>
                  {(Object.keys(ORGANIZATION_CATEGORY_LABELS) as OrganizationCategory[]).map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={styles.pickerItem}
                      onPress={() => {
                        setCategory(c);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <ThemedText style={c === category ? styles.pickerItemActive : undefined}>
                        {ORGANIZATION_CATEGORY_LABELS[c]}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(236,72,153,0.12)' }]}>
                <Ionicons name="call-outline" size={18} color="#db2777" />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <ThemedText style={styles.sectionHeaderTitle}>Contact</ThemedText>
                <ThemedText style={styles.sectionHeaderSubtitle}>Pour que les utilisateurs puissent vous joindre</ThemedText>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Email officiel <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="contact@organisation.tg"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Téléphone <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="+228 XX XX XX XX"
                placeholderTextColor="#94a3b8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                <Ionicons name="location-outline" size={18} color="#059669" />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <ThemedText style={styles.sectionHeaderTitle}>Adresse</ThemedText>
                <ThemedText style={styles.sectionHeaderSubtitle}>Adresse officielle de l'organisation</ThemedText>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Rue <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Ex: Avenue de la Libération"
                placeholderTextColor="#94a3b8"
                value={street}
                onChangeText={setStreet}
                editable={!loading}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.label}>
                  Ville <ThemedText style={styles.required}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Lomé"
                  placeholderTextColor="#94a3b8"
                  value={city}
                  onChangeText={setCity}
                  editable={!loading}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.label}>
                  Région <ThemedText style={styles.required}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Maritime"
                  placeholderTextColor="#94a3b8"
                  value={region}
                  onChangeText={setRegion}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Pays</ThemedText>
              <TextInput style={styles.input} value={country} onChangeText={setCountry} editable={!loading} />
            </View>
          </View>

          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(148,163,184,0.18)' }]}>
                <Ionicons name="image-outline" size={18} color="#475569" />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <ThemedText style={styles.sectionHeaderTitle}>Logo</ThemedText>
                <ThemedText style={styles.sectionHeaderSubtitle}>Optionnel, améliore la crédibilité</ThemedText>
              </View>
            </View>

            <TouchableOpacity style={styles.uploadButton} onPress={handlePickLogo} disabled={loading} activeOpacity={0.85}>
              {logoUri ? (
                <View style={styles.logoWrap}>
                  <ExpoImage source={{ uri: logoUri }} style={styles.logoPreview} contentFit="cover" />
                  <View style={styles.logoMeta}>
                    <ThemedText style={styles.uploadTextStrong}>Logo sélectionné</ThemedText>
                    <ThemedText style={styles.uploadHint}>Appuie pour changer</ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </View>
              ) : (
                <View style={styles.uploadRow}>
                  <View style={styles.uploadIconCircle}>
                    <Ionicons name="camera-outline" size={22} color={Colors.light.togoGreen} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.uploadTextStrong}>Ajouter un logo</ThemedText>
                    <ThemedText style={styles.uploadHint}>PNG/JPG, carré de préférence</ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(245,158,11,0.14)' }]}>
                <Ionicons name="document-text-outline" size={18} color="#b45309" />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <ThemedText style={styles.sectionHeaderTitle}>
                  Documents de vérification <ThemedText style={styles.required}>*</ThemedText>
                </ThemedText>
                <ThemedText style={styles.sectionHeaderSubtitle}>Au moins 1 document requis</ThemedText>
              </View>
              <View style={{ flex: 1 }} />
              <View style={styles.counterPill}>
                <ThemedText style={styles.counterPillText}>{documentUris.length}</ThemedText>
              </View>
            </View>

            <ThemedText style={styles.helperText}>
              Registre de commerce, licence d'exploitation, carte d'identité du représentant légal, etc.
            </ThemedText>

            <TouchableOpacity style={styles.uploadButton} onPress={handlePickDocument} disabled={loading} activeOpacity={0.85}>
              <View style={styles.uploadRow}>
                <View style={styles.uploadIconCircleAlt}>
                  <Ionicons name="add" size={22} color="#b45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.uploadTextStrong}>Ajouter un document</ThemedText>
                  <ThemedText style={styles.uploadHint}>PDF ou image</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {documentUris.map((doc, index) => (
              <View key={index} style={styles.documentItem}>
                <Ionicons name="document-text" size={18} color={Colors.light.togoGreen} />
                <ThemedText style={styles.documentName} numberOfLines={1}>
                  {doc.name}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setDocumentUris(documentUris.filter((_, i) => i !== index))}
                  disabled={loading}
                  style={styles.documentRemove}
                  activeOpacity={0.9}
                >
                  <Ionicons name="close" size={16} color="#0f172a" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                <Ionicons name="person-circle-outline" size={18} color="#4f46e5" />
              </View>
              <View style={styles.sectionHeaderTextWrap}>
                <ThemedText style={styles.sectionHeaderTitle}>Votre rôle</ThemedText>
                <ThemedText style={styles.sectionHeaderSubtitle}>Choisis ton niveau d'accès</ThemedText>
              </View>
            </View>

            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowRolePicker(!showRolePicker)}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={styles.pickerLeft}>
                <Ionicons name="key-outline" size={18} color="#64748b" />
                <ThemedText style={styles.pickerText}>{MEMBER_ROLE_LABELS[requestedRole]}</ThemedText>
              </View>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
            {showRolePicker && (
              <View style={styles.pickerDropdown}>
                {(['owner', 'admin'] as MemberRole[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={styles.pickerItem}
                    onPress={() => {
                      setRequestedRole(r);
                      setShowRolePicker(false);
                    }}
                  >
                    <ThemedText style={r === requestedRole ? styles.pickerItemActive : undefined}>
                      {MEMBER_ROLE_LABELS[r]}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

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
                <ThemedText style={styles.submitText}>Soumettre la demande</ThemedText>
              </>
            )}
          </TouchableOpacity>

          {!user ? (
            <ThemedText style={styles.bottomHint}>Connexion requise pour créer une organisation.</ThemedText>
          ) : !name.trim() || !legalName.trim() || !email.trim() || !phone.trim() ? (
            <ThemedText style={styles.bottomHint}>Remplis les informations de base et le contact.</ThemedText>
          ) : !street.trim() || !city.trim() || !region.trim() ? (
            <ThemedText style={styles.bottomHint}>Renseigne une adresse complète.</ThemedText>
          ) : documentUris.length === 0 ? (
            <ThemedText style={styles.bottomHint}>Ajoute au moins un document de vérification.</ThemedText>
          ) : null}

          <View style={{ height: 40 }} />
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
    gap: 12,
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
    color: '#ef4444',
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  pickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
  },
  pickerDropdown: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  pickerItem: {
    padding: 12,
  },
  pickerItemActive: {
    fontWeight: '700',
    color: Colors.light.togoGreen,
  },
  uploadButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0,106,78,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconCircleAlt: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTextStrong: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  uploadHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMeta: {
    flex: 1,
  },
  logoPreview: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  documentName: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  documentRemove: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    marginTop: 24,
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
    opacity: 0.6,
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
