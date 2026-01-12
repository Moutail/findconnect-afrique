import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAdminAuth } from '../auth';

interface VerificationRequest {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  selfieUrl: string;
  idCardUrl: string;
  submittedAt: any;
  detectionResults?: {
    faceDetected: boolean;
    faceCount: number;
    confidence: number;
  };
  ocrResults?: {
    success: boolean;
    fullName?: string;
    idNumber?: string;
    dateOfBirth?: string;
    rawText?: string;
  };
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string;
  // User info
  userName?: string;
  userPhone?: string;
  userPseudonym?: string;
}

export default function VerificationsPage() {
  const { user } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'verificationRequests'),
      where('status', '==', activeTab),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data: VerificationRequest[] = [];

      for (const docSnap of snapshot.docs) {
        const reqData = { id: docSnap.id, ...docSnap.data() } as VerificationRequest;

        // Fetch user info
        try {
          const userDoc = await getDoc(doc(db, 'users', reqData.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            reqData.userName = userData.displayName || '';
            reqData.userPhone = userData.phone || '';
            reqData.userPseudonym = userData.pseudonym || '';
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }

        data.push(reqData);
      }

      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  const handleApprove = async (requestId: string, userId: string) => {
    if (!user) return;

    try {
      // Update verification request
      await updateDoc(doc(db, 'verificationRequests', requestId), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
      });

      // Update user document
      await updateDoc(doc(db, 'users', userId), {
        verificationStatus: 'approved',
        canPost: true,
        updatedAt: serverTimestamp(),
      });

      alert('Vérification approuvée avec succès !');
    } catch (error) {
      console.error('Error approving verification:', error);
      alert('Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (requestId: string, userId: string, reason: string) => {
    if (!user || !reason.trim()) {
      alert('Veuillez fournir une raison pour le rejet');
      return;
    }

    try {
      // Update verification request
      await updateDoc(doc(db, 'verificationRequests', requestId), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
        rejectionReason: reason,
      });

      // Update user document
      await updateDoc(doc(db, 'users', userId), {
        verificationStatus: 'rejected',
        canPost: false,
        updatedAt: serverTimestamp(),
      });

      alert('Vérification rejetée');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error rejecting verification:', error);
      alert('Erreur lors du rejet');
    }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0, color: '#0f172a' }}>Vérifications d'Identité</h1>
      <p style={{ marginTop: 6, color: '#64748b', marginBottom: 24 }}>
        Gérez les demandes de vérification d'identité des utilisateurs.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #e2e8f0' }}>
        <TabButton
          active={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          label="En attente"
          count={activeTab === 'pending' ? requests.length : undefined}
        />
        <TabButton
          active={activeTab === 'approved'}
          onClick={() => setActiveTab('approved')}
          label="Approuvées"
        />
        <TabButton
          active={activeTab === 'rejected'}
          onClick={() => setActiveTab('rejected')}
          label="Rejetées"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          Chargement...
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          Aucune demande {activeTab === 'pending' ? 'en attente' : activeTab === 'approved' ? 'approuvée' : 'rejetée'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {requests.map((request) => (
            <VerificationCard
              key={request.id}
              request={request}
              onSelect={() => setSelectedRequest(request)}
              onApprove={() => handleApprove(request.id, request.userId)}
              showActions={activeTab === 'pending'}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <VerificationModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={() => handleApprove(selectedRequest.id, selectedRequest.userId)}
          onReject={(reason) => handleReject(selectedRequest.id, selectedRequest.userId, reason)}
          showActions={activeTab === 'pending'}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 20px',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
        color: active ? 'var(--primary)' : '#64748b',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        fontSize: 14,
        transition: 'all 0.2s',
      }}
    >
      {label} {count !== undefined && count > 0 && (
        <span style={{
          background: 'var(--primary)',
          color: 'white',
          borderRadius: 12,
          padding: '2px 8px',
          fontSize: 12,
          marginLeft: 6,
          fontWeight: 700,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

function VerificationCard({
  request,
  onSelect,
  onApprove,
  showActions,
}: {
  request: VerificationRequest;
  onSelect: () => void;
  onApprove: () => void;
  showActions: boolean;
}) {
  const getStatusBadge = () => {
    const { detectionResults, ocrResults } = request;
    const faceOk = detectionResults?.faceDetected && detectionResults?.faceCount === 1;
    const ocrOk = ocrResults?.success;

    if (faceOk && ocrOk) {
      return { text: '✓ Contrôles réussis', color: '#10b981' };
    } else if (!faceOk && !ocrOk) {
      return { text: '⚠ Contrôles échoués', color: '#ef4444' };
    } else {
      return { text: '⚠ Contrôles partiels', color: '#f59e0b' };
    }
  };

  const badge = getStatusBadge();
  const date = request.submittedAt?.toDate?.();

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 20,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 20,
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
      }}
    >
      {/* User Avatar */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        {request.userName?.charAt(0)?.toUpperCase() || '?'}
      </div>

      {/* Info */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: 16 }}>
            {request.userName || 'Utilisateur inconnu'}
          </h3>
          <span
            style={{
              background: badge.color + '15',
              color: badge.color,
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {badge.text}
          </span>
        </div>
        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>
          📱 {request.userPhone} • 👤 @{request.userPseudonym}
        </div>
        <div style={{ color: '#94a3b8', fontSize: 12 }}>
          Soumis le {date ? date.toLocaleDateString('fr-FR') : 'N/A'} à{' '}
          {date ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
        </div>
        {request.ocrResults?.fullName && (
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
            <strong>Nom sur carte:</strong> {request.ocrResults.fullName}
            {request.ocrResults.idNumber && ` • ID: ${request.ocrResults.idNumber}`}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onSelect}
          style={{
            padding: '10px 18px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: 8,
            color: '#475569',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
          }}
        >
          📋 Détails
        </button>
        {showActions && (
          <button
            onClick={onApprove}
            style={{
              padding: '10px 18px',
              background: 'var(--primary)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--primary)';
            }}
          >
            ✓ Approuver
          </button>
        )}
      </div>
    </div>
  );
}

function VerificationModal({
  request,
  onClose,
  onApprove,
  onReject,
  showActions,
}: {
  request: VerificationRequest;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  showActions: boolean;
}) {
  const [selfieUrl, setSelfieUrl] = useState<string>('');
  const [idCardUrl, setIdCardUrl] = useState<string>('');
  const [loadingImages, setLoadingImages] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    const loadImages = async () => {
      try {
        // Convert gs:// URLs to download URLs
        const selfieRef = ref(storage, request.selfieUrl);
        const idCardRef = ref(storage, request.idCardUrl);

        const [selfieDownloadUrl, idCardDownloadUrl] = await Promise.all([
          getDownloadURL(selfieRef),
          getDownloadURL(idCardRef),
        ]);

        setSelfieUrl(selfieDownloadUrl);
        setIdCardUrl(idCardDownloadUrl);
      } catch (error) {
        console.error('Error loading images:', error);
      } finally {
        setLoadingImages(false);
      }
    };

    loadImages();
  }, [request]);

  const handleRejectSubmit = () => {
    if (!rejectionReason.trim()) {
      alert('Veuillez fournir une raison pour le rejet');
      return;
    }
    onReject(rejectionReason);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          maxWidth: 1000,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: '#0f172a' }}>Détails de la Vérification</h2>
            <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: 14 }}>
              {request.userName} • @{request.userPseudonym}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: 20,
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 32 }}>
          {/* Images */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            <div>
              <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: 14, fontWeight: 700 }}>
                📸 Selfie
              </h3>
              {loadingImages ? (
                <div style={{ background: '#f1f5f9', borderRadius: 12, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Chargement...
                </div>
              ) : (
                <img
                  src={selfieUrl}
                  alt="Selfie"
                  style={{ width: '100%', borderRadius: 12, border: '2px solid #e2e8f0' }}
                />
              )}
            </div>
            <div>
              <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: 14, fontWeight: 700 }}>
                🪪 Carte d'Identité
              </h3>
              {loadingImages ? (
                <div style={{ background: '#f1f5f9', borderRadius: 12, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Chargement...
                </div>
              ) : (
                <img
                  src={idCardUrl}
                  alt="Carte d'identité"
                  style={{ width: '100%', borderRadius: 12, border: '2px solid #e2e8f0' }}
                />
              )}
            </div>
          </div>

          {/* Detection Results */}
          {request.detectionResults && (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: 14, fontWeight: 700 }}>
                🤖 Résultats de Détection de Visage
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <InfoField
                  label="Visage détecté"
                  value={request.detectionResults.faceDetected ? '✅ Oui' : '❌ Non'}
                  color={request.detectionResults.faceDetected ? '#10b981' : '#ef4444'}
                />
                <InfoField label="Nombre de visages" value={request.detectionResults.faceCount.toString()} />
                <InfoField
                  label="Confiance"
                  value={`${(request.detectionResults.confidence * 100).toFixed(1)}%`}
                  color={request.detectionResults.confidence > 0.7 ? '#10b981' : '#f59e0b'}
                />
              </div>
            </div>
          )}

          {/* OCR Results */}
          {request.ocrResults && (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: 14, fontWeight: 700 }}>
                📄 Résultats OCR (Extraction de Texte)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <InfoField
                  label="Statut"
                  value={request.ocrResults.success ? '✅ Succès' : '❌ Échec'}
                  color={request.ocrResults.success ? '#10b981' : '#ef4444'}
                />
                {request.ocrResults.fullName && (
                  <InfoField label="Nom complet" value={request.ocrResults.fullName} />
                )}
                {request.ocrResults.idNumber && (
                  <InfoField label="Numéro de carte" value={request.ocrResults.idNumber} />
                )}
                {request.ocrResults.dateOfBirth && (
                  <InfoField label="Date de naissance" value={request.ocrResults.dateOfBirth} />
                )}
              </div>
              {request.ocrResults.rawText && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
                    Texte brut extrait:
                  </div>
                  <div
                    style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 12,
                      color: '#475569',
                      maxHeight: 150,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                    }}
                  >
                    {request.ocrResults.rawText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Info */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: 14, fontWeight: 700 }}>
              👤 Informations Utilisateur
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <InfoField label="Nom complet" value={request.userName || 'N/A'} />
              <InfoField label="Pseudonyme" value={`@${request.userPseudonym}`} />
              <InfoField label="Téléphone" value={request.userPhone || 'N/A'} />
              <InfoField
                label="Date de soumission"
                value={request.submittedAt?.toDate?.().toLocaleString('fr-FR') || 'N/A'}
              />
            </div>
          </div>

          {/* Rejection Reason (if rejected) */}
          {request.status === 'rejected' && request.rejectionReason && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 20, marginTop: 20 }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#dc2626', fontSize: 14, fontWeight: 700 }}>
                ❌ Raison du Rejet
              </h3>
              <p style={{ margin: 0, color: '#991b1b', fontSize: 14 }}>
                {request.rejectionReason}
              </p>
            </div>
          )}

          {/* Actions */}
          {showActions && !showRejectForm && (
            <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRejectForm(true)}
                style={{
                  padding: '12px 24px',
                  background: '#fee2e2',
                  border: 'none',
                  borderRadius: 8,
                  color: '#dc2626',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ❌ Rejeter
              </button>
              <button
                onClick={() => {
                  onApprove();
                  onClose();
                }}
                style={{
                  padding: '12px 24px',
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✅ Approuver
              </button>
            </div>
          )}

          {/* Reject Form */}
          {showRejectForm && (
            <div style={{ marginTop: 32, background: '#fef2f2', borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#dc2626', fontSize: 14, fontWeight: 700 }}>
                Raison du Rejet
              </h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Expliquez pourquoi cette vérification est rejetée..."
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #fecaca',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason('');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: 8,
                    color: '#475569',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleRejectSubmit}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Confirmer le Rejet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: color || '#0f172a' }}>{value}</div>
    </div>
  );
}
