import { useEffect, useState } from 'react';
import {
  collection,
  getCountFromServer,
  query,
  where,
} from 'firebase/firestore';

import { db } from '../firebase';

type Stats = {
  pending: number;
  approved: number;
  total: number;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, total: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const col = collection(db, 'reports');
        const [pendingSnap, approvedSnap, totalSnap] = await Promise.all([
          getCountFromServer(query(col, where('moderationStatus', '==', 'pending'))),
          getCountFromServer(query(col, where('moderationStatus', '==', 'approved'))),
          getCountFromServer(query(col)),
        ]);

        setStats({
          pending: pendingSnap.data().count,
          approved: approvedSnap.data().count,
          total: totalSnap.data().count,
        });
      } finally {
        setLoading(false);
      }
    };

    load().catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0, color: '#0f172a' }}>Dashboard</h1>
      <p style={{ marginTop: 6, color: '#64748b' }}>Statistiques rapides des publications.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <StatCard title="En attente" value={stats.pending} loading={loading} color="var(--warning)" />
        <StatCard title="Approuvées" value={stats.approved} loading={loading} color="var(--primary)" />
        <StatCard title="Total" value={stats.total} loading={loading} color="var(--danger)" />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  loading,
  color,
}: {
  title: string;
  value: number;
  loading: boolean;
  color: string;
}) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 14,
        boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 6 }}>
            {loading ? '…' : value}
          </div>
        </div>
        <div style={{ width: 12, height: 48, borderRadius: 999, background: color, opacity: 0.85 }} />
      </div>
    </div>
  );
}
