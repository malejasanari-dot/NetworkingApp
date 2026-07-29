import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContacts } from '../../context/ContactsContext';
import { useThemeColor } from '../../hooks/use-theme-color';

export default function ImportarContactosScreen() {
  const router = useRouter();
  const { importContacts } = useContacts();
  const [deviceContacts, setDeviceContacts] = useState<Contacts.Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent1 = useThemeColor({}, 'accent1');
  const borderColor = useThemeColor({}, 'border');

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      setPermissionStatus(status);
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
        });

        if (data.length > 0) {
          const filtered = data.filter(c => c.name && c.name.trim().length > 0);
          setDeviceContacts(filtered);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('Aviso', 'Selecciona al menos un contacto para importar.');
      return;
    }

    const contactsToImport = deviceContacts
      .filter(c => selectedIds.has((c as any).id))
      .map((c: any) => ({
        name: c.name,
        phone: c.phoneNumbers && c.phoneNumbers.length > 0 ? c.phoneNumbers[0].number : '',
        company: '',
        tags: [],
        favorito: false,
        notes: `Importado del dispositivo el ${new Date().toLocaleDateString()}`,
      }));

    const result = await importContacts(contactsToImport);
    Alert.alert(
      'Importación Finalizada',
      `Se han importado ${result.imported} contactos. ${result.skipped > 0 ? `(${result.skipped} duplicados omitidos)` : ''}`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const filteredContacts = useMemo(() => {
    return deviceContacts.filter(contact => 
      contact.name && contact.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [deviceContacts, searchQuery]);


  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={[styles.loadingText, { color: secondaryText }]}>Cargando contactos del dispositivo...</Text>
      </View>
    );
  }

  if (permissionStatus !== 'granted') {
    return (
      <View style={[styles.centerContainer, { backgroundColor }]}>
        <Ionicons name="lock-closed-outline" size={64} color={accent1} />
        <Text style={[styles.errorTitle, { color: primaryColor }]}>Permiso Denegado</Text>
        <Text style={[styles.errorText, { color: secondaryText }]}>Necesitamos acceso a tus contactos para poder importarlos.</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: primaryColor }]} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: cardColor, borderBottomColor: borderColor }]}>
        <Text style={[styles.title, { color: primaryColor }]}>Seleccionar Contactos</Text>
        <Text style={[styles.subtitle, { color: secondaryText }]}>{deviceContacts.length} contactos encontrados en tu dispositivo</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor }]}>
        <View style={[styles.searchBox, { backgroundColor: cardColor, borderColor }]}>
          <Ionicons name="search" size={20} color={secondaryText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Buscar contacto por nombre..."
            placeholderTextColor={secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredContacts}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: { item: any }) => {
          const isSelected = selectedIds.has(item.id);
          const phoneNumber = item.phoneNumbers && item.phoneNumbers.length > 0 ? item.phoneNumbers[0].number : 'Sin número';
          
          return (
            <TouchableOpacity 
              style={[
                styles.contactItem, 
                { backgroundColor: cardColor, borderColor },
                isSelected && { borderColor: primaryColor, backgroundColor: primaryColor + '10' }
              ]} 
              onPress={() => toggleSelect((item as any).id)}
            >
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: textColor }]}>{item.name}</Text>
                <Text style={[styles.contactPhone, { color: secondaryText }]}>{phoneNumber}</Text>
              </View>
              <View style={[
                styles.checkbox, 
                { borderColor },
                isSelected && { backgroundColor: primaryColor, borderColor: primaryColor }
              ]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: secondaryText }]}>
              {searchQuery.length > 0 
                ? "No se encontraron contactos" 
                : "No hay contactos en tu dispositivo"}
            </Text>
          </View>
        }
      />

      <View style={[styles.footer, { borderTopColor: borderColor }]}>
        <TouchableOpacity 
          style={[styles.importButton, { backgroundColor: accent1 }, selectedIds.size === 0 && { backgroundColor: accent1 + '60' }]} 
          onPress={handleImport}
          disabled={selectedIds.size === 0}
        >
          <Text style={styles.importButtonText}>
            Importar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactPhone: {
    fontSize: 14,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  importButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
  },
});
