import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContacts } from '../../context/ContactsContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { ContactCard } from '../../components/ContactCard';

export default function FavoritosScreen() {
  const router = useRouter();
  const { contacts, isLoading, updateContact, refreshContacts } = useContacts();
  const [refreshing, setRefreshing] = useState(false);
  const favoriteContacts = useMemo(
    () => contacts.filter(contact => contact && contact.favorito),
    [contacts]
  );

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent2 = useThemeColor({}, 'accent2');
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
      console.error('Error refreshing favorites:', error);
    } finally {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setRefreshing(false);
    }
  }, [refreshContacts]);

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
      <View style={[styles.header, { backgroundColor: cardColor, borderBottomColor: borderColor }]}>
        <Ionicons name="star" size={28} color={accent2} style={styles.headerIcon} />
        <Text style={[styles.title, { color: primaryColor }]}>Mis Favoritos</Text>
        <Text style={[styles.subtitle, { color: secondaryText }]}>Tus contactos más importantes</Text>
      </View>

      <FlatList
        data={favoriteContacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderContactItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[primaryColor]}
            tintColor={primaryColor}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: secondaryText }}>Aún no tienes contactos marcados como favoritos.</Text>
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
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerIcon: {
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
});
