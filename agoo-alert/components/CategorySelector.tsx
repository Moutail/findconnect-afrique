import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import {
  MainCategory,
  CategoryMetadata,
  MAIN_CATEGORY_LABELS,
  MAIN_CATEGORY_COLORS,
  getSubCategoriesForMain,
  getSubCategoryLabel,
  ItemCondition,
  ITEM_CONDITION_LABELS,
  PetType,
  PET_TYPE_LABELS,
  PetSize,
  PET_SIZE_LABELS,
  PetGender,
  PET_GENDER_LABELS,
  PersonType,
  PERSON_TYPE_LABELS,
  PersonGender,
  PERSON_GENDER_LABELS,
  VehicleType,
  VEHICLE_TYPE_LABELS,
  VehicleColor,
  VEHICLE_COLOR_LABELS,
} from '@/types/categories';

interface CategorySelectorProps {
  value: CategoryMetadata;
  onChange: (metadata: CategoryMetadata) => void;
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const [showSubPicker, setShowSubPicker] = useState(false);

  const mainCategories = Object.keys(MAIN_CATEGORY_LABELS) as MainCategory[];
  const subCategories = getSubCategoriesForMain(value.mainCategory);

  const subCategoryIconName = (subCategory: string): keyof typeof Ionicons.glyphMap => {
    const map: Record<string, keyof typeof Ionicons.glyphMap> = {
      wallet: 'wallet-outline',
      keys: 'key-outline',
      phone: 'phone-portrait-outline',
      bag: 'bag-handle-outline',
      jewelry: 'diamond-outline',
      clothing: 'shirt-outline',

      smartphone: 'phone-portrait-outline',
      laptop: 'laptop-outline',
      tablet: 'tablet-portrait-outline',
      camera: 'camera-outline',
      headphones: 'headset-outline',

      watch: 'watch-outline',
      glasses: 'glasses-outline',
      umbrella: 'umbrella-outline',
      hat: 'sparkles-outline',
      shoes: 'footsteps-outline',

      id_card: 'card-outline',
      passport: 'airplane-outline',
      drivers_license: 'id-card-outline',
      birth_certificate: 'document-outline',
      diploma: 'school-outline',
      bank_card: 'card-outline',
      other_document: 'document-text-outline',

      car: 'car-outline',
      motorcycle: 'bicycle-outline',
      bicycle: 'bicycle-outline',
      scooter: 'bicycle-outline',
      other_vehicle: 'car-sport-outline',

      dog: 'paw-outline',
      cat: 'paw-outline',
      bird: 'leaf-outline',
      other_pet: 'paw-outline',

      other_personal: 'ellipsis-horizontal-circle-outline',
      other_electronics: 'ellipsis-horizontal-circle-outline',
      other_accessory: 'ellipsis-horizontal-circle-outline',
    };

    return map[subCategory] || 'pricetag-outline';
  };

  const handleMainCategoryChange = (category: MainCategory) => {
    onChange({
      mainCategory: category,
      subCategory: undefined,
      itemDetails: undefined,
      petDetails: undefined,
      personDetails: undefined,
      vehicleDetails: undefined,
      documentDetails: undefined,
    });
  };

