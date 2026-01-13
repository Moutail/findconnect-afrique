import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/config/firebaseConfig';
import { ThemedText } from './themed-text';
import { Organization } from '@/types/organizations';

export type PublishContext =
  | { type: 'user' }
  | { type: 'organization'; organizationId: string; organizationName: string; organizationLogo?: string };

interface PublishContextSelectorProps {
  selectedContext: PublishContext;
  onContextChange: (context: PublishContext) => void;
}

export function PublishContextSelector({ selectedContext, onContextChange }: PublishContextSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadUserOrganizations();
  }, []);

  const loadUserOrganizations = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const membersQuery = query(
        collection(db, 'organizationMembers'),
        where('userId', '==', user.uid),
        where('status', '==', 'active')
      );

      const membersSnap = await getDocs(membersQuery);
      const orgIds = membersSnap.docs
        .filter((doc) => doc.data().permissions?.canPublish === true)
        .map((doc) => doc.data().organizationId);

      if (orgIds.length === 0) {
        setOrganizations([]);
        setLoading(false);
        return;
      }

      const orgsPromises = orgIds.map(async (orgId) => {
        const orgSnap = await getDocs(query(collection(db, 'organizations'), where('__name__', '==', orgId)));
        const doc0 = orgSnap.docs[0];
        if (!doc0) return null;
        return { id: doc0.id, ...(doc0.data() as Omit<Organization, 'id'>) } as Organization;
      });

      const orgs = (await Promise.all(orgsPromises)).filter((org): org is Organization => !!org);
      setOrganizations(orgs.filter((org) => org.verificationStatus === 'approved' && org.canPost));
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContext = (context: PublishContext) => {
    onContextChange(context);
    setShowDropdown(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1d4ed8" />
        <ThemedText style={styles.loadingText}>Chargement...</ThemedText>
      </View>
    );
  }

  if (organizations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>Publier en tant que:</ThemedText>

      <TouchableOpacity style={styles.selector} onPress={() => setShowDropdown(!showDropdown)} activeOpacity={0.7}>
        <View style={styles.selectedContext}>
          {selectedContext.type === 'user' ? (
            <>
              <Ionicons name="person-circle-outline" size={24} color="#64748b" />
              <ThemedText style={styles.selectedText}>Compte personnel</ThemedText>
            </>
          ) : (
            <>
              {selectedContext.organizationLogo && (
                <ExpoImage
                  source={{ uri: selectedContext.organizationLogo }}
                  style={styles.orgLogo}
                  contentFit="cover"
                />
              )}
              <ThemedText style={styles.selectedText} numberOfLines={1}>
                {selectedContext.organizationName}
              </ThemedText>
              <Ionicons name="checkmark-circle" size={16} color="#1d4ed8" />
            </>
          )}
        </View>
        <Ionicons name={showDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#64748b" />
      </TouchableOpacity>

      {showDropdown && (
        <View style={styles.dropdown}>
          <TouchableOpacity
            style={[styles.dropdownItem, selectedContext.type === 'user' && styles.dropdownItemActive]}
            onPress={() => handleSelectContext({ type: 'user' })}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={24} color="#64748b" />
            <ThemedText style={styles.dropdownItemText}>Compte personnel</ThemedText>
            {selectedContext.type === 'user' && <Ionicons name="checkmark" size={20} color="#1d4ed8" />}
          </TouchableOpacity>

          <View style={styles.divider} />

          {organizations.map((org) => (
            <TouchableOpacity
              key={org.id}
              style={[
                styles.dropdownItem,
                selectedContext.type === 'organization' &&
                  selectedContext.organizationId === org.id &&
                  styles.dropdownItemActive,
              ]}
              onPress={() =>
                handleSelectContext({
                  type: 'organization',
                  organizationId: org.id,
                  organizationName: org.name,
                  organizationLogo: org.logo,
                })
              }
              activeOpacity={0.7}
            >
              {org.logo && <ExpoImage source={{ uri: org.logo }} style={styles.orgLogo} contentFit="cover" />}
              <ThemedText style={styles.dropdownItemText} numberOfLines={1}>
                {org.name}
              </ThemedText>
              <Ionicons name="checkmark-circle" size={16} color="#1d4ed8" />
              {selectedContext.type === 'organization' && selectedContext.organizationId === org.id && (
                <Ionicons name="checkmark" size={20} color="#1d4ed8" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  selectedContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  orgLogo: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  dropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#0f172a',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
});
