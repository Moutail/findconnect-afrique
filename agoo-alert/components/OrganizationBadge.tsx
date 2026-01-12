import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { ThemedText } from './themed-text';

interface OrganizationBadgeProps {
  organizationName: string;
  organizationLogo?: string;
  isVerified: boolean;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}

export function OrganizationBadge({
  organizationName,
  organizationLogo,
  isVerified,
  size = 'medium',
  showName = true,
}: OrganizationBadgeProps) {
  const logoSize = size === 'small' ? 24 : size === 'medium' ? 32 : 40;
  const iconSize = size === 'small' ? 14 : size === 'medium' ? 16 : 18;
  const fontSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;

  return (
    <View style={styles.container}>
      {organizationLogo && (
        <ExpoImage
          source={{ uri: organizationLogo }}
          style={[styles.logo, { width: logoSize, height: logoSize }]}
          contentFit="cover"
        />
      )}
      {showName && (
        <ThemedText style={[styles.name, { fontSize }]} numberOfLines={1}>
          {organizationName}
        </ThemedText>
      )}
      {isVerified && (
        <Ionicons name="checkmark-circle" size={iconSize} color="#1d4ed8" style={styles.badge} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
  },
  name: {
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  badge: {
    marginLeft: 2,
  },
});
