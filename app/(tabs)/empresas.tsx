import React, { useMemo, useLayoutEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useCompanies, Company } from '../../context/CompaniesContext';
import { useContacts } from '../../context/ContactsContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';

export default function EmpresasScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { companies, syncCompanies, refreshCompanies, isLoading: loadingCompanies } = useCompanies();
  const { contacts, updateContact, isLoading: loadingContacts } = useContacts();
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
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
      if (refreshCompanies) {
        await refreshCompanies();
      }
      await syncCompanies(contacts);
    } catch (error) {
      console.error('Error refreshing companies:', error);
    } finally {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setRefreshing(false);
    }
  }, [refreshCompanies, syncCompanies, contacts]);

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
        <View style={styles.headerRightContainer}>
          <TouchableOpacity 
            onPress={handleSync} 
            style={styles.headerActionButton}
            disabled={isSyncing}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Sincronizar empresas"
            accessibilityRole="button"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={primaryColor} />
            ) : (
              <Ionicons name="refresh-outline" size={22} color={primaryColor} />
            )}
          </TouchableOpacity>
          <ThemeToggleButton />
        </View>
      ),
    });
  }, [navigation, contacts, isSyncing, primaryColor, handleSync]);

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
      activeOpacity={0.7}
    >
      <View style={[styles.avatarContainer, { backgroundColor: primaryColor + '12' }]}>
        <Ionicons name="business" size={20} color={primaryColor} />
      </View>

      <View style={styles.companyInfo}>
        <Text style={[styles.companyName, { color: primaryColor }]} numberOfLines={1}>
          {item.name}
        </Text>
        {item.sector ? (
          <Text style={[styles.companySector, { color: secondaryText }]} numberOfLines={1}>
            {item.sector}
          </Text>
        ) : null}
      </View>

      <View style={[
        styles.badge, 
        { backgroundColor: item.contactCount > 0 ? primaryColor + '15' : borderColor + '30' }
      ]}>
        <Text style={[
          styles.badgeText, 
          { color: item.contactCount > 0 ? primaryColor : secondaryText }
        ]}>
          {item.contactCount === 1 ? '1 contacto' : `${item.contactCount} contactos`}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={secondaryText} />
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
            <Ionicons name="business-outline" size={32} color={secondaryText} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyTitle, { color: primaryColor }]}>Sin empresas</Text>
            <Text style={[styles.emptySubtext, { color: secondaryText }]}>
              Agrega tu primera empresa o sincroniza tus contactos para construir tu directorio profesional.
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  companyInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  companyName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  companySector: {
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
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
