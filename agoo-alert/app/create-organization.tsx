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

  const uploadFile = async (uri: string, path: string, contentType: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
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
        const url = await uploadFile(
          doc.uri,
          `organizations/documents/${user.uid}_${Date.now()}_${i}.pdf`,
          'application/pdf'
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
      Alert.alert('Erreur', 'Une erreur est survenue lors de la soumission de votre demande. Veuillez réessayer.');
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 60}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <ThemedText style={styles.section}>Informations de base</ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Nom de l'organisation <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Ex: Gare Routière de Lomé"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Raison sociale complète <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Ex: SARL Gare Routière Lomé"
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
            >
              <ThemedText>{ORGANIZATION_TYPE_LABELS[type]}</ThemedText>
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
            >
              <ThemedText>{ORGANIZATION_CATEGORY_LABELS[category]}</ThemedText>
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

          <ThemedText style={styles.section}>Contact</ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Email officiel <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="contact@organisation.tg"
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
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <ThemedText style={styles.section}>Adresse</ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              Rue <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Ex: Avenue de la Libération"
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
              <TextInput style={styles.input} placeholder="Lomé" value={city} onChangeText={setCity} editable={!loading} />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>
                Région <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Maritime"
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

          <ThemedText style={styles.section}>Logo (optionnel)</ThemedText>

          <TouchableOpacity style={styles.uploadButton} onPress={handlePickLogo} disabled={loading}>
            {logoUri ? (
              <ExpoImage source={{ uri: logoUri }} style={styles.logoPreview} contentFit="cover" />
            ) : (
              <>
                <Ionicons name="image-outline" size={32} color="#64748b" />
                <ThemedText style={styles.uploadText}>Ajouter un logo</ThemedText>
              </>
            )}
          </TouchableOpacity>

          <ThemedText style={styles.section}>
            Documents de vérification <ThemedText style={styles.required}>*</ThemedText>
          </ThemedText>

          <ThemedText style={styles.helper}>
            Registre de commerce, licence d'exploitation, carte d'identité du représentant légal, etc.
          </ThemedText>

          <TouchableOpacity style={styles.uploadButton} onPress={handlePickDocument} disabled={loading}>
            <Ionicons name="document-outline" size={32} color="#64748b" />
            <ThemedText style={styles.uploadText}>Ajouter un document</ThemedText>
          </TouchableOpacity>

          {documentUris.map((doc, index) => (
            <View key={index} style={styles.documentItem}>
              <Ionicons name="document-text" size={20} color={Colors.light.togoGreen} />
              <ThemedText style={styles.documentName} numberOfLines={1}>
                {doc.name}
              </ThemedText>
              <TouchableOpacity
                onPress={() => setDocumentUris(documentUris.filter((_, i) => i !== index))}
                disabled={loading}
              >
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}

          <ThemedText style={styles.section}>Votre rôle</ThemedText>

          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowRolePicker(!showRolePicker)}
            disabled={loading}
          >
            <ThemedText>{MEMBER_ROLE_LABELS[requestedRole]}</ThemedText>
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

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.submitText}>Soumettre la demande</ThemedText>
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
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 20,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  logoPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  helper: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  submitButton: {
    backgroundColor: Colors.light.togoGreen,
    borderRadius: 12,
    paddingVertical: 14,
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
