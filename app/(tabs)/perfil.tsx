import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_PROFILE } from '../../constants/MockData';
import { useContacts } from '../../context/ContactsContext';
import { useThemeColor } from '../../hooks/use-theme-color';

export default function PerfilScreen() {
  const { contacts } = useContacts();
  const totalContacts = contacts.length;
  const favoritesCount = contacts.filter(c => c.favorito).length;

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent1 = useThemeColor({}, 'accent1');
  const borderColor = useThemeColor({}, 'border');
  const accent2 = useThemeColor({}, 'accent2');

  return (
    <ScrollView style={[styles.container, { backgroundColor }]} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: primaryColor + '10', borderColor: primaryColor }]}>
          <Text style={[styles.avatarText, { color: primaryColor }]}>{MOCK_PROFILE.name.charAt(0)}</Text>
        </View>
        <Text style={[styles.name, { color: primaryColor }]}>{MOCK_PROFILE.name}</Text>
        <Text style={[styles.title, { color: secondaryText }]}>{MOCK_PROFILE.title} en {MOCK_PROFILE.company}</Text>
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: cardColor, borderColor }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: primaryColor }]}>{totalContacts}</Text>
          <Text style={[styles.statLabel, { color: secondaryText }]}>Contactos</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: primaryColor }]}>{favoritesCount}</Text>
          <Text style={[styles.statLabel, { color: secondaryText }]}>Favoritos</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: primaryColor }]}>{MOCK_PROFILE.tags}</Text>
          <Text style={[styles.statLabel, { color: secondaryText }]}>Etiquetas</Text>
        </View>
      </View>

      {/* Settings Menu */}
      <View style={[styles.menuContainer, { backgroundColor: cardColor, borderColor }]}>
        <Text style={[styles.menuTitle, { color: primaryColor }]}>Configuración</Text>
        
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: borderColor }]}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="person-outline" size={24} color={primaryColor} />
            <Text style={[styles.menuItemText, { color: textColor }]}>Editar Perfil</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: borderColor }]}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="notifications-outline" size={24} color={primaryColor} />
            <Text style={[styles.menuItemText, { color: textColor }]}>Notificaciones</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: borderColor }]}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="cloud-upload-outline" size={24} color={primaryColor} />
            <Text style={[styles.menuItemText, { color: textColor }]}>Sincronización</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: borderColor }]}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="lock-closed-outline" size={24} color={primaryColor} />
            <Text style={[styles.menuItemText, { color: textColor }]}>Privacidad y Seguridad</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={secondaryText} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: accent2 + '20', borderColor: accent2 + '40' }]}>
        <Text style={[styles.logoutButtonText, { color: accent2 }]}>Cerrar Sesión</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  menuContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  logoutButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
