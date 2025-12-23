import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../firebase';
import { useAdminAuth } from '../auth';

type UserProfile = {
  displayName?: string;
  phone?: string;
};

type ChatMessage = {
  id: string;
  type: 'text';
  text: string;
  senderId: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

export default function UserChatPage() {
  const { id } = useParams();
  const { user } = useAdminAuth();
  const userId = id || '';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const conversationId = useMemo(() => {
    if (!userId) return '';
    return `support_${userId}`;
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubMsgs = onSnapshot(
      query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc')),
      (snap) => {
        setMessages(
          snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              type: 'text',
              text: data.text || '',
              senderId: data.senderId || '',
              createdAt: data.createdAt ?? null,
            } as ChatMessage;
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubProfile = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (!snap.exists()) {
        setProfile(null);
      } else {
        const d = snap.data() as any;
        setProfile({ displayName: d.displayName, phone: d.phone });
      }
    });

    return () => {
      unsubMsgs();
      unsubProfile();
    };
  }, [conversationId, userId]);

  const ensureConversation = async () => {
    if (!user?.uid) return;
    if (!userId) return;

    const ref = doc(db, 'conversations', conversationId);
    const snap = await getDoc(ref);
    if (snap.exists()) return;

    await setDoc(ref, {
      reportId: null,
      ownerId: user.uid,
      contactId: userId,
      participants: [user.uid, userId],
      createdAt: serverTimestamp(),
      lastMessageText: null,
      lastMessageAt: serverTimestamp(),
      kind: 'support',
    });
  };

  const send = async () => {
    const adminId = user?.uid;
    if (!adminId) return;
    if (!userId) return;
    const clean = text.trim();
    if (!clean) return;

    setSending(true);
    try {
      setText('');
      await ensureConversation();

      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        type: 'text',
        text: clean,
        senderId: adminId,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessageText: clean,
        lastMessageAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link to="/users" style={{ color: 'var(--muted)', fontWeight: 900 }}>
              ← Utilisateurs
            </Link>
          </div>
          <h2 style={{ margin: '6px 0 0 0', color: 'var(--ink)' }}>Message utilisateur</h2>
          <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
            {profile?.displayName || 'Utilisateur'} • {profile?.phone || '—'}
          </div>
          <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
            {userId}
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 12,
          minHeight: 420,
          display: 'grid',
          gridTemplateRows: '1fr auto',
          gap: 12,
        }}
      >
        <div style={{ overflow: 'auto', display: 'grid', gap: 10 }}>
          {loading ? <div style={{ color: 'var(--muted)' }}>Chargement…</div> : null}
          {messages.length === 0 && !loading ? (
            <div style={{ color: 'var(--muted)' }}>Aucun message pour le moment.</div>
          ) : null}

          {messages.map((m) => {
            const isAdmin = m.senderId === user?.uid;
            return (
              <div
                key={m.id}
                style={{
                  justifySelf: isAdmin ? 'end' : 'start',
                  maxWidth: 520,
                  background: isAdmin ? 'var(--primary)' : '#f1f5f9',
                  color: isAdmin ? 'var(--primary-ink)' : 'var(--ink)',
                  borderRadius: 14,
                  padding: '10px 12px',
                  border: isAdmin ? '1px solid rgba(0,0,0,0)' : '1px solid var(--border)',
                  fontWeight: 700,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.text}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrire un message…"
            style={{
              flex: 1,
              borderRadius: 12,
              border: '1px solid var(--border)',
              padding: '10px 12px',
              background: 'white',
              outline: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button onClick={send} disabled={sending} style={{ background: 'var(--primary)', color: 'var(--primary-ink)', borderColor: 'var(--primary)' }}>
            {sending ? '…' : 'Envoyer'}
          </button>
        </div>
      </div>

      <div style={{ color: 'var(--muted)', fontSize: 12 }}>
        Le message arrive dans l’app mobile via la conversation <b>{conversationId}</b>.
      </div>
    </div>
  );
}
