import React, { useMemo, useLayoutEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useCompanies, Company } from '../../context/CompaniesContext';
import { useContacts } from '../../context/ContactsContext';
import { useThemeColor } from '../../hooks/use-theme-color';

export default function EmpresasScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { companies, syncCompanies, isLoading: loadingCompanies } = useCompanies();
  const { contacts, updateContact, isLoading: loadingContacts } = useContacts();
  const [isSyncing, setIsSyncing] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent1 = useThemeColor({}, 'accent1');
  const borderColor = useThemeColor({}, 'border');

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncCompanies(contacts);
      
      for (const contact of contacts) {
        if (!contact.empresaActual && contact.company && contact.company.trim()) {
          const matchedCompany = companies.find(
            c => c.name.toLowerCase() === contact.company?.trim().toLowerCase()
          );
          if (matchedCompany) {
            await updateContact(contact.id, { empresaActual: matchedCompany.id });
          }
        }
      }

      Alert.alert(
        'Sincronización Completada',
        `Se han identificado y creado ${result.created} empresas nuevas a partir de tus contactos.`
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo completar la sincronización.');
    } finally {
      setIsSyncing(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleSync} 
          style={{ marginRight: 15 }}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={primaryColor} />
          ) : (
            <Ionicons name="refresh-circle-outline" size={28} color={primaryColor} />
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, contacts, isSyncing, primaryColor]);

  const companiesWithCount = useMemo(() => {
    return companies.map(company => {
      const associatedContacts = contacts.filter(
        c => c.empresaActual === company.id || 
             c.empresasAnteriores?.includes(company.id) ||
             (!c.empresaActual && c.company && c.company.toLowerCase() === company.name.toLowerCase())
      );
      return {
        ...company,
        contactCount: associatedContacts.length
      };
    });
  }, [companies, contacts]);

  const handlePressCompany = useCallback((id: string) => {
    router.push(`/empresa/${id}`);
  }, [router]);

  const renderCompanyItem = useCallback(({ item }: { item: Company & { contactCount: number } }) => (
    <TouchableOpacity 
      style={[styles.companyCard, { backgroundColor: cardColor, borderColor }]}
      onPress={() => handlePressCompany(item.id)}
    >
      <View style={styles.companyInfo}>
        <Text style={[styles.companyName, { color: primaryColor }]}>{item.name}</Text>
        {item.sector ? <Text style={[styles.companySector, { color: secondaryText }]}>{item.sector}</Text> : null}
      </View>
      <View style={[styles.badge, { backgroundColor: primaryColor + '20' }]}>
        <Text style={[styles.badgeText, { color: primaryColor }]}>{item.contactCount} contactos</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={secondaryText} />
    </TouchableOpacity>
  ), [cardColor, borderColor, primaryColor, secondaryText, handlePressCompany]);

  const keyExtractor = useCallback((item: Company) => item.id, []);

  if (loadingCompanies || loadingContacts) {
    return (
      <View style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <FlatList
        data={companiesWithCount}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        renderItem={renderCompanyItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color={borderColor} />
            <Text style={[styles.emptyText, { color: primaryColor }]}>No hay empresas registradas.</Text>
            <Text style={[styles.emptySubtext, { color: secondaryText }]}>Agregue su primera empresa para comenzar a organizar su red.</Text>
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
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companySector: {
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
