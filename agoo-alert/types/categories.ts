// Système de catégories avancées pour FindConnect Afrique

export type MainCategory =
  | 'lost'           // Objets perdus
  | 'found'          // Objets trouvés
  | 'person'         // Personnes (perdues/recherchées)
  | 'pet'            // Animaux
  | 'vehicle'        // Véhicules
  | 'document'       // Documents officiels
  | 'electronics'    // Électronique
  | 'other';         // Autre

export type SubCategory = {
  // Objets perdus/trouvés
  personal_items: 'wallet' | 'keys' | 'phone' | 'bag' | 'jewelry' | 'clothing' | 'other_personal';
  electronics: 'smartphone' | 'laptop' | 'tablet' | 'camera' | 'headphones' | 'other_electronics';
  documents: 'id_card' | 'passport' | 'drivers_license' | 'birth_certificate' | 'diploma' | 'bank_card' | 'other_document';
  vehicles: 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'other_vehicle';
  pets: 'dog' | 'cat' | 'bird' | 'other_pet';
  accessories: 'watch' | 'glasses' | 'umbrella' | 'hat' | 'shoes' | 'other_accessory';
};

export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'unknown';

export type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
export type PetSize = 'tiny' | 'small' | 'medium' | 'large' | 'extra_large';
export type PetGender = 'male' | 'female' | 'unknown';

export type PersonType = 'missing_child' | 'missing_adult' | 'missing_elderly' | 'wanted';
export type PersonGender = 'male' | 'female' | 'other';

export type VehicleType = 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'truck' | 'bus' | 'other';
export type VehicleColor = 'black' | 'white' | 'silver' | 'gray' | 'red' | 'blue' | 'green' | 'yellow' | 'brown' | 'orange' | 'other';

export interface CategoryMetadata {
  // Informations de base
  mainCategory: MainCategory;
  subCategory?: string;

  // Métadonnées spécifiques aux objets
  itemDetails?: {
    brand?: string;
    model?: string;
    color?: string;
    condition?: ItemCondition;
    serialNumber?: string;
    distinctiveFeatures?: string;
  };

  // Métadonnées spécifiques aux animaux
  petDetails?: {
    type: PetType;
    breed?: string;
    name?: string;
    age?: number;
    ageUnit?: 'months' | 'years';
    size?: PetSize;
    gender?: PetGender;
    color?: string;
    microchipId?: string;
    vaccinated?: boolean;
    distinctiveFeatures?: string;
  };

  // Métadonnées spécifiques aux personnes
  personDetails?: {
    type: PersonType;
    firstName?: string;
    lastName?: string;
    age?: number;
    gender?: PersonGender;
    height?: number; // en cm
    weight?: number; // en kg
    eyeColor?: string;
    hairColor?: string;
    lastSeenLocation?: string;
    lastSeenDate?: Date;
    clothing?: string;
    distinctiveFeatures?: string;
  };

  // Métadonnées spécifiques aux véhicules
  vehicleDetails?: {
    type: VehicleType;
    make?: string; // Marque
    model?: string;
    year?: number;
    color?: VehicleColor;
    licensePlate?: string;
    vin?: string; // Vehicle Identification Number
    distinctiveFeatures?: string;
  };

  // Métadonnées spécifiques aux documents
  documentDetails?: {
    documentType?: string;
    documentNumber?: string;
    issuingAuthority?: string;
    ownerName?: string;
  };
}

export const MAIN_CATEGORY_LABELS: Record<MainCategory, string> = {
  lost: 'Objet perdu',
  found: 'Objet trouvé',
  person: 'Personne',
  pet: 'Animal',
  vehicle: 'Véhicule',
  document: 'Document',
  electronics: 'Électronique',
  other: 'Autre',
};

export const MAIN_CATEGORY_ICONS: Record<MainCategory, string> = {
  lost: '🔍',
  found: '✅',
  person: '👤',
  pet: '🐾',
  vehicle: '🚗',
  document: '📄',
  electronics: '📱',
  other: '📦',
};

export const MAIN_CATEGORY_COLORS: Record<MainCategory, string> = {
  lost: '#ef4444',      // Rouge
  found: '#10b981',     // Vert
  person: '#f59e0b',    // Orange
  pet: '#8b5cf6',       // Violet
  vehicle: '#3b82f6',   // Bleu
  document: '#6366f1',  // Indigo
  electronics: '#06b6d4', // Cyan
  other: '#64748b',     // Gris
};

