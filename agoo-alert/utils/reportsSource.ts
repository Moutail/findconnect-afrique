import { collection, getDocs, limit as fsLimit, orderBy, query, where } from 'firebase/firestore';

import api, { reportsAPI } from '@/config/apiConfig';
import { db } from '@/config/firebaseConfig';

type BackendReport = any;

export type ReportListItem = {
  id: string;
  type: 'person' | 'object';
  kind?: 'lost' | 'found';
  title: string;
  city?: string;
  status?: string;
  imageUrl?: string;
  createdAt?: any;
  location?: any;
};

const isOfflineLikeError = (err: any) => {
  const message = String(err?.message || '').toLowerCase();
  return (
    err?.status === 0 ||
    message.includes('network') ||
    message.includes('connexion') ||
    message.includes('timeout')
  );
};

const mapBackendReport = (r: BackendReport): ReportListItem => {
  const mainCategory = r?.mainCategory;
  const type: ReportListItem['type'] = mainCategory === 'person' ? 'person' : 'object';
  const kind: ReportListItem['kind'] | undefined =
    type === 'object' ? (mainCategory === 'found' ? 'found' : 'lost') : undefined;

  const imageUrl =
    r?.imageUrl ||
    r?.images?.[0]?.url ||
    r?.images?.[0] ||
    r?.images?.[0]?.thumbnail ||
    undefined;

  return {
    id: String(r?._id || r?.id || ''),
    type,
    kind,
    title: r?.title || '',
    city: r?.location?.city,
    status: r?.status === 'resolved' ? 'resolved' : 'open',
    imageUrl,
    createdAt: r?.createdAt,
    location: r?.location,
  };
};

const mapFirestoreReport = (docSnap: any): ReportListItem => {
  const d = docSnap.data() as any;
  return {
    id: docSnap.id,
    type: d.type === 'person' ? 'person' : 'object',
    kind: d.kind === 'found' ? 'found' : 'lost',
    title: d.title || '',
    city: d.city,
    status: d.status || 'open',
    imageUrl: d.imageUrl,
    createdAt: d.createdAt ?? null,
    location: d.location,
  };
};

export async function fetchReportsBackendFirst(params?: {
  limit?: number;
}): Promise<{ reports: ReportListItem[]; source: 'backend' | 'firebase'; baseUrl: string }> {
  try {
    const response = await reportsAPI.getReports({ limit: params?.limit ?? 20 });
    const backendReports = Array.isArray((response as any)?.reports) ? (response as any).reports : [];
    return {
      reports: backendReports.map(mapBackendReport),
      source: 'backend',
      baseUrl: api.API_BASE_URL,
    };
  } catch (err: any) {
    if (!isOfflineLikeError(err) && !(err?.status >= 500)) {
      throw err;
    }

    const q = query(
      collection(db, 'reports'),
      where('moderationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      fsLimit(params?.limit ?? 20)
    );

    const snap = await getDocs(q);
    return {
      reports: snap.docs.map(mapFirestoreReport),
      source: 'firebase',
      baseUrl: api.API_BASE_URL,
    };
  }
}
