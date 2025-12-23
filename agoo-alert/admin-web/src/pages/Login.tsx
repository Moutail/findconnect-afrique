import { useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAdminAuth } from '../auth';

export default function LoginPage() {
  const { loading, user, isModerator, signIn, signInWithGoogle } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user && isModerator) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(err?.message ?? 'Impossible de se connecter.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '85vh' }}>
      <div
        style={{
          width: 'min(420px, 94vw)',
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 18,
          boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20, color: 'var(--ink)' }}>Connexion Admin</h2>
        <p style={{ marginTop: 6, marginBottom: 16, color: 'var(--muted)', fontSize: 13 }}>
          Réservé aux comptes autorisés (rôle <b>moderator</b>).
        </p>

        {error ? (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: 12,
              padding: 10,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        ) : null}

        {!loading && user && !isModerator ? (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid var(--warning)',
              color: '#92400e',
              borderRadius: 12,
              padding: 10,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            Connecté en tant que <b>{user.email}</b>, mais ce compte n’a pas le rôle moderator.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="admin@email.com"
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                outline: 'none',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Mot de passe</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              placeholder="••••••••"
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                outline: 'none',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 6,
              borderRadius: 12,
              border: 0,
              background: 'var(--primary)',
              color: 'white',
              padding: '10px 12px',
              fontWeight: 800,
              cursor: 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <div style={{ height: 1, background: '#e2e8f0', flex: 1 }} />
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>OU</span>
            <div style={{ height: 1, background: '#e2e8f0', flex: 1 }} />
          </div>

          <button
            type="button"
            onClick={async () => {
              setError(null);
              setSubmitting(true);
              try {
                await signInWithGoogle();
              } catch (err: any) {
                setError(err?.message ?? 'Connexion Google impossible.');
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
            style={{
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              padding: '10px 12px',
              fontWeight: 800,
              cursor: 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            Continuer avec Google
          </button>
        </form>
      </div>
    </div>
  );
}
