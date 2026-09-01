import React, { useState, useMemo, useLayoutEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ControlledInput } from '../../components/ui/controlled-input';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useContacts } from '../../context/ContactsContext';
import { useCompanies } from '../../context/CompaniesContext';
import { useReminders } from '../../context/RemindersContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { ContactCard } from '../../components/ContactCard';
import { CompanyFilterDropdown } from '../../components/CompanyFilterDropdown';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';
import { CONTACT_CATEGORIES, ContactCategory } from '../../constants/categories';
import {
  AdvancedFilterModal,
  FavoritesFilterType,
  RemindersFilterType,
  CompanyRelationFilterType,
} from '../../components/AdvancedFilterModal';

export default function ContactosScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { contacts, isLoading, updateContact, refreshContacts } = useContacts();
  const { companies } = useCompanies();
  const { reminders } = useReminders();

  // Primary Search & Category State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ContactCategory | null>(null);

  // Advanced Filters State
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeCompanyFilter, setActiveCompanyFilter] = useState('ALL');
  const [favoritesFilter, setFavoritesFilter] = useState<FavoritesFilterType>('all');
  const [remindersFilter, setRemindersFilter] = useState<RemindersFilterType>('all');
  const [companyRelationFilter, setCompanyRelationFilter] = useState<CompanyRelationFilterType>('all');
  const [modalVisible, setModalVisible] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent1 = useThemeColor({}, 'accent1');
  const borderColor = useThemeColor({}, 'border');

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      if (refreshContacts) {
        await refreshContacts();
      }
    } catch (error) {
      console.error('Error refreshing contacts:', error);
    } finally {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setRefreshing(false);
    }
  }, [refreshContacts]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          <TouchableOpacity 
            onPress={() => router.push('/contacto/importar')} 
            style={styles.headerActionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Importar contactos"
            accessibilityRole="button"
          >
            <Ionicons name="cloud-download-outline" size={22} color={primaryColor} />
          </TouchableOpacity>
          <ThemeToggleButton />
        </View>
      ),
    });
  }, [navigation, primaryColor, router]);

  const handleSelectCategory = (cat: ContactCategory) => {
    setActiveCategory(prev => (prev === cat ? null : cat));
  };

  // Dynamic tags extraction from user's contacts
  const availableTags = useMemo(() => {
    if (!contacts) return [];
    const set = new Set<string>();
    contacts.forEach(c => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach(t => {
          if (typeof t === 'string' && t.trim()) {
            set.add(t.trim());
          }
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [contacts]);

  // Check if any advanced filter is currently active
  const hasActiveAdvancedFilters = useMemo(() => {
    return (
      selectedTags.length > 0 ||
      activeCompanyFilter !== 'ALL' ||
      favoritesFilter !== 'all' ||
      remindersFilter !== 'all' ||
      companyRelationFilter !== 'all'
    );
  }, [selectedTags, activeCompanyFilter, favoritesFilter, remindersFilter, companyRelationFilter]);

  const handleResetAdvancedFilters = useCallback(() => {
    setSelectedTags([]);
    setActiveCompanyFilter('ALL');
    setFavoritesFilter('all');
    setRemindersFilter('all');
    setCompanyRelationFilter('all');
  }, []);

  // Combined Multi-Criteria Filter Logic
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((contact) => {
      if (!contact) return false;

      // 1. Text Search Query
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const nameMatch = contact.name ? contact.name.toLowerCase().includes(query) : false;
        const companyMatch = contact.company ? contact.company.toLowerCase().includes(query) : false;
        const empresaActualMatch = contact.empresaActual ? contact.empresaActual.toLowerCase().includes(query) : false;
        const tagsMatch = Array.isArray(contact.tags) && contact.tags.some(t => typeof t === 'string' && t.toLowerCase().includes(query));

        const anterioressMatch = Array.isArray(contact.empresasAnteriores) && contact.empresasAnteriores.some(empIdOrName => {
          if (!empIdOrName) return false;
          if (empIdOrName.toLowerCase().includes(query)) return true;
          const resolvedComp = companies.find(c => c.id === empIdOrName);
          return resolvedComp ? resolvedComp.name.toLowerCase().includes(query) : false;
        });

        let empresaActualResolvedMatch = false;
        if (contact.empresaActual) {
          const resolvedComp = companies.find(c => c.id === contact.empresaActual);
          if (resolvedComp && resolvedComp.name.toLowerCase().includes(query)) {
            empresaActualResolvedMatch = true;
          }
        }

        const matchesSearch = nameMatch || companyMatch || empresaActualMatch || tagsMatch || anterioressMatch || empresaActualResolvedMatch;
        if (!matchesSearch) return false;
      }

      // 2. Category Filter (Conocidos, Referidos, Gestionados)
      if (activeCategory !== null) {
        if (contact.categoria !== activeCategory) return false;
      }

      // 3. Selected Tags Filter (AND logic - contact must have ALL selected tags)
      if (selectedTags.length > 0) {
        if (!Array.isArray(contact.tags)) return false;
        const hasAllTags = selectedTags.every(st =>
          contact.tags.some(ct => typeof ct === 'string' && ct.trim().toLowerCase() === st.trim().toLowerCase())
        );
        if (!hasAllTags) return false;
      }

      // 4. Company Filter
      if (activeCompanyFilter === 'NONE') {
        const hasCurrentComp = Boolean(contact.empresaActual || (contact.company && contact.company.trim() !== ''));
        if (hasCurrentComp) return false;
      } else if (activeCompanyFilter !== 'ALL') {
        const companyNameResolved = companies.find(c => c.id === activeCompanyFilter)?.name;
        const matchesCompany = contact.empresaActual === activeCompanyFilter ||
          (!!contact.company && !!companyNameResolved && contact.company.trim().toLowerCase() === companyNameResolved.trim().toLowerCase());
        if (!matchesCompany) return false;
      }

      // 5. Favorites Filter
      if (favoritesFilter === 'only_favorites') {
        if (!contact.favorito) return false;
      }

      // 6. Reminders Filter
      if (remindersFilter !== 'all') {
        const hasReminder = Array.isArray(reminders) && reminders.some(r => r && r.contactoId === contact.id);
        if (remindersFilter === 'with_reminders' && !hasReminder) return false;
        if (remindersFilter === 'without_reminders' && hasReminder) return false;
      }

      // 7. Company Relation Filter
      if (companyRelationFilter !== 'all') {
        const hasRelation = Boolean(
          (contact.empresaActual && contact.empresaActual.trim() !== '') ||
          (contact.company && contact.company.trim() !== '') ||
          (Array.isArray(contact.empresasAnteriores) && contact.empresasAnteriores.length > 0)
        );
        if (companyRelationFilter === 'with_company' && !hasRelation) return false;
        if (companyRelationFilter === 'without_company' && hasRelation) return false;
      }

      return true;
    });
  }, [
    contacts,
    searchQuery,
    activeCategory,
    selectedTags,
    activeCompanyFilter,
    favoritesFilter,
    remindersFilter,
    companyRelationFilter,
    companies,
    reminders,
  ]);

  const handlePressContact = useCallback((id: string) => {
    router.push(`/contacto/${id}`);
  }, [router]);

  const handleToggleFavorite = useCallback((id: string, currentFavorito: boolean) => {
    updateContact(id, { favorito: !currentFavorito });
  }, [updateContact]);

  const renderContactItem = useCallback(({ item }: { item: any }) => (
    <ContactCard 
      contact={item} 
      onPress={() => handlePressContact(item.id)} 
      onToggleFavorite={() => handleToggleFavorite(item.id, item.favorito)}
    />
  ), [handlePressContact, handleToggleFavorite]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Search Bar & Filter Toggle Button */}
      <View style={[styles.searchContainer, { backgroundColor: cardColor, borderColor }]}>
        <Ionicons name="search" size={18} color={secondaryText} style={styles.searchIcon} />
        <ControlledInput 
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Buscar contacto, empresa o etiqueta..."
          placeholderTextColor={secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          selectTextOnFocus={false}
        />
        
        <TouchableOpacity
          style={[
            styles.filterIconButton,
            { backgroundColor: cardColor, borderColor },
            hasActiveAdvancedFilters && { backgroundColor: primaryColor + '15', borderColor: primaryColor },
          ]}
          onPress={() => setModalVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Filtros avanzados"
        >
          <Ionicons 
            name="options-outline" 
            size={20} 
            color={hasActiveAdvancedFilters ? primaryColor : secondaryText} 
          />
          {hasActiveAdvancedFilters && (
            <View style={[styles.activeFilterBadge, { backgroundColor: primaryColor }]} />
          )}
        </TouchableOpacity>
      </View>

      <CompanyFilterDropdown 
        value={activeCompanyFilter}
        onChange={setActiveCompanyFilter}
      />

      {/* Category Filter Chips (Conocidos, Referidos, Gestionados) */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filtersScroll}
          keyboardShouldPersistTaps="handled"
        >
          {CONTACT_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity 
                key={cat} 
                style={[
                  styles.filterChip, 
                  { backgroundColor: cardColor, borderColor },
                  isActive && { backgroundColor: primaryColor, borderColor: primaryColor }
                ]}
                onPress={() => handleSelectCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.filterChipText, 
                  { color: secondaryText },
                  isActive && { color: '#FFFFFF', fontWeight: 'bold' }
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Contacts List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderContactItem}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[primaryColor]}
            tintColor={primaryColor}
          />
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: cardColor, borderColor }]}>
            <Ionicons 
              name={searchQuery || activeCategory !== null || hasActiveAdvancedFilters ? "search-outline" : "people-outline"} 
              size={32} 
              color={secondaryText} 
              style={{ marginBottom: 8 }} 
            />
            <Text style={[styles.emptyTitle, { color: primaryColor }]}>
              {searchQuery || activeCategory !== null || hasActiveAdvancedFilters
                ? "Sin resultados"
                : "Sin contactos"}
            </Text>
            <Text style={[styles.emptySubtext, { color: secondaryText }]}>
              {searchQuery || activeCategory !== null || hasActiveAdvancedFilters
                ? "No encontramos contactos que coincidan con los filtros aplicados."
                : "Agrega tu primer contacto para comenzar a organizar tu red."}
            </Text>
          </View>
        }
      />

      {/* Advanced Filters Modal */}
      <AdvancedFilterModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        availableTags={availableTags}
        companies={companies}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        activeCompanyFilter={activeCompanyFilter}
        setActiveCompanyFilter={setActiveCompanyFilter}
        favoritesFilter={favoritesFilter}
        setFavoritesFilter={setFavoritesFilter}
        remindersFilter={remindersFilter}
        setRemindersFilter={setRemindersFilter}
        companyRelationFilter={companyRelationFilter}
        setCompanyRelationFilter={setCompanyRelationFilter}
        onResetFilters={handleResetAdvancedFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginLeft: 4,
  },
  activeFilterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 80,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    marginTop: 32,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
