import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useThemeColor } from '../hooks/use-theme-color';

export interface Sector {
  id: number;
  name: string;
}

interface SectorSelectorProps {
  value?: number | null;
  onChange: (sectorId: number | null) => void;
  label?: string;
  placeholder?: string;
}

export function SectorSelector({
  value,
  onChange,
  label,
  placeholder = "Seleccionar sector",
}: SectorSelectorProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const background = useThemeColor({}, 'background');

  const fetchSectors = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sectors')
        .select('id, name')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error al cargar sectores desde Supabase:', error);
        return;
      }

      if (data) {
        setSectors(data);
      }
    } catch (err) {
      console.error('Error en fetchSectors:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSectors();
  }, [fetchSectors]);

  const filteredSectors = useMemo(() => {
    if (!searchQuery.trim()) return sectors;
    const query = searchQuery.toLowerCase();
    return sectors.filter(s => s.name.toLowerCase().includes(query));
  }, [sectors, searchQuery]);

  const handleSelect = useCallback((id: number | null) => {
    onChange(id);
    setModalVisible(false);
    setSearchQuery('');
  }, [onChange]);

  const selectedSector = useMemo(() => {
    if (value === null || value === undefined) return null;
    return sectors.find(s => s.id === value) || null;
  }, [value, sectors]);

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: primaryColor }]}>{label}</Text>}

      <TouchableOpacity
        style={[styles.inputButton, { backgroundColor: cardColor, borderColor }]}
        onPress={() => {
          setModalVisible(true);
          if (sectors.length === 0) {
            fetchSectors();
          }
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="hammer-outline" size={20} color={primaryColor} style={styles.inputIcon} />
        <Text style={{ color: selectedSector ? textColor : secondaryText, flex: 1, fontSize: 16 }}>
          {selectedSector ? selectedSector.name : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={secondaryText} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: background,
                paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 20 : 16),
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: primaryColor }]}>
                {label || 'Seleccionar Sector'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: cardColor, borderColor }]}>
              <Ionicons name="search" size={20} color={secondaryText} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Buscar sector..."
                placeholderTextColor={secondaryText}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={secondaryText} />
                </TouchableOpacity>
              )}
            </View>

            {isLoading && sectors.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={primaryColor} />
                <Text style={[styles.loadingText, { color: secondaryText }]}>Cargando sectores...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredSectors}
                keyExtractor={item => String(item.id)}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListHeaderComponent={
                  <TouchableOpacity
                    style={[styles.sectorItem, { borderBottomColor: borderColor }]}
                    onPress={() => handleSelect(null)}
                  >
                    <Text style={[styles.sectorName, { color: secondaryText, fontStyle: 'italic' }]}>
                      Sin sector especificado
                    </Text>
                    {(value === null || value === undefined) && (
                      <Ionicons name="checkmark" size={20} color={primaryColor} />
                    )}
                  </TouchableOpacity>
                }
                renderItem={({ item }) => {
                  const isSelected = value === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.sectorItem, { borderBottomColor: borderColor }]}
                      onPress={() => handleSelect(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.sectorName,
                            {
                              color: isSelected ? primaryColor : textColor,
                              fontWeight: isSelected ? 'bold' : 'normal',
                            },
                          ]}
                        >
                          {item.name}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={20} color={primaryColor} />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: secondaryText }]}>
                      No se encontraron sectores coincidentes.
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </KeyboardAvoidingView>
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
  inputIcon: {
    marginRight: 12,
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: 20,
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
  sectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectorName: {
    fontSize: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontStyle: 'italic',
  },
});
