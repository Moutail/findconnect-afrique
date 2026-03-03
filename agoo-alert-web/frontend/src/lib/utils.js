import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return formatDate(date);
}

export const PUBLICATION_TYPE_LABELS = {
  lost: 'Perdu',
  found: 'Trouvé',
};

export const CATEGORY_LABELS = {
  person: 'Personne',
  object: 'Objet',
  animal: 'Animal',
  document: 'Document',
  electronics: 'Électronique',
  vehicle: 'Véhicule',
  other: 'Autre',
};

export const STATUS_LABELS = {
  active: 'Actif',
  resolved: 'Résolu',
  closed: 'Fermé',
  expired: 'Expiré',
};

export const MODERATION_LABELS = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
};

export const VERIFICATION_LABELS = {
  none: 'Non vérifié',
  pending: 'En cours',
  approved: 'Vérifié',
  rejected: 'Rejeté',
};

export const ORGANIZATION_TYPE_LABELS = {
  school: 'École',
  university: 'Université',
  training_center: 'Centre de formation',
  hospital: 'Hôpital',
  government_office: 'Administration publique',
  transport_station: 'Gare / Station',
  business: 'Entreprise',
  ngo: 'ONG',
  religious_org: 'Organisation religieuse',
  other: 'Autre',
};
