import { Timestamp } from 'firebase/firestore';

export type OrganizationType =
  | 'transport_station'
  | 'education_institution'
  | 'healthcare_facility'
  | 'government_office'
  | 'business'
  | 'ngo'
  | 'religious_org'
  | 'media'
  | 'other';

export type OrganizationCategory =
  | 'transport'
  | 'education'
  | 'health'
  | 'government'
  | 'commerce'
  | 'nonprofit'
  | 'religion'
  | 'media'
  | 'other';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type MemberStatus = 'active' | 'suspended';
export type OrganizationStatus = 'active' | 'inactive' | 'suspended';

export type MemberRole = 'owner' | 'admin' | 'moderator' | 'publisher' | 'viewer';

export interface OrganizationPermissions {
  canPublish: boolean;
  canEditOrg: boolean;
  canManageMembers: boolean;
  canViewAnalytics: boolean;
  canDeletePosts: boolean;
}

export interface Address {
  street: string;
  city: string;
  region: string;
  country: string;
  postalCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface VerificationDocuments {
  registrationNumber?: string;
  taxId?: string;
  documentUrls: string[];
}

export interface OrganizationStats {
  totalPosts: number;
  totalFollowers: number;
  totalViews: number;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  email: string;
}

export interface Organization {
  id: string;
  name: string;
  legalName: string;
  type: OrganizationType;
  category: OrganizationCategory;

  email: string;
  phone: string;
  address: Address;

  logo?: string;
  banner?: string;
  photos?: string[];

  verificationStatus: VerificationStatus;
  verificationDocuments: VerificationDocuments;
  verifiedAt?: Timestamp;
  verifiedBy?: string;

  canPost: boolean;
  canVerify: boolean;
  maxPostsPerDay: number;

  parentOrgId?: string;
  childOrgIds?: string[];

  stats: OrganizationStats;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  status: OrganizationStatus;

  emergencyContact?: EmergencyContact;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;

  role: MemberRole;
  permissions: OrganizationPermissions;

  invitedBy?: string;
  invitedAt?: Timestamp;
  joinedAt: Timestamp;
  status: MemberStatus;
}

export type RequestType = 'new_organization' | 'claim_existing' | 'join_organization';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface OrganizationRequestData {
  name: string;
  legalName: string;
  type: OrganizationType;
  category: OrganizationCategory;
  email: string;
  phone: string;
  address: Address;
}

export interface RequestDocuments {
  registrationCertificate?: string;
  businessLicense?: string;
  idCard?: string;
  proofOfAuthority?: string;
  other?: string[];
}

export interface OrganizationRequest {
  id: string;
  requestType: RequestType;

  organizationData: OrganizationRequestData;

  requestedBy: string;
  requestedByName: string;
  requestedByEmail: string;
  requestedByPhone: string;
  requestedRole: MemberRole;

  documents: RequestDocuments;

  status: RequestStatus;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  reviewNotes?: string;

  submittedAt: Timestamp;
  updatedAt: Timestamp;
}

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  transport_station: 'Gare / Station de Transport',
  education_institution: 'Université / École',
  healthcare_facility: 'Hôpital / Clinique',
  government_office: 'Bureau Gouvernemental',
  business: 'Entreprise',
  ngo: 'ONG',
  religious_org: 'Organisation Religieuse',
  media: 'Média',
  other: 'Autre',
};

export const ORGANIZATION_CATEGORY_LABELS: Record<OrganizationCategory, string> = {
  transport: 'Transport',
  education: 'Éducation',
  health: 'Santé',
  government: 'Gouvernement',
  commerce: 'Commerce',
  nonprofit: 'À but non lucratif',
  religion: 'Religion',
  media: 'Média',
  other: 'Autre',
};

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  moderator: 'Modérateur',
  publisher: 'Éditeur',
  viewer: 'Lecteur',
};

export const DEFAULT_PERMISSIONS: Record<MemberRole, OrganizationPermissions> = {
  owner: {
    canPublish: true,
    canEditOrg: true,
    canManageMembers: true,
    canViewAnalytics: true,
    canDeletePosts: true,
  },
  admin: {
    canPublish: true,
    canEditOrg: true,
    canManageMembers: true,
    canViewAnalytics: true,
    canDeletePosts: true,
  },
  moderator: {
    canPublish: true,
    canEditOrg: false,
    canManageMembers: false,
    canViewAnalytics: true,
    canDeletePosts: true,
  },
  publisher: {
    canPublish: true,
    canEditOrg: false,
    canManageMembers: false,
    canViewAnalytics: false,
    canDeletePosts: false,
  },
  viewer: {
    canPublish: false,
    canEditOrg: false,
    canManageMembers: false,
    canViewAnalytics: false,
    canDeletePosts: false,
  },
};
