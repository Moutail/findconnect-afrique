import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase';
import { useAdminAuth } from '../auth';

type ModerationStatus = 'pending' | 'approved' | 'rejected';

type ReportRow = {
  id: string;
  title: string;
  type: 'person' | 'object';
  city?: string;
  moderationStatus?: ModerationStatus;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  createdBy?: string;
};

type Tab = 'pending' | 'approved';

export default function ReportsPage() {
  const { user } = useAdminAuth();
  const [tab, setTab] = useState<Tab>('pending');
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setRows([]);

    const mapSnap = (snap: any) => {
      setRows(
        snap.docs.map((d: any) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: data.title || '',
            type: data.type === 'object' ? 'object' : 'person',
            city: data.city,
            moderationStatus: data.moderationStatus,
            createdAt: data.createdAt ?? null,
            createdBy: data.createdBy,
          };
        })
      );
      setLoading(false);
    };

    const qWithOrder = query(
      collection(db, 'reports'),
      where('moderationStatus', '==', tab),
      orderBy('createdAt', 'desc')
    );

    const qNoOrder = query(collection(db, 'reports'), where('moderationStatus', '==', tab));

    const unsubPrimary = onSnapshot(
      qWithOrder,
      (snap) => {
        setError(null);
        mapSnap(snap);
      },
      (err) => {
        const msg = (err as any)?.message ?? String(err);
        setError(msg);
        setLoading(true);

        const unsubFallback = onSnapshot(
          qNoOrder,
          (snap) => {
            mapSnap(snap);
          },
          (err2) => {
            setError(((err2 as any)?.message ?? String(err2)) + '\n' + msg);
            setLoading(false);
          }
        );

        return () => unsubFallback();
      }
    );

    return () => unsubPrimary();
  }, [tab]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const as = a.createdAt?.seconds ?? 0;
      const bs = b.createdAt?.seconds ?? 0;
      return bs - as;
    });
  }, [rows]);

  const approve = async (id: string) => {
    if (!user) return;
    setActionLoadingId(id);
    try {
      await updateDoc(doc(db, 'reports', id), {
        moderationStatus: 'approved',
        moderatedAt: serverTimestamp(),
        moderatedBy: user.uid,
        rejectionReason: null,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const remove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await deleteDoc(doc(db, 'reports', id));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }}>
        <div>
          <h1 style={{ marginTop: 0, color: '#0f172a' }}>Publications</h1>
          <p style={{ marginTop: 6, color: '#64748b' }}>
            Valide les publications avant qu’elles apparaissent publiquement.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
            En attente
          </TabButton>
          <TabButton active={tab === 'approved'} onClick={() => setTab('approved')}>
            Approuvées
          </TabButton>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
        }}
      >
        {error ? (
          <div
            style={{
              background: '#fffbeb',
              borderBottom: '1px solid #fde68a',
              color: '#92400e',
              padding: 12,
              fontSize: 12,
              whiteSpace: 'pre-wrap',
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.6fr 0.6fr 0.6fr', gap: 8, padding: 12, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#334155' }}>Titre</div>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#334155' }}>Type</div>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#334155' }}>Ville</div>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#334155' }}>Actions</div>
        </div>

        {loading ? (
          <div style={{ padding: 14, color: '#64748b' }}>Chargement…</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: 14, color: '#64748b' }}>Aucun élément.</div>
        ) : (
          sorted.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 0.6fr 0.6fr 0.6fr',
                gap: 8,
                padding: 12,
                borderBottom: '1px solid #f1f5f9',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 800, color: '#0f172a' }}>{r.title}</div>
              <div style={{ color: '#475569', fontWeight: 700 }}>{r.type === 'person' ? 'Personne' : 'Objet'}</div>
              <div style={{ color: '#475569' }}>{r.city || '-'}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Link
                  to={`/reports/${r.id}`}
                  style={{
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    fontWeight: 900,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  Détails
                </Link>
                {tab === 'pending' ? (
                  <button
                    onClick={() => approve(r.id)}
                    disabled={actionLoadingId === r.id}
                    style={buttonStyle('var(--primary)')}
                  >
                    {actionLoadingId === r.id ? '…' : 'Approuver'}
                  </button>
                ) : null}
                <button
                  onClick={() => remove(r.id)}
                  disabled={actionLoadingId === r.id}
                  style={buttonStyle('var(--danger)')}
                >
                  {actionLoadingId === r.id ? '…' : 'Supprimer'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 999,
        border: '1px solid var(--border)',
        background: active ? 'var(--primary)' : 'var(--surface)',
        color: active ? 'var(--primary-ink)' : 'var(--ink)',
        padding: '8px 10px',
        cursor: 'pointer',
        fontWeight: 800,
      }}
    >
      {children}
    </button>
  );
}

function buttonStyle(bg: string) {
  return {
    borderRadius: 10,
    border: 0,
    background: bg,
    color: 'white',
    padding: '8px 10px',
    cursor: 'pointer',
    fontWeight: 900,
  } as const;
}
