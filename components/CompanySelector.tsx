import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '../context/CompaniesContext';
import { useThemeColor } from '../hooks/use-theme-color';

interface CompanySelectorProps {
  value: string | string[]; // ID(s)
  onChange: (val: any) => void;
  multiple?: boolean;
  label?: string;
  placeholder?: string;
}

export function CompanySelector({
  value,
  onChange,
  multiple = false,
  label,
  placeholder = "Seleccionar empresa"
}: CompanySelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { companies, addCompany } = useCompanies();

  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const background = useThemeColor({}, 'background');

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [companies, searchQuery]);

  const handleSelect = (id: string) => {
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      if (arr.includes(id)) {
        onChange(arr.filter(x => x !== id));
      } else {
        onChange([...arr, id]);
      }
    } else {
      onChange(id);
      setModalVisible(false);
    }
  };

  const handleCreate = async () => {
    if (!searchQuery.trim()) return;
    try {
      const newComp = await addCompany({ name: searchQuery.trim(), sector: '', notes: '' });
      handleSelect(newComp.id);
      setSearchQuery('');
    } catch (e) {
      console.error(e);
    }
  };

  const renderValue = () => {
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      if (arr.length === 0) return null;
      return arr.map(id => {
        const comp = companies.find(c => c.id === id);
        return comp ? comp.name : '';
      }).filter(Boolean).join(', ');
    } else {
      if (!value) return null;
      const comp = companies.find(c => c.id === value);
      return comp ? comp.name : '';
    }
  };

  const displayValue = renderValue();

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: primaryColor }]}>{label}</Text>}
      
      <TouchableOpacity 
        style={[styles.inputButton, { backgroundColor: cardColor, borderColor }]} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={{ color: displayValue ? textColor : secondaryText, flex: 1 }}>
          {displayValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={secondaryText} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: primaryColor }]}>{label || 'Seleccionar Empresa'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchContainer, { backgroundColor: cardColor, borderColor }]}>
            <Ionicons name="search" size={20} color={secondaryText} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Buscar o crear nueva..."
              placeholderTextColor={secondaryText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredCompanies}
            keyExtractor={item => item.id}
            ListHeaderComponent={
              !multiple ? (
                <TouchableOpacity 
                  style={[styles.companyItem, { borderBottomColor: borderColor }]}
                  onPress={() => handleSelect('')}
                >
                  <Text style={[styles.companyName, { color: secondaryText, fontStyle: 'italic' }]}>Sin empresa</Text>
                  {value === '' && <Ionicons name="checkmark" size={20} color={primaryColor} />}
                </TouchableOpacity>
              ) : null
            }
            renderItem={({ item }) => {
              const isSelected = multiple ? (Array.isArray(value) && value.includes(item.id)) : value === item.id;
              
              return (
                <TouchableOpacity 
                  style={[styles.companyItem, { borderBottomColor: borderColor }]}
                  onPress={() => handleSelect(item.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.companyName, { color: isSelected ? primaryColor : textColor, fontWeight: isSelected ? 'bold' : 'normal' }]}>{item.name}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={20} color={primaryColor} />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => {
              if (searchQuery.trim().length > 0) {
                return (
                  <TouchableOpacity 
                    style={[styles.createItem, { backgroundColor: primaryColor + '10' }]}
                    onPress={handleCreate}
                  >
                    <Ionicons name="add-circle-outline" size={24} color={primaryColor} />
                    <Text style={[styles.createText, { color: primaryColor }]}>Crear nueva empresa: "{searchQuery}"</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: secondaryText }]}>No hay empresas disponibles.</Text>
                </View>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  companyName: {
    fontSize: 16,
  },
  createItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  createText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontStyle: 'italic',
  }
});
