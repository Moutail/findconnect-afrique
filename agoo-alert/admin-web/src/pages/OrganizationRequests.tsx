import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAdminAuth } from '../auth';

type RequestStatus = 'pending' | 'approved' | 'rejected';

type OrganizationRequest = {
  id: string;
  requestType: 'new_organization' | 'claim_existing' | 'join_organization';
  organizationData: {
    name: string;
    legalName: string;
    type: string;
    category: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      region: string;
      country: string;
    };
    logo?: string;
  };
  requestedBy: string;
  requestedByName: string;
  requestedByEmail: string;
  requestedByPhone: string;
  requestedRole: string;
  documents: {
    other?: string[];
  };
  status: RequestStatus;
  reviewedAt?: any;
  reviewedBy?: string;
  reviewNotes?: string;
  submittedAt: any;
  updatedAt: any;
};

export default function OrganizationRequestsPage() {
  const { user } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<RequestStatus>('pending');
  const [requests, setRequests] = useState<OrganizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<OrganizationRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'organizationRequests'),
      where('status', '==', activeTab),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: OrganizationRequest[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as OrganizationRequest));
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  const handleApprove = async (request: OrganizationRequest) => {
    if (!user) return;
    if (!window.confirm(`Approuver la demande de "${request.organizationData.name}" ?`)) return;

    setActionLoading(true);
    try {
      const orgData = {
        name: request.organizationData.name,
        legalName: request.organizationData.legalName,
        type: request.organizationData.type,
        category: request.organizationData.category,
        email: request.organizationData.email,
        phone: request.organizationData.phone,
        address: request.organizationData.address,
        logo: request.organizationData.logo,
        verificationStatus: 'approved',
        verificationDocuments: {
          documentUrls: request.documents.other || [],
        },
        verifiedAt: serverTimestamp(),
        verifiedBy: user.uid,
        canPost: true,
        canVerify: false,
        maxPostsPerDay: 50,
        stats: {
          totalPosts: 0,
          totalFollowers: 0,
          totalViews: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: request.requestedBy,
        status: 'active',
      };

      const orgRef = await addDoc(collection(db, 'organizations'), orgData);

      const memberData = {
        organizationId: orgRef.id,
        userId: request.requestedBy,
        role: request.requestedRole,
        permissions: {
          canPublish: true,
          canEditOrg: request.requestedRole === 'owner' || request.requestedRole === 'admin',
          canManageMembers: request.requestedRole === 'owner' || request.requestedRole === 'admin',
          canViewAnalytics: true,
          canDeletePosts: request.requestedRole === 'owner' || request.requestedRole === 'admin',
        },
        joinedAt: serverTimestamp(),
        status: 'active',
      };

      await setDoc(doc(db, 'organizationMembers', `${orgRef.id}_${request.requestedBy}`), memberData);

      await updateDoc(doc(db, 'organizationRequests', request.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
        reviewNotes: reviewNotes || null,
      });

      alert('Organisation approuvée avec succès !');
      setSelectedRequest(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Erreur lors de l\'approbation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (request: OrganizationRequest) => {
    if (!user) return;
    const notes = window.prompt('Raison du rejet (facultatif):');
    if (notes === null) return;

    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'organizationRequests', request.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
        reviewNotes: notes || 'Demande rejetée',
      });

      alert('Demande rejetée.');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Erreur lors du rejet.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20, color: '#0f172a' }}>
        Demandes d'Organisation
      </h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {(['pending', 'approved', 'rejected'] as RequestStatus[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? '#006A4E' : '#64748b',
              borderBottom: activeTab === tab ? '2px solid #006A4E' : 'none',
              marginBottom: '-2px',
            }}
          >
            {tab === 'pending' ? 'En attente' : tab === 'approved' ? 'Approuvées' : 'Rejetées'} ({requests.length})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Chargement...</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          Aucune demande {activeTab === 'pending' ? 'en attente' : activeTab === 'approved' ? 'approuvée' : 'rejetée'}.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {requests.map((request) => (
            <div
              key={request.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {request.organizationData.logo && (
                  <img
                    src={request.organizationData.logo}
                    alt="Logo"
                    style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }}
                  />
                )}

                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>
                    {request.organizationData.name}
                  </h3>
                  <p style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>
                    {request.organizationData.legalName}
                  </p>

                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                    <span>📧 {request.organizationData.email}</span>
                    <span>📞 {request.organizationData.phone}</span>
                    <span>📍 {request.organizationData.address.city}, {request.organizationData.address.region}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {request.organizationData.type}
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        backgroundColor: '#f0fdf4',
                        color: '#16a34a',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {request.organizationData.category}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    <p>Demandé par: {request.requestedByName || request.requestedByEmail}</p>
                    <p>Rôle demandé: <strong>{request.requestedRole}</strong></p>
                    <p>Documents: {request.documents.other?.length || 0} fichier(s)</p>
                    <p>
                      Soumis le:{' '}
                      {request.submittedAt?.toDate
                        ? new Date(request.submittedAt.toDate()).toLocaleDateString('fr-FR')
                        : 'N/A'}
                    </p>
                  </div>

                  {activeTab === 'pending' ? (
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          fontWeight: 600,
                          color: '#006A4E',
                        }}
                      >
                        Examiner
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 12, padding: 10, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                        <strong>Examiné le:</strong>{' '}
                        {request.reviewedAt?.toDate
                          ? new Date(request.reviewedAt.toDate()).toLocaleString('fr-FR')
                          : 'N/A'}
                      </p>
                      {request.reviewNotes && (
                        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
                          <strong>Notes:</strong> {request.reviewNotes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRequest && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !actionLoading && setSelectedRequest(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 24,
              maxWidth: 600,
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#0f172a' }}>
              Examiner la demande
            </h2>

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
                {selectedRequest.organizationData.name}
              </h3>
              <p style={{ fontSize: 14, color: '#64748b' }}>{selectedRequest.organizationData.legalName}</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                Notes d'examen (optionnel)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: 10,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
                placeholder="Notes pour justifier l'approbation ou le rejet..."
                disabled={actionLoading}
              />
            </div>

            {selectedRequest.documents.other && selectedRequest.documents.other.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
                  Documents ({selectedRequest.documents.other.length})
                </h4>
                {selectedRequest.documents.other.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      padding: '8px 12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: 6,
                      marginBottom: 8,
                      textDecoration: 'none',
                      color: '#1d4ed8',
                      fontSize: 13,
                    }}
                  >
                    📄 Document {index + 1}
                  </a>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => !actionLoading && setSelectedRequest(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: actionLoading ? 0.5 : 1,
                }}
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button
                onClick={() => handleReject(selectedRequest)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: actionLoading ? 0.5 : 1,
                }}
                disabled={actionLoading}
              >
                Rejeter
              </button>
              <button
                onClick={() => handleApprove(selectedRequest)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#006A4E',
                  color: '#ffffff',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: actionLoading ? 0.5 : 1,
                }}
                disabled={actionLoading}
              >
                {actionLoading ? 'Traitement...' : 'Approuver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
