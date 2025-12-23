import { Link, NavLink, Outlet } from 'react-router-dom';

import { useAdminAuth } from '../auth';

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  textDecoration: 'none',
  color: isActive ? '#0f172a' : '#475569',
  fontWeight: isActive ? 800 : 600,
});

export default function Layout() {
  const { user, signOut } = useAdminAuth();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontWeight: 900, color: 'var(--ink)' }}>Agoo Alert</span>
            <span style={{ marginLeft: 8, color: 'var(--primary)', fontWeight: 900 }}>Admin</span>
          </Link>

          <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <NavLink to="/dashboard" style={navLinkStyle}>Dashboard</NavLink>
            <NavLink to="/reports" style={navLinkStyle}>Publications</NavLink>
            <NavLink to="/users" style={navLinkStyle}>Utilisateurs</NavLink>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{user?.email}</span>
            <button
              onClick={() => signOut()}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                borderRadius: 10,
                padding: '8px 10px',
                cursor: 'pointer',
                fontWeight: 700,
                color: 'var(--ink)',
              }}
            >
              Déconnexion
            </button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 18 }}>
        <Outlet />
      </main>
    </div>
  );
}