  const handleSubCategoryChange = (subCategory: string) => {
    const nextValue: CategoryMetadata = { ...value, subCategory };

    if (value.mainCategory === 'pet') {
      const normalized = (subCategory === 'other_pet' ? 'other' : subCategory) as any;
      nextValue.petDetails = { ...(value.petDetails || ({} as any)), type: normalized };
    }

    if (value.mainCategory === 'vehicle') {
      const normalized = (subCategory === 'other_vehicle' ? 'other' : subCategory) as any;
      nextValue.vehicleDetails = { ...(value.vehicleDetails || ({} as any)), type: normalized };
    }

    if (value.mainCategory === 'document') {
      nextValue.documentDetails = {
        ...(value.documentDetails || {}),
        documentType: getSubCategoryLabel(subCategory),
      };
    }

    onChange(nextValue);
    setShowSubPicker(false);
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>Catégorie principale</ThemedText>
      <View style={styles.mainGrid}>
        {mainCategories.map((category) => {
          const isActive = value.mainCategory === category;
          const iconMap: Record<MainCategory, keyof typeof Ionicons.glyphMap> = {
            lost: 'help-circle-outline',
            found: 'checkmark-circle-outline',
            person: 'person-outline',
            pet: 'paw-outline',
            vehicle: 'car-outline',
            document: 'document-text-outline',
            electronics: 'phone-portrait-outline',
            other: 'cube-outline',
          };

          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.mainButton,
                { borderColor: MAIN_CATEGORY_COLORS[category] },
                isActive && [styles.mainButtonActive, { backgroundColor: MAIN_CATEGORY_COLORS[category] }],
              ]}
              onPress={() => handleMainCategoryChange(category)}
              activeOpacity={0.85}
            >
              <Ionicons name={iconMap[category]} size={20} color={isActive ? '#ffffff' : MAIN_CATEGORY_COLORS[category]} />
              <ThemedText
                numberOfLines={1}
                style={[styles.mainButtonText, isActive && styles.mainButtonTextActive]}
              >
                {MAIN_CATEGORY_LABELS[category]}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {subCategories.length > 0 && (
        <>
          <View style={styles.subHeaderRow}>
            <ThemedText style={styles.label}>Sous-catégorie</ThemedText>
            <TouchableOpacity onPress={() => setShowSubPicker((s) => !s)} activeOpacity={0.85}>
              <View style={styles.subToggle}>
                <Ionicons name="list-outline" size={16} color="#64748b" />
                <ThemedText style={styles.subToggleText}>Tout voir</ThemedText>
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subRow}>
            {subCategories.map((subCat) => {
              const isActive = value.subCategory === subCat;
              return (
                <TouchableOpacity
                  key={subCat}
                  style={[styles.subChip, isActive && styles.subChipActive]}
                  onPress={() => handleSubCategoryChange(subCat)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={subCategoryIconName(subCat)}
                    size={16}
                    color={isActive ? '#ffffff' : '#334155'}
                  />
                  <ThemedText numberOfLines={1} style={[styles.subChipText, isActive && styles.subChipTextActive]}>
                    {getSubCategoryLabel(subCat)}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {showSubPicker && (
            <ScrollView style={styles.dropdown} nestedScrollEnabled>
              {subCategories.map((subCat) => (
                <TouchableOpacity
                  key={subCat}
                  style={[styles.dropdownItem, value.subCategory === subCat && styles.dropdownItemActive]}
                  onPress={() => handleSubCategoryChange(subCat)}
                >
                  <Ionicons name={subCategoryIconName(subCat)} size={18} color="#334155" />
                  <ThemedText style={styles.dropdownItemText}>{getSubCategoryLabel(subCat)}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Formulaires spécifiques selon la catégorie */}
      {(value.mainCategory === 'lost' || value.mainCategory === 'found' || value.mainCategory === 'electronics') && (
        <ItemDetailsForm value={value} onChange={onChange} />
      )}

      {value.mainCategory === 'pet' && <PetDetailsForm value={value} onChange={onChange} />}

      {value.mainCategory === 'person' && <PersonDetailsForm value={value} onChange={onChange} />}

      {value.mainCategory === 'vehicle' && <VehicleDetailsForm value={value} onChange={onChange} />}

      {value.mainCategory === 'document' && <DocumentDetailsForm value={value} onChange={onChange} />}
    </View>
  );
}

// Formulaire pour objets
function ItemDetailsForm({ value, onChange }: CategorySelectorProps) {
  const updateItemDetails = (field: string, fieldValue: any) => {
    onChange({
      ...value,
      itemDetails: { ...value.itemDetails, [field]: fieldValue },
    });
  };

  const detailsPreset = useMemo(() => {
    const sub = value.subCategory;

    const electronics = new Set(['phone', 'smartphone', 'laptop', 'tablet', 'camera', 'headphones']);
    const personalWithBrand = new Set(['wallet', 'bag', 'jewelry', 'watch', 'glasses', 'shoes', 'clothing']);

    if (sub && electronics.has(sub)) {
      return {
        showBrand: true,
        showModel: true,
        showColor: true,
        showCondition: true,
        showSerial: true,
        showDistinctive: true,
      };
    }

    if (sub === 'keys' || sub === 'umbrella' || sub === 'hat') {
      return {
        showBrand: false,
        showModel: false,
        showColor: true,
        showCondition: false,
        showSerial: false,
        showDistinctive: true,
      };
    }

    if (sub && personalWithBrand.has(sub)) {
      return {
        showBrand: true,
        showModel: false,
        showColor: true,
        showCondition: true,
        showSerial: false,
        showDistinctive: true,
      };
    }

    return {
      showBrand: false,
      showModel: false,
      showColor: true,
      showCondition: false,
      showSerial: false,
      showDistinctive: true,
    };
  }, [value.subCategory]);

  return (
    <View style={styles.detailsForm}>
      <ThemedText style={styles.sectionTitle}>Détails de l'objet</ThemedText>

      {value.subCategory ? (
        <View style={styles.detailsHintRow}>
          <Ionicons name="information-circle-outline" size={16} color="#64748b" />
          <ThemedText style={styles.detailsHintText}>{getSubCategoryLabel(value.subCategory)}</ThemedText>
        </View>
      ) : null}

      {detailsPreset.showBrand && (
        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>Marque</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Ex: Samsung, Apple..."
            value={value.itemDetails?.brand || ''}
            onChangeText={(text) => updateItemDetails('brand', text)}
          />
        </View>
      )}

      {detailsPreset.showModel && (
        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>Modèle</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Ex: Galaxy S21, iPhone 13..."
            value={value.itemDetails?.model || ''}
            onChangeText={(text) => updateItemDetails('model', text)}
          />
        </View>
      )}

      {detailsPreset.showColor && (
        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>Couleur</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Ex: Noir, Rouge..."
            value={value.itemDetails?.color || ''}
            onChangeText={(text) => updateItemDetails('color', text)}
          />
        </View>
      )}

      {detailsPreset.showCondition && (
        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>État</ThemedText>
          <View style={styles.chipGroup}>
            {(Object.keys(ITEM_CONDITION_LABELS) as ItemCondition[]).map((cond) => (
              <TouchableOpacity
                key={cond}
                style={[styles.chip, value.itemDetails?.condition === cond && styles.chipActive]}
                onPress={() => updateItemDetails('condition', cond)}
              >
                <ThemedText style={[styles.chipText, value.itemDetails?.condition === cond && styles.chipTextActive]}>
                  {ITEM_CONDITION_LABELS[cond]}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {detailsPreset.showSerial && (
        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>Numéro de série (optionnel)</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="IMEI / Serial"
            value={value.itemDetails?.serialNumber || ''}
            onChangeText={(text) => updateItemDetails('serialNumber', text)}
          />
        </View>
      )}

      {detailsPreset.showDistinctive && (
        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>Signes distinctifs</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Rayures, autocollants, gravures..."
            value={value.itemDetails?.distinctiveFeatures || ''}
            onChangeText={(text) => updateItemDetails('distinctiveFeatures', text)}
            multiline
            numberOfLines={3}
          />
        </View>
      )}
    </View>
  );
}

// Formulaire pour animaux
function PetDetailsForm({ value, onChange }: CategorySelectorProps) {
  const updatePetDetails = (field: string, fieldValue: any) => {
    onChange({
      ...value,
      petDetails: { ...value.petDetails, [field]: fieldValue } as any,
    });
  };

  return (
    <View style={styles.detailsForm}>
      <ThemedText style={styles.sectionTitle}>Détails de l'animal</ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Type</ThemedText>
        <View style={styles.chipGroup}>
          {(Object.keys(PET_TYPE_LABELS) as PetType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, value.petDetails?.type === type && styles.chipActive]}
              onPress={() => updatePetDetails('type', type)}
            >
              <ThemedText style={[styles.chipText, value.petDetails?.type === type && styles.chipTextActive]}>
                {PET_TYPE_LABELS[type]}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Nom</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Nom de l'animal"
          value={value.petDetails?.name || ''}
          onChangeText={(text) => updatePetDetails('name', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Race</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ex: Berger allemand, Siamois..."
          value={value.petDetails?.breed || ''}
          onChangeText={(text) => updatePetDetails('breed', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <ThemedText style={styles.inputLabel}>Âge</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={value.petDetails?.age?.toString() || ''}
            onChangeText={(text) => updatePetDetails('age', parseInt(text) || 0)}
            keyboardType="number-pad"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <ThemedText style={styles.inputLabel}>Unité</ThemedText>
          <View style={styles.chipGroup}>
            <TouchableOpacity
              style={[styles.chip, value.petDetails?.ageUnit === 'months' && styles.chipActive]}
              onPress={() => updatePetDetails('ageUnit', 'months')}
            >
              <ThemedText
                style={[styles.chipText, value.petDetails?.ageUnit === 'months' && styles.chipTextActive]}
              >
                Mois
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, value.petDetails?.ageUnit === 'years' && styles.chipActive]}
              onPress={() => updatePetDetails('ageUnit', 'years')}
            >
              <ThemedText
                style={[styles.chipText, value.petDetails?.ageUnit === 'years' && styles.chipTextActive]}
              >
                Ans
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Couleur</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Couleur du pelage/plumage"
          value={value.petDetails?.color || ''}
          onChangeText={(text) => updatePetDetails('color', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Signes distinctifs</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Taches, cicatrices, comportement..."
          value={value.petDetails?.distinctiveFeatures || ''}
          onChangeText={(text) => updatePetDetails('distinctiveFeatures', text)}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );
}

// Formulaire pour personnes
function PersonDetailsForm({ value, onChange }: CategorySelectorProps) {
  const updatePersonDetails = (field: string, fieldValue: any) => {
    onChange({
      ...value,
      personDetails: { ...value.personDetails, [field]: fieldValue } as any,
    });
  };

  return (
    <View style={styles.detailsForm}>
      <ThemedText style={styles.sectionTitle}>Détails de la personne</ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Type</ThemedText>
        <View style={styles.chipGroup}>
          {(Object.keys(PERSON_TYPE_LABELS) as PersonType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, value.personDetails?.type === type && styles.chipActive]}
              onPress={() => updatePersonDetails('type', type)}
            >
              <ThemedText style={[styles.chipText, value.personDetails?.type === type && styles.chipTextActive]}>
                {PERSON_TYPE_LABELS[type]}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Prénom</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Prénom de la personne"
          value={value.personDetails?.firstName || ''}
          onChangeText={(text) => updatePersonDetails('firstName', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Nom</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Nom de famille"
          value={value.personDetails?.lastName || ''}
          onChangeText={(text) => updatePersonDetails('lastName', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <ThemedText style={styles.inputLabel}>Âge (approx.)</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={value.personDetails?.age?.toString() || ''}
            onChangeText={(text) => updatePersonDetails('age', parseInt(text) || 0)}
            keyboardType="number-pad"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <ThemedText style={styles.inputLabel}>Genre</ThemedText>
          <View style={styles.chipGroup}>
            {(Object.keys(PERSON_GENDER_LABELS) as PersonGender[]).map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[styles.chip, value.personDetails?.gender === gender && styles.chipActive]}
                onPress={() => updatePersonDetails('gender', gender)}
              >
                <ThemedText
                  style={[styles.chipText, value.personDetails?.gender === gender && styles.chipTextActive]}
                >
                  {PERSON_GENDER_LABELS[gender]}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Dernière localisation connue</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ex: Marché de Lomé, Rue des Palmiers..."
          value={value.personDetails?.lastSeenLocation || ''}
          onChangeText={(text) => updatePersonDetails('lastSeenLocation', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Vêtements portés</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description des vêtements..."
          value={value.personDetails?.clothing || ''}
          onChangeText={(text) => updatePersonDetails('clothing', text)}
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Signes distinctifs</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Cicatrices, tatouages, particularités..."
          value={value.personDetails?.distinctiveFeatures || ''}
          onChangeText={(text) => updatePersonDetails('distinctiveFeatures', text)}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );
}

// Formulaire pour véhicules
function VehicleDetailsForm({ value, onChange }: CategorySelectorProps) {
  const updateVehicleDetails = (field: string, fieldValue: any) => {
    onChange({
      ...value,
      vehicleDetails: { ...value.vehicleDetails, [field]: fieldValue } as any,
    });
  };

  return (
    <View style={styles.detailsForm}>
      <ThemedText style={styles.sectionTitle}>Détails du véhicule</ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Type</ThemedText>
        <View style={styles.chipGroup}>
          {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, value.vehicleDetails?.type === type && styles.chipActive]}
              onPress={() => updateVehicleDetails('type', type)}
            >
              <ThemedText style={[styles.chipText, value.vehicleDetails?.type === type && styles.chipTextActive]}>
                {VEHICLE_TYPE_LABELS[type]}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Marque</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ex: Toyota, Honda..."
          value={value.vehicleDetails?.make || ''}
          onChangeText={(text) => updateVehicleDetails('make', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Modèle</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ex: Corolla, Civic..."
          value={value.vehicleDetails?.model || ''}
          onChangeText={(text) => updateVehicleDetails('model', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <ThemedText style={styles.inputLabel}>Année</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="2020"
            value={value.vehicleDetails?.year?.toString() || ''}
            onChangeText={(text) => updateVehicleDetails('year', parseInt(text) || 0)}
            keyboardType="number-pad"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <ThemedText style={styles.inputLabel}>Couleur</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Couleur"
            value={value.vehicleDetails?.color || ''}
            onChangeText={(text) => updateVehicleDetails('color', text)}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Plaque d'immatriculation</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ex: TG-1234-AB"
          value={value.vehicleDetails?.licensePlate || ''}
          onChangeText={(text) => updateVehicleDetails('licensePlate', text)}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Signes distinctifs</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Rayures, autocollants, modifications..."
          value={value.vehicleDetails?.distinctiveFeatures || ''}
          onChangeText={(text) => updateVehicleDetails('distinctiveFeatures', text)}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );
}

// Formulaire pour documents
function DocumentDetailsForm({ value, onChange }: CategorySelectorProps) {
  const updateDocumentDetails = (field: string, fieldValue: any) => {
    onChange({
      ...value,
      documentDetails: { ...value.documentDetails, [field]: fieldValue },
    });
  };

  return (
    <View style={styles.detailsForm}>
      <ThemedText style={styles.sectionTitle}>Détails du document</ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Type de document</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ex: Carte d'identité, Passeport..."
          value={value.documentDetails?.documentType || ''}
          onChangeText={(text) => updateDocumentDetails('documentType', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Numéro (si applicable)</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Numéro du document"
          value={value.documentDetails?.documentNumber || ''}
          onChangeText={(text) => updateDocumentDetails('documentNumber', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Nom du propriétaire</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Nom sur le document"
          value={value.documentDetails?.ownerName || ''}
          onChangeText={(text) => updateDocumentDetails('ownerName', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Autorité émettrice</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ex: Préfecture de Lomé..."
          value={value.documentDetails?.issuingAuthority || ''}
          onChangeText={(text) => updateDocumentDetails('issuingAuthority', text)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  mainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mainButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 2,
  },
  mainButtonActive: {
    borderColor: 'transparent',
  },
  mainButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  mainButtonTextActive: {
    color: '#ffffff',
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  subToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
  },
  subToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  subRow: {
    gap: 10,
    paddingRight: 6,
    paddingBottom: 2,
  },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 220,
  },
  subChipActive: {
    backgroundColor: '#006A4E',
    borderColor: '#006A4E',
  },
  subChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  subChipTextActive: {
    color: '#ffffff',
  },
  dropdown: {
    maxHeight: 250,
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
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#0f172a',
  },
  detailsForm: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  detailsHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailsHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#006A4E',
    borderColor: '#006A4E',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#ffffff',
  },
});
