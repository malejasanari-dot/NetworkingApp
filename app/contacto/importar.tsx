import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContacts } from '../../context/ContactsContext';
import { useThemeColor } from '../../hooks/use-theme-color';

import { useToast } from '../../context/ToastContext';

export default function ImportarContactosScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { importContacts } = useContacts();
  const [deviceContacts, setDeviceContacts] = useState<any[]>([]);
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

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Importar Contactos',
      headerStyle: { backgroundColor },
      headerTintColor: primaryColor,
      headerTitleStyle: { color: primaryColor, fontWeight: 'bold' },
    });
  }, [navigation, backgroundColor, primaryColor]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await requestPermissionsAsync();
        setPermissionStatus(status);
        if (status === 'granted') {
          const data = await Contact.getAllDetails([
            ContactField.FULL_NAME,
            ContactField.GIVEN_NAME,
            ContactField.MIDDLE_NAME,
            ContactField.FAMILY_NAME,
            ContactField.PHONES,
            ContactField.EMAILS,
            ContactField.COMPANY,
            ContactField.JOB_TITLE,
          ]);

          if (data && data.length > 0) {
            const filtered = data.filter(c => {
              const fullName = c.fullName || [c.givenName, c.familyName].filter(Boolean).join(' ');
              return fullName && fullName.trim().length > 0;
            });
            setDeviceContacts(filtered);
          }
        }
      } catch (e) {
        console.error('Error cargando contactos del dispositivo:', e);
      } finally {
        setIsLoading(false);
      }
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

  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (isImporting) return;
    if (selectedIds.size === 0) {
      toast.info('Selecciona al menos un contacto para importar.');
      return;
    }

    setIsImporting(true);
    try {
      const contactsToImport = deviceContacts
        .filter(c => selectedIds.has(c.id))
        .map((c: any) => {
          const fullName = c.fullName || [c.givenName, c.familyName].filter(Boolean).join(' ') || c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Contacto sin nombre';
          const phone = (c.phones && c.phones.length > 0 ? c.phones[0].number : '') || (c.phoneNumbers && c.phoneNumbers.length > 0 ? c.phoneNumbers[0].number : '') || '';
          const company = c.company || c.jobTitle || '';
          return {
            name: fullName.trim(),
            phone: phone,
            company: company,
            tags: [],
            favorito: false,
            notes: undefined,
          };
        });

      const result = await importContacts(contactsToImport);
      if (result.imported > 0) {
        toast.success(`${result.imported} ${result.imported === 1 ? 'contacto importado' : 'contactos importados'} correctamente`);
      } else {
        toast.info('No hay contactos nuevos para importar');
      }
      router.back();
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo completar la importación.');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return deviceContacts;
    return deviceContacts.filter(contact => {
      const fullName = contact.fullName || [contact.givenName, contact.familyName].filter(Boolean).join(' ') || contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ');
      const phone = (contact.phones && contact.phones.length > 0 ? contact.phones[0].number : '') || (contact.phoneNumbers && contact.phoneNumbers.length > 0 ? contact.phoneNumbers[0].number : '') || '';
      return (
        (fullName && fullName.toLowerCase().includes(q)) ||
        (phone && phone.toLowerCase().includes(q))
      );
    });
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }: { item: any }) => {
          const isSelected = selectedIds.has(item.id);
          const phoneNumber = (item.phones && item.phones.length > 0 ? item.phones[0].number : '') || (item.phoneNumbers && item.phoneNumbers.length > 0 ? item.phoneNumbers[0].number : '') || 'Sin número';
          const name = item.fullName || [item.givenName, item.familyName].filter(Boolean).join(' ') || item.name || [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Contacto';
          
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
                <Text style={[styles.contactName, { color: textColor }]}>
                  {name}
                </Text>
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

      <View style={[styles.footer, { borderTopColor: borderColor, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity 
          style={[
            styles.importButton, 
            { backgroundColor: accent1 }, 
            (selectedIds.size === 0 || isImporting) && { backgroundColor: accent1 + '60' }
          ]} 
          onPress={handleImport}
          disabled={selectedIds.size === 0 || isImporting}
          activeOpacity={0.7}
        >
          {isImporting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.importButtonText}>
              Importar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </KeyboardAvoidingView>
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
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
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
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
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
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
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
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
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
