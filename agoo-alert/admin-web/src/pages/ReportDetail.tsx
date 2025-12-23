import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';

import { db } from '../firebase';

type ModerationStatus = 'pending' | 'approved' | 'rejected';

type ReportData = {
  type?: 'person' | 'object';
  title?: string;
  description?: string;
  city?: string;
  locationDetail?: string;
  contactPhone?: string;
  status?: string;
  imageUrl?: string;
  createdBy?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  moderationStatus?: ModerationStatus;
  moderatedAt?: { seconds: number; nanoseconds: number } | null;
  moderatedBy?: string | null;
  rejectionReason?: string | null;
  [key: string]: any;
};

type ChatMessage = {
  id: string;
  type: 'text' | 'image' | 'audio';
  text?: string;
  mediaUrl?: string;
  durationMs?: number;
  senderId: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

export default function ReportDetailPage() {
  const { id } = useParams();
  const [loadingReport, setLoadingReport] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoadingReport(true);
    setError(null);

    const ref = doc(db, 'reports', id);
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setReport(null);
          setError('Publication introuvable.');
        } else {
          setReport(snap.data() as any);
        }
        setLoadingReport(false);
      },
      (e) => {
        setError((e as any)?.message ?? String(e));
        setLoadingReport(false);
      }
    );
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoadingMessages(true);

    const q = query(collection(db, 'reports', id, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              type: data.type === 'image' || data.type === 'audio' ? data.type : 'text',
              text: data.text || '',
              mediaUrl: data.mediaUrl,
              durationMs: typeof data.durationMs === 'number' ? data.durationMs : undefined,
              senderId: data.senderId || '',
              createdAt: data.createdAt ?? null,
            } as ChatMessage;
          })
        );
        setLoadingMessages(false);
      },
      (e) => {
        setError((prev) => (prev ? prev + '\n' : '') + ((e as any)?.message ?? String(e)));
        setLoadingMessages(false);
      }
    );
  }, [id]);

  const entries = useMemo(() => {
    if (!report) return [];
    const orderedKeys = [
      'type',
      'title',
      'description',
      'city',
      'locationDetail',
      'contactPhone',
      'status',
      'moderationStatus',
      'createdBy',
      'createdAt',
      'imageUrl',
      'moderatedBy',
      'moderatedAt',
      'rejectionReason',
    ];

    const keys = new Set<string>([...orderedKeys, ...Object.keys(report)]);
    return [...keys]
      .filter((k) => report[k] !== undefined)
      .map((k) => ({ key: k, value: report[k] }));
  }, [report]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }}>
        <div>
          <h1 style={{ marginTop: 0, color: 'var(--ink)' }}>Détails</h1>
          <p style={{ marginTop: 6, color: 'var(--muted)' }}>
            <Link to="/reports" style={{ color: 'var(--primary)', fontWeight: 900 }}>
              ← Retour aux publications
            </Link>
          </p>
        </div>

        {report?.createdBy ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <Link
              to={`/users/${report.createdBy}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'white',
                color: 'var(--primary)',
                fontWeight: 900,
              }}
            >
              Contacter l’auteur
            </Link>
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          style={{
            marginTop: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 14,
            padding: 12,
            fontSize: 12,
            whiteSpace: 'pre-wrap',
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <section
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
          }}
        >
          <div
            style={{
              padding: 12,
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontWeight: 900,
              color: '#0f172a',
            }}
          >
            Informations publication
          </div>

          {loadingReport ? (
            <div style={{ padding: 12, color: '#64748b' }}>Chargement…</div>
          ) : !report ? (
            <div style={{ padding: 12, color: '#64748b' }}>Aucune donnée.</div>
          ) : (
            <div style={{ padding: 12, display: 'grid', gap: 10 }}>
              {entries.map((e) => (
                <KeyValue key={e.key} k={e.key} v={e.value} />
              ))}
            </div>
          )}
        </section>

        <section
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
          }}
        >
          <div
            style={{
              padding: 12,
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontWeight: 900,
              color: '#0f172a',
            }}
          >
            Conversation
          </div>

          {loadingMessages ? (
            <div style={{ padding: 12, color: '#64748b' }}>Chargement…</div>
          ) : messages.length === 0 ? (
            <div style={{ padding: 12, color: '#64748b' }}>Aucun message.</div>
          ) : (
            <div style={{ padding: 12, display: 'grid', gap: 10 }}>
              {messages.map((m) => (
                <MessageItem key={m.id} m={m} />
              ))}
            </div>
          )}
        </section>
      </div>

      <div style={{ marginTop: 12, color: '#64748b', fontSize: 12 }}>
        ID: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{id}</span>
      </div>
    </div>
  );
}

function KeyValue({ k, v }: { k: string; v: any }) {
  const value = formatValue(v);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 10,
        alignItems: 'start',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          color: '#334155',
          textTransform: 'none',
        }}
      >
        {k}
      </div>
      <div style={{ color: '#0f172a', fontSize: 13, whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  );
}

function MessageItem({ m }: { m: ChatMessage }) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: 10,
        background: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 12, color: '#334155', fontWeight: 900 }}>
          {m.type.toUpperCase()} — {m.senderId}
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{formatTimestamp(m.createdAt)}</div>
      </div>

      {m.type === 'text' ? (
        <div style={{ marginTop: 6, color: '#0f172a', whiteSpace: 'pre-wrap' }}>{m.text}</div>
      ) : m.type === 'image' ? (
        <div style={{ marginTop: 8 }}>
          {m.mediaUrl ? (
            <a href={m.mediaUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 900 }}>
              Ouvrir l'image
            </a>
          ) : (
            <span style={{ color: '#64748b' }}>Image sans URL</span>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {m.mediaUrl ? (
            <a href={m.mediaUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 900 }}>
              Ouvrir l'audio
            </a>
          ) : (
            <span style={{ color: '#64748b' }}>Audio sans URL</span>
          )}
          {typeof m.durationMs === 'number' ? (
            <div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>Durée: {Math.round(m.durationMs / 1000)}s</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function formatTimestamp(ts: any) {
  const seconds = ts?.seconds;
  if (typeof seconds !== 'number') return '-';
  try {
    return new Date(seconds * 1000).toLocaleString();
  } catch {
    return '-';
  }
}

function formatValue(v: any) {
  if (v === null) return 'null';
  if (v === undefined) return '-';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);

  if (typeof v === 'object' && typeof v?.seconds === 'number') {
    return formatTimestamp(v);
  }

  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
