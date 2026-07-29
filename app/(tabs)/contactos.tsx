import React, { useState, useMemo, useLayoutEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { ControlledInput } from '../../components/ui/controlled-input';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useContacts } from '../../context/ContactsContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { ContactCard } from '../../components/ContactCard';
import { CompanyFilterDropdown } from '../../components/CompanyFilterDropdown';
import { useCompanies } from '../../context/CompaniesContext';

export default function ContactosScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { contacts, isLoading, updateContact } = useContacts();
  const { companies } = useCompanies();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeCompanyFilter, setActiveCompanyFilter] = useState('ALL');

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent1 = useThemeColor({}, 'accent1');
  const borderColor = useThemeColor({}, 'border');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => router.push('/contacto/importar')} 
          style={{ marginRight: 15 }}
        >
          <Ionicons name="person-add-outline" size={24} color={primaryColor} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, primaryColor]);

  const availableTags = useMemo(() => {
    if (!contacts) return ['Todos'];
    const tagsSet = new Set<string>();
    contacts.forEach(contact => {
      if (contact.tags) {
        contact.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return ['Todos', ...Array.from(tagsSet).sort()];
  }, [contacts]);

  const toggleTag = (tag: string) => {
    if (tag === 'Todos') {
      setActiveTags([]);
      return;
    }
    
    setActiveTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((contact) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        contact.name.toLowerCase().includes(query) ||
        (contact.company && contact.company.toLowerCase().includes(query)) ||
        (contact.tags && contact.tags.some(t => t.toLowerCase().includes(query)));
      
      const matchesTag = activeTags.length === 0 || 
        (contact.tags && activeTags.some(tag => contact.tags.includes(tag)));

      let matchesCompany = true;
      if (activeCompanyFilter === 'NONE') {
        matchesCompany = !contact.empresaActual && (!contact.company || contact.company.trim() === '');
      } else if (activeCompanyFilter !== 'ALL') {
        const companyNameResolved = companies.find(c => c.id === activeCompanyFilter)?.name;
        matchesCompany = contact.empresaActual === activeCompanyFilter || 
          (!!contact.company && !!companyNameResolved && contact.company.toLowerCase() === companyNameResolved.toLowerCase());
      }
      
      return matchesSearch && matchesTag && matchesCompany;
    });
  }, [contacts, searchQuery, activeTags, activeCompanyFilter, companies]);

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
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: cardColor, borderColor }]}>
        <Ionicons name="search" size={20} color={primaryColor} style={styles.searchIcon} />
        <ControlledInput 
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Buscar por nombre, empresa o etiqueta..."
          placeholderTextColor={secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          selectTextOnFocus={false}
        />
        <Ionicons name="options-outline" size={24} color={accent1} />
      </View>

      <CompanyFilterDropdown 
        value={activeCompanyFilter}
        onChange={setActiveCompanyFilter}
      />

      {/* Filter Tags */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {availableTags.map((tag, index) => {
            const isActive = tag === 'Todos' ? activeTags.length === 0 : activeTags.includes(tag);
            return (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.filterChip, 
                  { backgroundColor: cardColor, borderColor },
                  isActive && { backgroundColor: accent1, borderColor: accent1 }
                ]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[
                  styles.filterChipText, 
                  { color: primaryColor },
                  isActive && { color: '#FFFFFF' }
                ]}>
                  {tag}
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
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: secondaryText }}>
              {searchQuery || activeTags.length > 0 || activeCompanyFilter !== 'ALL'
                ? "No se encontraron contactos"
                : "No tienes contactos guardados."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
});