export const SUB_CATEGORY_LABELS = {
  // Personal Items
  wallet: 'Portefeuille',
  keys: 'Clés',
  phone: 'Téléphone',
  bag: 'Sac',
  jewelry: 'Bijoux',
  clothing: 'Vêtements',
  other_personal: 'Autre objet personnel',

  // Electronics
  smartphone: 'Smartphone',
  laptop: 'Ordinateur portable',
  tablet: 'Tablette',
  camera: 'Appareil photo',
  headphones: 'Écouteurs',
  other_electronics: 'Autre électronique',

  // Documents
  id_card: 'Carte d\'identité',
  passport: 'Passeport',
  drivers_license: 'Permis de conduire',
  birth_certificate: 'Acte de naissance',
  diploma: 'Diplôme',
  bank_card: 'Carte bancaire',
  other_document: 'Autre document',

  // Vehicles
  car: 'Voiture',
  motorcycle: 'Moto',
  bicycle: 'Vélo',
  scooter: 'Scooter',
  other_vehicle: 'Autre véhicule',

  // Pets
  dog: 'Chien',
  cat: 'Chat',
  bird: 'Oiseau',
  other_pet: 'Autre animal',

  // Accessories
  watch: 'Montre',
  glasses: 'Lunettes',
  umbrella: 'Parapluie',
  hat: 'Chapeau',
  shoes: 'Chaussures',
  other_accessory: 'Autre accessoire',
};

export const ITEM_CONDITION_LABELS: Record<ItemCondition, string> = {
  new: 'Neuf',
  like_new: 'Comme neuf',
  good: 'Bon état',
  fair: 'État correct',
  poor: 'Mauvais état',
  unknown: 'État inconnu',
};

export const PET_TYPE_LABELS: Record<PetType, string> = {
  dog: 'Chien',
  cat: 'Chat',
  bird: 'Oiseau',
  rabbit: 'Lapin',
  other: 'Autre',
};

export const PET_SIZE_LABELS: Record<PetSize, string> = {
  tiny: 'Très petit',
  small: 'Petit',
  medium: 'Moyen',
  large: 'Grand',
  extra_large: 'Très grand',
};

export const PET_GENDER_LABELS: Record<PetGender, string> = {
  male: 'Mâle',
  female: 'Femelle',
  unknown: 'Inconnu',
};

export const PERSON_TYPE_LABELS: Record<PersonType, string> = {
  missing_child: 'Enfant disparu',
  missing_adult: 'Adulte disparu',
  missing_elderly: 'Personne âgée disparue',
  wanted: 'Personne recherchée',
};

export const PERSON_GENDER_LABELS: Record<PersonGender, string> = {
  male: 'Homme',
  female: 'Femme',
  other: 'Autre',
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Voiture',
  motorcycle: 'Moto',
  bicycle: 'Vélo',
  scooter: 'Scooter',
  truck: 'Camion',
  bus: 'Bus',
  other: 'Autre',
};

export const VEHICLE_COLOR_LABELS: Record<VehicleColor, string> = {
  black: 'Noir',
  white: 'Blanc',
  silver: 'Argent',
  gray: 'Gris',
  red: 'Rouge',
  blue: 'Bleu',
  green: 'Vert',
  yellow: 'Jaune',
  brown: 'Marron',
  orange: 'Orange',
  other: 'Autre',
};

// Fonction helper pour obtenir les sous-catégories selon la catégorie principale
export function getSubCategoriesForMain(mainCategory: MainCategory): string[] {
  switch (mainCategory) {
    case 'lost':
    case 'found':
      return [
        'wallet', 'keys', 'phone', 'bag', 'jewelry', 'clothing',
        'smartphone', 'laptop', 'tablet', 'camera', 'headphones',
        'watch', 'glasses', 'umbrella', 'hat', 'shoes',
        'other_personal', 'other_electronics', 'other_accessory'
      ];
    case 'electronics':
      return ['smartphone', 'laptop', 'tablet', 'camera', 'headphones', 'other_electronics'];
    case 'document':
      return ['id_card', 'passport', 'drivers_license', 'birth_certificate', 'diploma', 'bank_card', 'other_document'];
    case 'vehicle':
      return ['car', 'motorcycle', 'bicycle', 'scooter', 'other_vehicle'];
    case 'pet':
      return ['dog', 'cat', 'bird', 'other_pet'];
    case 'person':
      return []; // Pas de sous-catégories pour personnes, utilise personDetails.type
    case 'other':
      return [];
    default:
      return [];
  }
}

// Fonction pour obtenir le label d'une sous-catégorie
export function getSubCategoryLabel(subCategory: string): string {
  return SUB_CATEGORY_LABELS[subCategory as keyof typeof SUB_CATEGORY_LABELS] || subCategory;
}

// Fonction pour valider les métadonnées de catégorie
export function validateCategoryMetadata(metadata: CategoryMetadata): boolean {
  if (!metadata.mainCategory) {
    return false;
  }

  // Validation spécifique selon la catégorie
  switch (metadata.mainCategory) {
    case 'pet':
      return !!metadata.petDetails?.type;
    case 'person':
      return !!metadata.personDetails?.type;
    case 'vehicle':
      return !!metadata.vehicleDetails?.type;
    default:
      return true;
  }
}
