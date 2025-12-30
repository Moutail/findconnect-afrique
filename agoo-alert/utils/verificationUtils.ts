import { auth, db } from '@/config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export interface VerificationStatus {
  isVerified: boolean;
  status: string;
  canPost: boolean;
  rejectionReason?: string;
}

export async function checkVerificationStatus(): Promise<VerificationStatus> {
  const user = auth.currentUser;
  if (!user) {
    return {
      isVerified: false,
      status: 'unverified',
      canPost: false,
    };
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      return {
        isVerified: false,
        status: 'unverified',
        canPost: false,
      };
    }

    const data = userDoc.data();
    return {
      isVerified: data.verificationStatus === 'approved',
      status: data.verificationStatus || 'unverified',
      canPost: data.canPost || false,
      rejectionReason: data.rejectionReason || undefined,
    };
  } catch (error) {
    console.error('Error checking verification status:', error);
    return {
      isVerified: false,
      status: 'unverified',
      canPost: false,
    };
  }
}

export function getVerificationMessage(status: string): string {
  switch (status) {
    case 'unverified':
      return 'Vous devez vérifier votre identité pour publier des alertes.';
    case 'pending':
      return 'Votre demande de vérification est en cours de traitement.';
    case 'approved':
      return 'Votre identité est vérifiée.';
    case 'rejected':
      return 'Votre demande a été rejetée. Veuillez soumettre à nouveau.';
    default:
      return 'Statut inconnu.';
  }
}

export function getVerificationBadgeColor(status: string): string {
  switch (status) {
    case 'approved':
      return '#16a34a'; // Vert
    case 'pending':
      return '#f59e0b'; // Orange
    case 'rejected':
      return '#dc2626'; // Rouge
    default:
      return '#94a3b8'; // Gris
  }
}

export function getVerificationIcon(status: string): string {
  switch (status) {
    case 'approved':
      return 'shield-checkmark';
    case 'pending':
      return 'time-outline';
    case 'rejected':
      return 'close-circle-outline';
    default:
      return 'shield-outline';
  }
}
