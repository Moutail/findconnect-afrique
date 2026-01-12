import { useEffect, useState } from 'react';
import {
  collection,
  getCountFromServer,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

import { db } from '../firebase';
import { Link } from 'react-router-dom';

type Stats = {
  // Reports
  pendingReports: number;
  approvedReports: number;
  rejectedReports: number;
  totalReports: number;
  todayReports: number;

  // Verifications
  pendingVerifications: number;
  approvedVerifications: number;
  rejectedVerifications: number;
  totalVerifications: number;

  // Users
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;

  // Activity
  recentActivity: ActivityItem[];
};

interface ActivityItem {
  id: string;
  type: 'report' | 'verification' | 'user';
  action: string;
  title: string;
  time: Date;
  status?: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    pendingReports: 0,
    approvedReports: 0,
    rejectedReports: 0,
    totalReports: 0,
    todayReports: 0,
    pendingVerifications: 0,
    approvedVerifications: 0,
    rejectedVerifications: 0,
    totalVerifications: 0,
    totalUsers: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0,
    recentActivity: [],
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Get today's start timestamp
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        // Reports stats
        const reportsCol = collection(db, 'reports');
        const [pendingReportsSnap, approvedReportsSnap, rejectedReportsSnap, totalReportsSnap, todayReportsSnap] = await Promise.all([
          getCountFromServer(query(reportsCol, where('moderationStatus', '==', 'pending'))),
          getCountFromServer(query(reportsCol, where('moderationStatus', '==', 'approved'))),
          getCountFromServer(query(reportsCol, where('moderationStatus', '==', 'rejected'))),
          getCountFromServer(query(reportsCol)),
          getCountFromServer(query(reportsCol, where('createdAt', '>=', todayTimestamp))),
        ]);

        // Verifications stats
        const verificationsCol = collection(db, 'verificationRequests');
        const [pendingVerSnap, approvedVerSnap, rejectedVerSnap, totalVerSnap] = await Promise.all([
          getCountFromServer(query(verificationsCol, where('status', '==', 'pending'))),
          getCountFromServer(query(verificationsCol, where('status', '==', 'approved'))),
          getCountFromServer(query(verificationsCol, where('status', '==', 'rejected'))),
          getCountFromServer(query(verificationsCol)),
        ]);

        // Users stats
        const usersCol = collection(db, 'users');
        const [totalUsersSnap, verifiedUsersSnap, unverifiedUsersSnap] = await Promise.all([
          getCountFromServer(query(usersCol)),
          getCountFromServer(query(usersCol, where('verificationStatus', '==', 'approved'))),
          getCountFromServer(query(usersCol, where('verificationStatus', '==', 'unverified'))),
        ]);

        setStats((prev) => ({
          ...prev,
          pendingReports: pendingReportsSnap.data().count,
          approvedReports: approvedReportsSnap.data().count,
          rejectedReports: rejectedReportsSnap.data().count,
          totalReports: totalReportsSnap.data().count,
          todayReports: todayReportsSnap.data().count,
          pendingVerifications: pendingVerSnap.data().count,
          approvedVerifications: approvedVerSnap.data().count,
          rejectedVerifications: rejectedVerSnap.data().count,
          totalVerifications: totalVerSnap.data().count,
          totalUsers: totalUsersSnap.data().count,
          verifiedUsers: verifiedUsersSnap.data().count,
          unverifiedUsers: unverifiedUsersSnap.data().count,
        }));
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Listen to recent activity
    const recentReportsQuery = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(recentReportsQuery, (snapshot) => {
      const activity: ActivityItem[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'report' as const,
          action: 'Nouvelle déclaration',
          title: data.title || 'Sans titre',
          time: data.createdAt?.toDate() || new Date(),
          status: data.moderationStatus,
        };
      });

      setStats((prev) => ({ ...prev, recentActivity: activity }));
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ marginTop: 0, color: '#0f172a', fontSize: 32, fontWeight: 800 }}>
          Dashboard Administratif
        </h1>
        <p style={{ marginTop: 8, color: '#64748b', fontSize: 15 }}>
          Vue d'ensemble de la plateforme FindConnect Afrique
        </p>
      </div>

      {/* Overview Cards */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 16 }}>
          Vue d'Ensemble
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <OverviewCard
            icon="📊"
            title="Total Déclarations"
            value={stats.totalReports}
            subtitle={`+${stats.todayReports} aujourd'hui`}
            loading={loading}
            color="#3b82f6"
          />
          <OverviewCard
            icon="⏳"
            title="En Attente"
            value={stats.pendingReports}
            subtitle="Déclarations à modérer"
            loading={loading}
            color="#f59e0b"
            link="/reports"
          />
          <OverviewCard
            icon="✅"
            title="Approuvées"
            value={stats.approvedReports}
            subtitle="Déclarations validées"
            loading={loading}
            color="#10b981"
          />
          <OverviewCard
            icon="👥"
            title="Utilisateurs"
            value={stats.totalUsers}
            subtitle={`${stats.verifiedUsers} vérifiés`}
            loading={loading}
            color="#8b5cf6"
            link="/users"
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Left Column */}
        <div>
          {/* Reports Section */}
          <Section title="📋 Déclarations" linkTo="/reports" linkText="Voir tout">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <MiniStatCard
                label="En attente"
                value={stats.pendingReports}
                loading={loading}
                color="#f59e0b"
              />
              <MiniStatCard
                label="Approuvées"
                value={stats.approvedReports}
                loading={loading}
                color="#10b981"
              />
              <MiniStatCard
                label="Rejetées"
                value={stats.rejectedReports}
                loading={loading}
                color="#ef4444"
              />
            </div>
          </Section>

          {/* Verifications Section */}
          <Section title="🪪 Vérifications d'Identité" linkTo="/verifications" linkText="Voir tout">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <MiniStatCard
                label="Total"
                value={stats.totalVerifications}
                loading={loading}
                color="#3b82f6"
              />
              <MiniStatCard
                label="En attente"
                value={stats.pendingVerifications}
                loading={loading}
                color="#f59e0b"
                highlight={stats.pendingVerifications > 0}
              />
              <MiniStatCard
                label="Approuvées"
                value={stats.approvedVerifications}
                loading={loading}
                color="#10b981"
              />
              <MiniStatCard
                label="Rejetées"
                value={stats.rejectedVerifications}
                loading={loading}
                color="#ef4444"
              />
            </div>
          </Section>

          {/* Users Section */}
          <Section title="👥 Utilisateurs" linkTo="/users" linkText="Voir tout">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <MiniStatCard
                label="Total"
                value={stats.totalUsers}
                loading={loading}
                color="#8b5cf6"
              />
              <MiniStatCard
                label="Vérifiés"
                value={stats.verifiedUsers}
                loading={loading}
                color="#10b981"
              />
              <MiniStatCard
                label="Non vérifiés"
                value={stats.unverifiedUsers}
                loading={loading}
                color="#94a3b8"
              />
            </div>
          </Section>
        </div>

        {/* Right Column - Activity Feed */}
        <div>
          <Section title="🕐 Activité Récente">
            {stats.recentActivity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 14 }}>
                Aucune activité récente
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.recentActivity.map((item) => (
                  <ActivityCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </Section>

          {/* Quick Actions */}
          <Section title="⚡ Actions Rapides" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <QuickActionButton
                icon="📋"
                label="Modérer les déclarations"
                count={stats.pendingReports}
                to="/reports"
              />
              <QuickActionButton
                icon="🪪"
                label="Vérifier les identités"
                count={stats.pendingVerifications}
                to="/verifications"
              />
              <QuickActionButton
                icon="👥"
                label="Gérer les utilisateurs"
                to="/users"
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({
  icon,
  title,
  value,
  subtitle,
  loading,
  color,
  link,
}: {
  icon: string;
  title: string;
  value: number;
  subtitle: string;
  loading: boolean;
  color: string;
  link?: string;
}) {
  const content = (
    <div
      style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
        transition: 'all 0.2s',
        cursor: link ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (link) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,23,42,0.12)';
        }
      }}
      onMouseLeave={(e) => {
        if (link) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,0.08)';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>
            {title}
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
            {loading ? '…' : value.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{subtitle}</div>
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  return link ? <Link to={link} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

function Section({
  title,
  linkTo,
  linkText,
  children,
  style,
}: {
  title: string;
  linkTo?: string;
  linkText?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
        marginBottom: 24,
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{title}</h3>
        {linkTo && linkText && (
          <Link
            to={linkTo}
            style={{
              fontSize: 13,
              color: 'var(--primary)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {linkText} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function MiniStatCard({
  label,
  value,
  loading,
  color,
  highlight,
}: {
  label: string;
  value: number;
  loading: boolean;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: highlight ? `${color}10` : '#f8fafc',
        border: `2px solid ${highlight ? color : '#e2e8f0'}`,
        borderRadius: 12,
        padding: 16,
        textAlign: 'center',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 900, color, marginBottom: 4 }}>
        {loading ? '…' : value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'À l\'instant';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${Math.floor(hours / 24)}j`;
  };

  return (
    <div
      style={{
        background: '#f8fafc',
        borderRadius: 10,
        padding: 12,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', flex: 1 }}>
          {item.action}
        </div>
        {item.status && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: getStatusColor(item.status),
              marginTop: 4,
            }}
          />
        )}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{item.title}</div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>{getTimeAgo(item.time)}</div>
    </div>
  );
}

function QuickActionButton({
  icon,
  label,
  count,
  to,
}: {
  icon: string;
  label: string;
  count?: number;
  to: string;
}) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        textDecoration: 'none',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f1f5f9';
        e.currentTarget.style.borderColor = 'var(--primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#f8fafc';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <div
          style={{
            background: 'var(--primary)',
            color: 'white',
            borderRadius: 12,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {count}
        </div>
      )}
    </Link>
  );
}
