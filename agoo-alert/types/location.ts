// Types pour la géolocalisation

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  coordinates: Coordinates;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  accuracy?: number; // en mètres
  timestamp?: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface PlaceOfInterest {
  id: string;
  name: string;
  category: POICategory;
  coordinates: Coordinates;
  address?: string;
  description?: string;
  icon?: string;
}

export type POICategory =
  | 'transport_station'
  | 'university'
  | 'hospital'
  | 'market'
  | 'government'
  | 'landmark'
  | 'other';

export const POI_CATEGORY_LABELS: Record<POICategory, string> = {
  transport_station: 'Gare / Station',
  university: 'Université / École',
  hospital: 'Hôpital / Clinique',
  market: 'Marché',
  government: 'Bureau Gouvernemental',
  landmark: 'Point de Repère',
  other: 'Autre',
};

export const POI_CATEGORY_ICONS: Record<POICategory, string> = {
  transport_station: '🚉',
  university: '🎓',
  hospital: '🏥',
  market: '🏪',
  government: '🏛️',
  landmark: '📍',
  other: '📌',
};

// Points d'intérêt pré-définis pour Lomé, Togo
export const LOME_POI: PlaceOfInterest[] = [
  {
    id: 'gare_routiere_lome',
    name: 'Gare Routière de Lomé',
    category: 'transport_station',
    coordinates: { latitude: 6.1319, longitude: 1.2122 },
    address: 'Boulevard du 13 Janvier, Lomé',
    icon: '🚉',
  },
  {
    id: 'universite_lome',
    name: 'Université de Lomé',
    category: 'university',
    coordinates: { latitude: 6.1679, longitude: 1.2125 },
    address: 'Boulevard de la Kara, Lomé',
    icon: '🎓',
  },
  {
    id: 'chu_sylvanus_olympio',
    name: 'CHU Sylvanus Olympio',
    category: 'hospital',
    coordinates: { latitude: 6.1256, longitude: 1.2134 },
    address: 'Boulevard Jean-Paul II, Lomé',
    icon: '🏥',
  },
  {
    id: 'grand_marche_lome',
    name: 'Grand Marché de Lomé',
    category: 'market',
    coordinates: { latitude: 6.1291, longitude: 1.2179 },
    address: 'Rue du Grand Marché, Lomé',
    icon: '🏪',
  },
  {
    id: 'palais_presidentiel',
    name: 'Palais Présidentiel',
    category: 'government',
    coordinates: { latitude: 6.1274, longitude: 1.2311 },
    address: 'Boulevard de la Marina, Lomé',
    icon: '🏛️',
  },
  {
    id: 'monument_independance',
    name: 'Monument de l\'Indépendance',
    category: 'landmark',
    coordinates: { latitude: 6.1372, longitude: 1.2122 },
    address: 'Place de l\'Indépendance, Lomé',
    icon: '📍',
  },
];

// Centre de Lomé, Togo
export const LOME_CENTER: Coordinates = {
  latitude: 6.1319,
  longitude: 1.2122,
};

// Région par défaut pour la carte (Lomé avec zoom moyen)
export const DEFAULT_MAP_REGION: MapRegion = {
  latitude: LOME_CENTER.latitude,
  longitude: LOME_CENTER.longitude,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Calcul de distance entre deux coordonnées (formule de Haversine)
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return d;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Formater la distance en texte
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  } else {
    return `${Math.round(distanceKm)} km`;
  }
}

// Vérifier si des coordonnées sont valides
export function isValidCoordinates(coords: Coordinates | null | undefined): boolean {
  if (!coords) return false;
  const { latitude, longitude } = coords;
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

// Obtenir la région de carte pour afficher plusieurs marqueurs
export function getRegionForCoordinates(points: Coordinates[]): MapRegion {
  if (points.length === 0) {
    return DEFAULT_MAP_REGION;
  }

  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  let minX = points[0].latitude;
  let maxX = points[0].latitude;
  let minY = points[0].longitude;
  let maxY = points[0].longitude;

  points.forEach((point) => {
    minX = Math.min(minX, point.latitude);
    maxX = Math.max(maxX, point.latitude);
    minY = Math.min(minY, point.longitude);
    maxY = Math.max(maxY, point.longitude);
  });

  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const deltaX = (maxX - minX) * 1.5; // Padding de 50%
  const deltaY = (maxY - minY) * 1.5;

  return {
    latitude: midX,
    longitude: midY,
    latitudeDelta: Math.max(deltaX, 0.01),
    longitudeDelta: Math.max(deltaY, 0.01),
  };
}
