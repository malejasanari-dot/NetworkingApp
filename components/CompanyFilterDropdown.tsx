import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '../context/CompaniesContext';
import { useThemeColor } from '../hooks/use-theme-color';

interface CompanyFilterDropdownProps {
  value: string; // 'ALL', 'NONE', or companyId
  onChange: (val: string) => void;
}

export function CompanyFilterDropdown({ value, onChange }: CompanyFilterDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { companies } = useCompanies();

  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const background = useThemeColor({}, 'background');

  const handleSelect = (id: string) => {
    onChange(id);
    setModalVisible(false);
  };

  const displayValue = () => {
    if (value === 'ALL') return 'Todas las empresas';
    if (value === 'NONE') return 'Sin empresa';
    const comp = companies.find(c => c.id === value);
    return comp ? comp.name : 'Todas las empresas';
  };

  const filterOptions = [
    { id: 'ALL', name: 'Todas las empresas', icon: 'business-outline' as any },
    { id: 'NONE', name: 'Sin empresa', icon: 'person-outline' as any },
    ...companies.map(c => ({ id: c.id, name: c.name, icon: 'briefcase-outline' as any }))
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.dropdownButton, { backgroundColor: cardColor, borderColor }]} 
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="filter" size={16} color={primaryColor} style={styles.icon} />
        <Text style={[styles.dropdownText, { color: textColor }]} numberOfLines={1}>
          {displayValue()}
        </Text>
        <Ionicons name="chevron-down" size={16} color={secondaryText} />
      </TouchableOpacity>

      <Modal 
        visible={modalVisible} 
        animationType="fade" 
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: cardColor, borderColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: primaryColor }]}>Filtrar por Empresa</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={secondaryText} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filterOptions}
              keyExtractor={item => item.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => {
                const isSelected = value === item.id;
                return (
                  <TouchableOpacity 
                    style={[styles.optionItem, { borderBottomColor: borderColor }]}
                    onPress={() => handleSelect(item.id)}
                  >
                    <Ionicons 
                      name={item.icon} 
                      size={20} 
                      color={isSelected ? primaryColor : secondaryText} 
                      style={styles.optionIcon} 
                    />
                    <Text style={[
                      styles.optionText, 
                      { color: isSelected ? primaryColor : textColor, fontWeight: isSelected ? 'bold' : 'normal' }
                    ]}>
                      {item.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={primaryColor} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  icon: {
    marginRight: 8,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  }
});
