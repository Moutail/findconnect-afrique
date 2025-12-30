import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';

import { ThemedText } from '@/components/themed-text';
import { SelfieCamera } from '@/components/selfie-camera';
import { auth, db, storage, functions } from '@/config/firebaseConfig';
import { Colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

type Step = 1 | 2 | 3 | 4;

export default function IdentityVerificationScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [showCamera, setShowCamera] = useState(false);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [idCardUri, setIdCardUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [faceDetectionResult, setFaceDetectionResult] = useState<any>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const uploadImageToStorage = async (uri: string, type: 'selfie' | 'idcard'): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const timestamp = Date.now();
    const filename = `${type}_${timestamp}.jpg`;
    const storageRef = ref(storage, `verification/${user.uid}/${filename}`);

    const response = await fetch(uri);
    const blob = await response.blob();

    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  };

  const handleCaptureSelfie = (uri: string) => {
    setSelfieUri(uri);
    setShowCamera(false);
  };

  const handlePickIdCard = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setIdCardUri(result.assets[0].uri);
    }
  };

  const processSelfieFaceDetection = async (imageUrl: string) => {
    try {
      const detectFace = httpsCallable(functions, 'detectFaceInSelfie');
      const result = await detectFace({
        imageUrl,
        userId: auth.currentUser?.uid,
      });

      setFaceDetectionResult(result.data);
      return result.data;
    } catch (error: any) {
      console.error('Face detection error:', error);
      Alert.alert('Erreur', 'Échec de la détection de visage: ' + (error.message || 'Erreur inconnue'));
      return null;
    }
  };

  const processIdCardOCR = async (imageUrl: string) => {
    try {
      const processOCR = httpsCallable(functions, 'processIdCardOCR');
      const result = await processOCR({
        imageUrl,
        userId: auth.currentUser?.uid,
      });

      setOcrResult(result.data);
      return result.data;
    } catch (error: any) {
      console.error('OCR error:', error);
      Alert.alert('Erreur', 'Échec du traitement OCR: ' + (error.message || 'Erreur inconnue'));
      return null;
    }
  };

  const handleSubmitVerification = async () => {
    if (!selfieUri || !idCardUri) {
      Alert.alert('Erreur', 'Veuillez fournir les deux photos');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }

    setUploading(true);

    try {
      // 1. Upload les images
      const selfieUrl = await uploadImageToStorage(selfieUri, 'selfie');
      const idCardUrl = await uploadImageToStorage(idCardUri, 'idcard');

      // 2. Traitement automatique (détection de visage + OCR)
      const faceResult = await processSelfieFaceDetection(selfieUrl);
      const ocrResult = await processIdCardOCR(idCardUrl);

      const autoChecksPassed =
        faceResult?.isValid === true && ocrResult?.success === true;

      // 3. Créer une demande de vérification
      const verificationData = {
        userId: user.uid,
        status: 'pending',
        selfieUrl,
        idCardUrl,
        submittedAt: serverTimestamp(),
        faceDetection: faceResult || null,
        ocrData: ocrResult?.data || null,
        autoChecksPassed,
        requiresManualReview: true,
        reviewedAt: null,
        reviewedBy: null,
        reviewNotes: null,
        rejectionReason: null,
      };

      await addDoc(collection(db, 'verificationRequests'), verificationData);

      // 4. Mettre à jour le statut de l'utilisateur
      await setDoc(
        doc(db, 'users', user.uid),
        {
          verificationStatus: 'pending',
          verificationSubmittedAt: serverTimestamp(),
          selfieUrl,
          idCardUrl,
        },
        { merge: true }
      );

      Alert.alert(
        'Demande envoyée',
        'Votre demande de vérification a été soumise. Un modérateur va la vérifier sous peu.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Verification submission error:', error);
      Alert.alert('Erreur', 'Échec de la soumission: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setUploading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark-outline" size={80} color={Colors.light.togoGreen} />
      </View>

      <ThemedText style={styles.title}>Vérification d'identité</ThemedText>
      <ThemedText style={styles.subtitle}>
        Pour publier des alertes, nous devons vérifier votre identité
      </ThemedText>

      <View style={styles.requirementsContainer}>
        <ThemedText style={styles.requirementsTitle}>Documents requis :</ThemedText>

        <View style={styles.requirement}>
          <Ionicons name="camera" size={24} color={Colors.light.togoGreen} />
          <View style={styles.requirementText}>
            <ThemedText style={styles.requirementTitle}>Selfie en direct</ThemedText>
            <ThemedText style={styles.requirementDesc}>
              Photo de votre visage prise avec la caméra frontale
            </ThemedText>
          </View>
        </View>

        <View style={styles.requirement}>
          <Ionicons name="card-outline" size={24} color={Colors.light.togoGreen} />
          <View style={styles.requirementText}>
            <ThemedText style={styles.requirementTitle}>Carte d'identité</ThemedText>
            <ThemedText style={styles.requirementDesc}>
              Photo claire de votre carte d'identité nationale
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.tipsContainer}>
        <ThemedText style={styles.tipsTitle}>Conseils :</ThemedText>
        <ThemedText style={styles.tipText}>• Assurez-vous d'être dans un endroit bien éclairé</ThemedText>
        <ThemedText style={styles.tipText}>• Prenez des photos nettes et lisibles</ThemedText>
        <ThemedText style={styles.tipText}>• Votre identité réelle restera privée</ThemedText>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(2)}>
        <LinearGradient
          colors={[Colors.light.togoGreen, '#004b37']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          <ThemedText style={styles.buttonText}>Commencer</ThemedText>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <ThemedText style={styles.cancelButtonText}>Plus tard</ThemedText>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => {
    if (showCamera) {
      return (
        <SelfieCamera
          onCapture={handleCaptureSelfie}
          onCancel={() => setShowCamera(false)}
        />
      );
    }

    return (
      <View style={styles.stepContainer}>
        <ThemedText style={styles.stepNumber}>Étape 1/2</ThemedText>
        <ThemedText style={styles.title}>Selfie</ThemedText>
        <ThemedText style={styles.subtitle}>
          Prenez une photo de votre visage en direct
        </ThemedText>

        {selfieUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selfieUri }} style={styles.preview} />
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => setShowCamera(true)}
            >
              <Ionicons name="camera-reverse" size={20} color="white" />
              <ThemedText style={styles.retakeButtonText}>Reprendre</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.captureZone} onPress={() => setShowCamera(true)}>
            <Ionicons name="camera-outline" size={64} color={Colors.light.togoGreen} />
            <ThemedText style={styles.captureText}>Ouvrir la caméra</ThemedText>
          </TouchableOpacity>
        )}

        <View style={styles.navigationButtons}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
            <Ionicons name="arrow-back" size={20} color={Colors.light.togoGreen} />
            <ThemedText style={styles.backButtonText}>Retour</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextButton, !selfieUri && styles.nextButtonDisabled]}
            onPress={() => selfieUri && setStep(3)}
            disabled={!selfieUri}
          >
            <LinearGradient
              colors={selfieUri ? [Colors.light.togoGreen, '#004b37'] : ['#94a3b8', '#64748b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <ThemedText style={styles.buttonText}>Suivant</ThemedText>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <ThemedText style={styles.stepNumber}>Étape 2/2</ThemedText>
      <ThemedText style={styles.title}>Carte d'identité</ThemedText>
      <ThemedText style={styles.subtitle}>
        Photo de votre carte d'identité nationale
      </ThemedText>

      {idCardUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: idCardUri }} style={styles.preview} />
          <TouchableOpacity style={styles.retakeButton} onPress={handlePickIdCard}>
            <Ionicons name="image" size={20} color="white" />
            <ThemedText style={styles.retakeButtonText}>Changer</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.captureZone} onPress={handlePickIdCard}>
          <Ionicons name="image-outline" size={64} color={Colors.light.togoGreen} />
          <ThemedText style={styles.captureText}>Choisir une photo</ThemedText>
        </TouchableOpacity>
      )}

      <View style={styles.navigationButtons}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <Ionicons name="arrow-back" size={20} color={Colors.light.togoGreen} />
          <ThemedText style={styles.backButtonText}>Retour</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextButton, !idCardUri && styles.nextButtonDisabled]}
          onPress={() => idCardUri && setStep(4)}
          disabled={!idCardUri}
        >
          <LinearGradient
            colors={idCardUri ? [Colors.light.togoGreen, '#004b37'] : ['#94a3b8', '#64748b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <ThemedText style={styles.buttonText}>Suivant</ThemedText>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <ThemedText style={styles.title}>Vérification</ThemedText>
      <ThemedText style={styles.subtitle}>
        Vérifiez vos documents avant de soumettre
      </ThemedText>

      <View style={styles.reviewContainer}>
        <View style={styles.reviewItem}>
          <ThemedText style={styles.reviewLabel}>Selfie</ThemedText>
          {selfieUri && <Image source={{ uri: selfieUri }} style={styles.reviewImage} />}
        </View>

        <View style={styles.reviewItem}>
          <ThemedText style={styles.reviewLabel}>Carte d'identité</ThemedText>
          {idCardUri && <Image source={{ uri: idCardUri }} style={styles.reviewImage} />}
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="lock-closed" size={20} color={Colors.light.togoGreen} />
        <ThemedText style={styles.infoText}>
          Vos documents seront vérifiés par un modérateur. Votre identité réelle restera confidentielle.
        </ThemedText>
      </View>

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmitVerification}
        disabled={uploading}
      >
        <LinearGradient
          colors={[Colors.light.togoGreen, '#004b37']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <ThemedText style={styles.buttonText}>Soumettre</ThemedText>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep(3)}
        disabled={uploading}
      >
        <Ionicons name="arrow-back" size={20} color={Colors.light.togoGreen} />
        <ThemedText style={styles.backButtonText}>Retour</ThemedText>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#003c2c', Colors.light.togoGreen, Colors.light.togoYellow]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 30,
  },
  requirementsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 15,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  requirementText: {
    marginLeft: 15,
    flex: 1,
  },
  requirementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  requirementDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 15,
  },
  gradientButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    padding: 10,
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  captureZone: {
    width: width - 80,
    height: width - 80,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: Colors.light.togoGreen,
    borderStyle: 'dashed',
  },
  captureText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.togoGreen,
  },
  previewContainer: {
    width: width - 80,
    marginBottom: 30,
  },
  preview: {
    width: '100%',
    height: width - 80,
    borderRadius: 20,
    marginBottom: 15,
  },
  retakeButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.togoGreen,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  retakeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 8,
  },
  backButtonText: {
    color: Colors.light.togoGreen,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  reviewContainer: {
    width: '100%',
    marginBottom: 20,
  },
  reviewItem: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  reviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  submitButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 15,
  },
});
