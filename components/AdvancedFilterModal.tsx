import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../hooks/use-theme-color';

export type FavoritesFilterType = 'all' | 'only_favorites';
export type RemindersFilterType = 'all' | 'with_reminders' | 'without_reminders';
export type CompanyRelationFilterType = 'all' | 'with_company' | 'without_company';

interface AdvancedFilterModalProps {
  visible: boolean;
  onClose: () => void;
  availableTags: string[];
  companies: { id: string; name: string }[];
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  activeCompanyFilter: string;
  setActiveCompanyFilter: (val: string) => void;
  favoritesFilter: FavoritesFilterType;
  setFavoritesFilter: (val: FavoritesFilterType) => void;
  remindersFilter: RemindersFilterType;
  setRemindersFilter: (val: RemindersFilterType) => void;
  companyRelationFilter: CompanyRelationFilterType;
  setCompanyRelationFilter: (val: CompanyRelationFilterType) => void;
  onResetFilters: () => void;
}

export const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  visible,
  onClose,
  availableTags,
  companies,
  selectedTags,
  setSelectedTags,
  activeCompanyFilter,
  setActiveCompanyFilter,
  favoritesFilter,
  setFavoritesFilter,
  remindersFilter,
  setRemindersFilter,
  companyRelationFilter,
  setCompanyRelationFilter,
  onResetFilters,
}) => {
  const cardColor = useThemeColor({}, 'card');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent1 = useThemeColor({}, 'accent1');
  const borderColor = useThemeColor({}, 'border');

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const hasAdvancedFilters =
    selectedTags.length > 0 ||
    activeCompanyFilter !== 'ALL' ||
    favoritesFilter !== 'all' ||
    remindersFilter !== 'all' ||
    companyRelationFilter !== 'all';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: cardColor, borderColor }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="options" size={22} color={primaryColor} style={{ marginRight: 8 }} />
              <Text style={[styles.headerTitle, { color: primaryColor }]}>Filtros Avanzados</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={secondaryText} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Filters Content */}
          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
            {/* Section 1: Etiquetas */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: primaryColor }]}>Etiquetas</Text>
              {availableTags.length > 0 ? (
                <View style={styles.chipsWrap}>
                  {availableTags.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.chip,
                          { backgroundColor: backgroundColor, borderColor },
                          isSelected && { backgroundColor: accent1, borderColor: accent1 },
                        ]}
                        onPress={() => toggleTag(tag)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.chipText,
                          { color: textColor },
                          isSelected && { color: '#FFFFFF', fontWeight: 'bold' },
                        ]}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: secondaryText }]}>No hay etiquetas disponibles</Text>
              )}
            </View>

            {/* Section 2: Empresa */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: primaryColor }]}>Empresa</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    { backgroundColor: backgroundColor, borderColor },
                    activeCompanyFilter === 'ALL' && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                  onPress={() => setActiveCompanyFilter('ALL')}
                >
                  <Text style={[
                    styles.chipText,
                    { color: textColor },
                    activeCompanyFilter === 'ALL' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}>
                    Todas las empresas
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chip,
                    { backgroundColor: backgroundColor, borderColor },
                    activeCompanyFilter === 'NONE' && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                  onPress={() => setActiveCompanyFilter('NONE')}
                >
                  <Text style={[
                    styles.chipText,
                    { color: textColor },
                    activeCompanyFilter === 'NONE' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}>
                    Sin empresa
                  </Text>
                </TouchableOpacity>

                {companies.map(comp => {
                  const isSelected = activeCompanyFilter === comp.id;
                  return (
                    <TouchableOpacity
                      key={comp.id}
                      style={[
                        styles.chip,
                        { backgroundColor: backgroundColor, borderColor },
                        isSelected && { backgroundColor: primaryColor, borderColor: primaryColor },
                      ]}
                      onPress={() => setActiveCompanyFilter(comp.id)}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: textColor },
                        isSelected && { color: '#FFFFFF', fontWeight: 'bold' },
                      ]}>
                        {comp.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Section 3: Favoritos */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: primaryColor }]}>Favoritos</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { backgroundColor: backgroundColor, borderColor },
                    favoritesFilter === 'all' && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                  onPress={() => setFavoritesFilter('all')}
                >
                  <Text style={[
                    styles.optionButtonText,
                    { color: textColor },
                    favoritesFilter === 'all' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}>
                    Todos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { backgroundColor: backgroundColor, borderColor },
                    favoritesFilter === 'only_favorites' && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                  onPress={() => setFavoritesFilter('only_favorites')}
                >
                  <Text style={[
                    styles.optionButtonText,
                    { color: textColor },
                    favoritesFilter === 'only_favorites' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}>
                    Solo favoritos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 4: Seguimientos */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: primaryColor }]}>Seguimientos</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { backgroundColor: backgroundColor, borderColor },
                    remindersFilter === 'all' && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                  onPress={() => setRemindersFilter('all')}
                >
                  <Text style={[
                    styles.optionButtonText,
                    { color: textColor },
                    remindersFilter === 'all' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}>
                    Todos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { backgroundColor: backgroundColor, borderColor },
                    remindersFilter === 'with_reminders' && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                  onPress={() => setRemindersFilter('with_reminders')}
                >
                  <Text style={[
                    styles.optionButtonText,
                    { color: textColor },
                    remindersFilter === 'with_reminders' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}>
                    Con seguimiento
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { backgroundColor: backgroundColor, borderColor },
                    remindersFilter === 'without_reminders' && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                  onPress={() => setRemindersFilter('without_reminders')}
                >
                  <Text style={[
                    styles.optionButtonText,
                    { color: textColor },
                    remindersFilter === 'without_reminders' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}>
                    Sin seguimiento
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 5: Relación con Empresa */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: primaryColor }]}>Relación con Empresa</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { backgroundColor: backgroundColor, borderColor },
                    companyRelationFilter === 'all' && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                  onPress={() => setCompanyRelationFilter('all')}
                >
                  <Text style={[
                    styles.optionButtonText,
                    { color: textColor },
                    companyRelationFilter === 'all' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}>
                    Todos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { backgroundColor: backgroundColor, borderColor },
                    companyRelationFilter === 'with_company' && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                  onPress={() => setCompanyRelationFilter('with_company')}
                >
                  <Text style={[
                    styles.optionButtonText,
                    { color: textColor },
                    companyRelationFilter === 'with_company' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}>
                    Con empresa
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { backgroundColor: backgroundColor, borderColor },
                    companyRelationFilter === 'without_company' && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                  onPress={() => setCompanyRelationFilter('without_company')}
                >
                  <Text style={[
                    styles.optionButtonText,
                    { color: textColor },
                    companyRelationFilter === 'without_company' && { color: '#FFFFFF', fontWeight: 'bold' },
                  ]}>
                    Sin empresa
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            {hasAdvancedFilters && (
              <TouchableOpacity style={[styles.resetButton, { borderColor }]} onPress={onResetFilters}>
                <Ionicons name="refresh-outline" size={16} color={secondaryText} style={{ marginRight: 4 }} />
                <Text style={[styles.resetButtonText, { color: secondaryText }]}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.applyButton, { backgroundColor: primaryColor }]} onPress={onClose}>
              <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  contentScroll: {
    maxHeight: 450,
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionButton: {
    flex: 1,
    minWidth: 95,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonText: {
    fontSize: 13,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
