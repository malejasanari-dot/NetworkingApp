import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { MOCK_PROFILE } from '../../constants/MockData';
import { useContacts } from '../../context/ContactsContext';
import { useCompanies } from '../../context/CompaniesContext';
import { useNotes } from '../../context/NotesContext';
import { useReminders } from '../../context/RemindersContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { useAuth } from '../../context/AuthContext';

export default function PerfilScreen() {
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const { contacts } = useContacts();
  const { companies } = useCompanies();
  const { notes } = useNotes();
  const { reminders } = useReminders();

  const totalContacts = contacts.length;
  const totalCompanies = companies.length;
  const totalReminders = (reminders || []).length;

  // 1. Total Contactos = totalContacts
  // 2. Total Empresas = totalCompanies

  // 3. Actividad últimos 7 días (contactos añadidos + notas + recordatorios en últimos 7 días)
  const activityLast7Days = useMemo(() => {
    const now = new Date().getTime();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const recentContactsCount = contacts.filter(c => {
      if (!c || !c.dateAdded) return false;
      const t = new Date(c.dateAdded).getTime();
      return !isNaN(t) && t >= sevenDaysAgo && t <= now;
    }).length;

    const recentNotesCount = (notes || []).filter(n => {
      if (!n || !n.fecha) return false;
      const t = new Date(n.fecha).getTime();
      return !isNaN(t) && t >= sevenDaysAgo && t <= now;
    }).length;

    const recentRemindersCount = (reminders || []).filter(r => {
      if (!r || !r.fecha) return false;
      const t = new Date(r.fecha).getTime();
      return !isNaN(t) && t >= sevenDaysAgo && t <= now;
    }).length;

    return recentContactsCount + recentNotesCount + recentRemindersCount;
  }, [contacts, notes, reminders]);

  // 4. Completados (recordatorios con fecha <= now)
  const completedRemindersCount = useMemo(() => {
    const now = new Date().getTime();
    return (reminders || []).filter(r => {
      if (!r || !r.fecha) return false;
      const t = new Date(r.fecha).getTime();
      return !isNaN(t) && t <= now;
    }).length;
  }, [reminders]);

  // 5. Contactos activos (contactos con al menos una nota o recordatorio asociado)
  const activeContactsCount = useMemo(() => {
    if (!contacts || contacts.length === 0) return 0;
    const contactsWithNotesOrReminders = new Set<string>();
    (notes || []).forEach(n => {
      if (n && n.contactoId) contactsWithNotesOrReminders.add(n.contactoId);
    });
    (reminders || []).forEach(r => {
      if (r && r.contactoId) contactsWithNotesOrReminders.add(r.contactoId);
    });
    return contacts.filter(c => c && contactsWithNotesOrReminders.has(c.id)).length;
  }, [contacts, notes, reminders]);

  // 6. Tasa de tareas completadas (Completados / Total recordatorios * 100, con protección de división por cero)
  const completionRate = useMemo(() => {
    if (totalReminders === 0) return 0;
    return Math.min(100, Math.max(0, Math.round((completedRemindersCount / totalReminders) * 100)));
  }, [completedRemindersCount, totalReminders]);

  // 7. Ratio de favoritos (Favoritos / Total contactos * 100, manteniendo fórmula existente en Dashboard)
  const favoritesCount = useMemo(() => contacts.filter(c => c && c.favorito).length, [contacts]);
  const favoriteRatio = useMemo(() => {
    if (totalContacts === 0) return 0;
    return Math.min(100, Math.max(0, Math.round((favoritesCount / totalContacts) * 100)));
  }, [favoritesCount, totalContacts]);

  // Nombre y cargo dinámicos del perfil real
  const displayName = profile?.name || (user?.user_metadata?.name as string) || MOCK_PROFILE.name;
  const displayTitle = useMemo(() => {
    const title = profile?.title || (profile === null ? MOCK_PROFILE.title : '');
    const company = profile?.company || (profile === null ? MOCK_PROFILE.company : '');

    if (title && company) return `${title} en ${company}`;
    if (title) return title;
    if (company) return company;
    return `${MOCK_PROFILE.title} en ${MOCK_PROFILE.company}`;
  }, [profile]);

  // Colores de tema
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');
  const borderColor = useThemeColor({}, 'border');

  const handleLogoutPress = () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Deseas cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Cerrar sesión", 
          style: "destructive", 
          onPress: async () => {
            await logout();
          } 
        }
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor }]} contentContainerStyle={styles.content}>
      {/* 1. Encabezado del Perfil */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: primaryColor + '15', borderColor: primaryColor }]}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatarImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Text style={[styles.avatarText, { color: primaryColor }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={[styles.name, { color: primaryColor }]}>{displayName}</Text>
        <Text style={[styles.title, { color: secondaryText }]}>
          {displayTitle}
        </Text>
      </View>

      {/* 2. Métricas Principales (Grid 2x2 compacta) */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: primaryColor }]}>Resumen General</Text>

        <View style={styles.gridContainer}>
          {/* Métrica 1: Total Contactos */}
          <View style={[styles.gridCard, { backgroundColor: cardColor, borderColor }]}>
            <View style={[styles.iconBadge, { backgroundColor: primaryColor + '12' }]}>
              <Ionicons name="people-outline" size={20} color={primaryColor} />
            </View>
            <Text style={[styles.metricValue, { color: primaryColor }]}>{totalContacts}</Text>
            <Text style={[styles.metricLabel, { color: secondaryText }]} numberOfLines={1}>Contactos</Text>
          </View>

          {/* Métrica 2: Total Empresas */}
          <View style={[styles.gridCard, { backgroundColor: cardColor, borderColor }]}>
            <View style={[styles.iconBadge, { backgroundColor: primaryColor + '12' }]}>
              <Ionicons name="business-outline" size={20} color={primaryColor} />
            </View>
            <Text style={[styles.metricValue, { color: primaryColor }]}>{totalCompanies}</Text>
            <Text style={[styles.metricLabel, { color: secondaryText }]} numberOfLines={1}>Empresas</Text>
          </View>

          {/* Métrica 3: Actividad últimos 7 días */}
          <View style={[styles.gridCard, { backgroundColor: cardColor, borderColor }]}>
            <View style={[styles.iconBadge, { backgroundColor: accent1 + '15' }]}>
              <Ionicons name="flash-outline" size={20} color={accent1} />
            </View>
            <Text style={[styles.metricValue, { color: accent1 }]}>{activityLast7Days}</Text>
            <Text style={[styles.metricLabel, { color: secondaryText }]} numberOfLines={1}>Actividad 7d</Text>
          </View>

          {/* Métrica 4: Completados */}
          <View style={[styles.gridCard, { backgroundColor: cardColor, borderColor }]}>
            <View style={[styles.iconBadge, { backgroundColor: accent2 + '15' }]}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color={accent2} />
            </View>
            <Text style={[styles.metricValue, { color: accent2 }]}>{completedRemindersCount}</Text>
            <Text style={[styles.metricLabel, { color: secondaryText }]} numberOfLines={1}>Completados</Text>
          </View>
        </View>
      </View>

      {/* 3. Rendimiento de la Red */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: primaryColor }]}>Rendimiento de la Red</Text>

        <View style={[styles.performanceCard, { backgroundColor: cardColor, borderColor }]}>
          {/* Métrica 5: Contactos activos */}
          <View style={[styles.performanceItem, { borderBottomColor: borderColor }]}>
            <View style={styles.performanceHeader}>
              <View style={styles.performanceLeft}>
                <View style={[styles.miniIconCircle, { backgroundColor: primaryColor + '12' }]}>
                  <Ionicons name="pulse-outline" size={18} color={primaryColor} />
                </View>
                <Text style={[styles.performanceText, { color: textColor }]}>Contactos activos</Text>
              </View>
              <Text style={[styles.performanceBadgeText, { color: primaryColor }]}>
                {activeContactsCount} <Text style={{ fontSize: 12, fontWeight: 'normal', color: secondaryText }}>de {totalContacts}</Text>
              </Text>
            </View>
          </View>

          {/* Métrica 6: Tasa de tareas completadas */}
          <View style={[styles.performanceItem, { borderBottomColor: borderColor }]}>
            <View style={styles.performanceHeader}>
              <View style={styles.performanceLeft}>
                <View style={[styles.miniIconCircle, { backgroundColor: accent2 + '15' }]}>
                  <Ionicons name="checkbox-outline" size={18} color={accent2} />
                </View>
                <Text style={[styles.performanceText, { color: textColor }]}>Tasa de tareas completadas</Text>
              </View>
              <Text style={[styles.performanceBadgeText, { color: accent2 }]}>{completionRate}%</Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: borderColor + '40' }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    backgroundColor: accent2, 
                    width: `${completionRate}%` 
                  }
                ]} 
              />
            </View>
          </View>

          {/* Métrica 7: Ratio de favoritos */}
          <View style={styles.performanceItem}>
            <View style={styles.performanceHeader}>
              <View style={styles.performanceLeft}>
                <View style={[styles.miniIconCircle, { backgroundColor: accent1 + '18' }]}>
                  <Ionicons name="star-outline" size={18} color={accent1} />
                </View>
                <Text style={[styles.performanceText, { color: textColor }]}>Ratio de favoritos</Text>
              </View>
              <Text style={[styles.performanceBadgeText, { color: accent1 }]}>{favoriteRatio}%</Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: borderColor + '40' }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    backgroundColor: accent1, 
                    width: `${favoriteRatio}%` 
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      </View>

      {/* 4. Acciones y Configuración del Perfil */}
      <View style={[styles.menuContainer, { backgroundColor: cardColor, borderColor }]}>
        <Text style={[styles.menuTitle, { color: primaryColor }]}>Configuración</Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, { borderBottomColor: borderColor }]} 
          onPress={() => router.push('/perfil/editar')}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="person-outline" size={22} color={primaryColor} />
            <Text style={[styles.menuItemText, { color: textColor }]}>Editar Perfil</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: borderColor }]} activeOpacity={0.7}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="notifications-outline" size={22} color={primaryColor} />
            <Text style={[styles.menuItemText, { color: textColor }]}>Notificaciones</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: borderColor }]} activeOpacity={0.7}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="cloud-upload-outline" size={22} color={primaryColor} />
            <Text style={[styles.menuItemText, { color: textColor }]}>Sincronización</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="lock-closed-outline" size={22} color={primaryColor} />
            <Text style={[styles.menuItemText, { color: textColor }]}>Privacidad y Seguridad</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Botón de Cerrar Sesión */}
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: accent2 + '15', borderColor: accent2 + '35' }]}
        onPress={handleLogoutPress}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color={accent2} style={{ marginRight: 8 }} />
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
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
  },
  title: {
    fontSize: 14,
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  performanceCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  performanceItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  miniIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  performanceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  performanceBadgeText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  menuContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
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
    fontSize: 15,
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});

