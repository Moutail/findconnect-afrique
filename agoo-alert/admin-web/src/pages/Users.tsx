import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';

import { db } from '../firebase';

type UserRow = {
  id: string;
  displayName?: string;
  phone?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
};

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'users'), orderBy('updatedAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              displayName: data.displayName,
              phone: data.phone,
              createdAt: data.createdAt ?? null,
              updatedAt: data.updatedAt ?? null,
            } as UserRow;
          })
        );
        setLoading(false);
        setError(null);
      },
      (e) => {
        setLoading(false);
        setError((e as any)?.message ?? 'Impossible de charger les utilisateurs.');
      }
    );
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) => {
      return (
        u.id.toLowerCase().includes(q) ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q))
      );
    });
  }, [rows, search]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--ink)' }}>Utilisateurs</h2>
          <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
            Liste des profils synchronisés depuis l’application mobile.
          </div>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, téléphone, uid)…"
          style={{
            width: 'min(360px, 92vw)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            padding: '10px 12px',
            background: 'white',
            outline: 'none',
          }}
        />
      </div>

      {loading ? <div style={{ color: 'var(--muted)' }}>Chargement…</div> : null}
      {error ? (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 12,
            padding: 10,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1.2fr auto',
            gap: 12,
            padding: 12,
            borderBottom: '1px solid var(--border)',
            color: 'var(--muted)',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          <div>Nom</div>
          <div>Téléphone</div>
          <div>UID</div>
          <div></div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--muted)' }}>Aucun utilisateur.</div>
        ) : (
          filtered.map((u) => (
            <div
              key={u.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1.2fr auto',
                gap: 12,
                padding: 12,
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{u.displayName || '—'}</div>
              <div style={{ color: 'var(--muted)', fontWeight: 700 }}>{u.phone || '—'}</div>
              <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, color: 'var(--muted)' }}>
                {u.id}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Link to={`/users/${u.id}`} style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'none' }}>
                  Envoyer un message
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ color: 'var(--muted)', fontSize: 12 }}>
        Total: <b style={{ color: 'var(--ink)' }}>{filtered.length}</b>
      </div>
    </div>
  );
}
