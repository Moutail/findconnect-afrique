import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import {
  MainCategory,
  CategoryMetadata,
  MAIN_CATEGORY_LABELS,
  MAIN_CATEGORY_ICONS,
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
  const [showMainPicker, setShowMainPicker] = useState(false);
  const [showSubPicker, setShowSubPicker] = useState(false);

  const mainCategories = Object.keys(MAIN_CATEGORY_LABELS) as MainCategory[];
  const subCategories = getSubCategoriesForMain(value.mainCategory);

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
    setShowMainPicker(false);
  };

  const handleSubCategoryChange = (subCategory: string) => {
    onChange({ ...value, subCategory });
    setShowSubPicker(false);
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>Catégorie principale</ThemedText>
      <TouchableOpacity
        style={[styles.selector, { borderColor: MAIN_CATEGORY_COLORS[value.mainCategory] }]}
        onPress={() => setShowMainPicker(!showMainPicker)}
      >
        <View style={styles.selectorContent}>
          <ThemedText style={styles.icon}>{MAIN_CATEGORY_ICONS[value.mainCategory]}</ThemedText>
          <ThemedText style={styles.selectorText}>{MAIN_CATEGORY_LABELS[value.mainCategory]}</ThemedText>
        </View>
        <Ionicons name="chevron-down" size={20} color="#64748b" />
      </TouchableOpacity>

      {showMainPicker && (
        <View style={styles.dropdown}>
          {mainCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.dropdownItem, value.mainCategory === category && styles.dropdownItemActive]}
              onPress={() => handleMainCategoryChange(category)}
            >
              <ThemedText style={styles.icon}>{MAIN_CATEGORY_ICONS[category]}</ThemedText>
              <ThemedText style={styles.dropdownItemText}>{MAIN_CATEGORY_LABELS[category]}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {subCategories.length > 0 && (
        <>
          <ThemedText style={styles.label}>Sous-catégorie (optionnel)</ThemedText>
          <TouchableOpacity style={styles.selector} onPress={() => setShowSubPicker(!showSubPicker)}>
            <ThemedText style={styles.selectorText}>
              {value.subCategory ? getSubCategoryLabel(value.subCategory) : 'Sélectionner...'}
            </ThemedText>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </TouchableOpacity>

          {showSubPicker && (
            <ScrollView style={styles.dropdown} nestedScrollEnabled>
              {subCategories.map((subCat) => (
                <TouchableOpacity
                  key={subCat}
                  style={[styles.dropdownItem, value.subCategory === subCat && styles.dropdownItemActive]}
                  onPress={() => handleSubCategoryChange(subCat)}
                >
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

  return (
    <View style={styles.detailsForm}>
      <ThemedText style={styles.sectionTitle}>Détails de l'objet</ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Marque</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ex: Samsung, Apple..."
          value={value.itemDetails?.brand || ''}
          onChangeText={(text) => updateItemDetails('brand', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Modèle</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ex: Galaxy S21, iPhone 13..."
          value={value.itemDetails?.model || ''}
          onChangeText={(text) => updateItemDetails('model', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Couleur</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ex: Noir, Rouge..."
          value={value.itemDetails?.color || ''}
          onChangeText={(text) => updateItemDetails('color', text)}
        />
      </View>

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
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
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
