import React, { useMemo, useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useContacts } from '../../context/ContactsContext';
import { useCompanies } from '../../context/CompaniesContext';
import { useReminders } from '../../context/RemindersContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { formatDate } from '../../utils/date';
import { MOCK_PROFILE } from '../../constants/MockData';
import { StatsDonutChart } from '../../components/StatsDonutChart';

export default function HomeScreen() {
  const router = useRouter();
  const { contacts, refreshContacts } = useContacts();
  const { companies, refreshCompanies } = useCompanies();
  const { reminders, getUpcomingReminders } = useReminders();
  const [refreshing, setRefreshing] = useState(false);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      if (refreshContacts) await refreshContacts();
      if (refreshCompanies) await refreshCompanies();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setRefreshing(false);
    }
  }, [refreshContacts, refreshCompanies]);

  const upcomingReminders = useMemo(() => {
    return getUpcomingReminders(7);
  }, [getUpcomingReminders]);

  const totalRemindersCount = useMemo(() => {
    return (reminders || []).length;
  }, [reminders]);

  const totalContacts = contacts.length;
  const favoritesCount = useMemo(() => contacts.filter(c => c && c.favorito).length, [contacts]);
  const totalCompanies = companies.length;

  const companyPercentage = useMemo(() => {
    if (totalContacts === 0) return 0;
    const count = contacts.filter(c => c && (c.empresaActual || (c.company && c.company.trim() !== ''))).length;
    return Math.round((count / totalContacts) * 100);
  }, [contacts, totalContacts]);

  const favoritesPercentage = useMemo(() => {
    if (totalContacts === 0) return 0;
    return Math.round((favoritesCount / totalContacts) * 100);
  }, [favoritesCount, totalContacts]);

  // 2 contactos más recientes
  const recentContacts = useMemo(() => {
    return [...(contacts || [])]
      .sort((a, b) => {
        const timeA = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
        const timeB = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 2);
  }, [contacts]);

  // 2 empresas más recientes
  const recentCompanies = useMemo(() => {
    return [...(companies || [])]
      .sort((a, b) => {
        const timeA = (a as any).dateAdded ? new Date((a as any).dateAdded).getTime() : 0;
        const timeB = (b as any).dateAdded ? new Date((b as any).dateAdded).getTime() : 0;
        if (timeA && timeB) return timeB - timeA;
        return 0; // mantener orden de inserción
      })
      .slice(0, 2);
  }, [companies]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[primaryColor]}
            tintColor={primaryColor}
          />
        }
      >
        {/* 1. Encabezado */}
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: primaryColor + '15', borderColor: primaryColor }]}>
            <Text style={[styles.avatarText, { color: primaryColor }]}>{MOCK_PROFILE.name.charAt(0)}</Text>
          </View>
          <View style={styles.userTextContainer}>
            <Text style={[styles.greeting, { color: primaryColor }]}>¡Hola, {MOCK_PROFILE.name.split(' ')[0]}!</Text>
            <Text style={[styles.userRole, { color: secondaryText }]} numberOfLines={1}>{MOCK_PROFILE.title}</Text>
          </View>
        </View>

        {/* 2. Salud de mi Red (Ancho completo) */}
        <View style={[styles.statsCard, { backgroundColor: cardColor, borderColor }]}>
          <Text style={[styles.statsCardTitle, { color: primaryColor }]}>Salud de mi Red</Text>
          
          <StatsDonutChart 
            companyPercentage={companyPercentage}
            favoritesPercentage={favoritesPercentage}
          />

          <View style={styles.metricsRow}>
            <TouchableOpacity 
              style={[styles.metricItem, { backgroundColor: primaryColor + '10' }]}
              onPress={() => router.push('/contactos')}
            >
              <Text style={[styles.metricNumber, { color: primaryColor }]}>{totalContacts}</Text>
              <Text style={[styles.metricLabel, { color: secondaryText }]}>Contactos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.metricItem, { backgroundColor: accent2 + '10' }]}
              onPress={() => router.push('/favoritos')}
            >
              <Text style={[styles.metricNumber, { color: accent2 }]}>{favoritesCount}</Text>
              <Text style={[styles.metricLabel, { color: secondaryText }]}>Favoritos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.metricItem, { backgroundColor: accent1 + '10' }]}
              onPress={() => router.push('/empresas')}
            >
              <Text style={[styles.metricNumber, { color: accent1 }]}>{totalCompanies}</Text>
              <Text style={[styles.metricLabel, { color: secondaryText }]}>Empresas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Tarjeta independiente: Seguimientos pendientes (Debajo de Salud de mi Red) */}
        <TouchableOpacity 
          style={[styles.pendingRemindersCard, { backgroundColor: cardColor, borderColor }]}
          onPress={() => router.push('/contactos')}
          activeOpacity={0.7}
        >
          <View style={[styles.bellIconCircle, { backgroundColor: accent1 + '15' }]}>
            <Ionicons name="notifications" size={24} color={accent1} />
          </View>
          <View style={styles.pendingTextContainer}>
            <Text style={[styles.pendingCountNumber, { color: primaryColor }]}>
              {totalRemindersCount}
            </Text>
            <Text style={[styles.pendingCardTitle, { color: textColor }]}>
              Seguimientos pendientes
            </Text>
            <Text style={[styles.pendingCardSubtext, { color: secondaryText }]}>
              {totalRemindersCount === 1 
                ? 'Tienes 1 seguimiento pendiente' 
                : `Tienes ${totalRemindersCount} seguimientos pendientes`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={secondaryText} />
        </TouchableOpacity>

        {/* 4. Últimos contactos agregados (Representación compacta, max 2) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>Últimos contactos agregados</Text>
            <TouchableOpacity onPress={() => router.push('/contactos')}>
              <Text style={[styles.seeAllText, { color: accent1 }]}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {recentContacts.map((contact) => (
            <TouchableOpacity
              key={contact.id}
              style={[styles.compactCard, { backgroundColor: cardColor, borderColor }]}
              onPress={() => router.push(`/contacto/${contact.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.compactAvatar, { backgroundColor: primaryColor }]}>
                <Text style={styles.compactAvatarText}>{contact.name.charAt(0)}</Text>
              </View>
              <Text style={[styles.compactTitle, { color: textColor }]} numberOfLines={1}>
                {contact.name}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={secondaryText} />
            </TouchableOpacity>
          ))}

          {recentContacts.length === 0 && (
            <View style={[styles.emptySectionCard, { backgroundColor: cardColor, borderColor }]}>
              <Ionicons name="people-outline" size={28} color={secondaryText} style={{ marginBottom: 6 }} />
              <Text style={[styles.emptySectionText, { color: secondaryText }]}>No hay contactos agregados recientemente.</Text>
            </View>
          )}
        </View>

        {/* 5. Últimas empresas agregadas (Representación compacta, max 2) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>Últimas empresas agregadas</Text>
            <TouchableOpacity onPress={() => router.push('/empresas')}>
              <Text style={[styles.seeAllText, { color: accent1 }]}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {recentCompanies.map((company) => (
            <TouchableOpacity 
              key={company.id} 
              style={[styles.compactCard, { backgroundColor: cardColor, borderColor }]}
              onPress={() => router.push(`/empresa/${company.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.compactIconCircle, { backgroundColor: primaryColor + '12' }]}>
                <Ionicons name="business" size={18} color={primaryColor} />
              </View>
              <Text style={[styles.compactTitle, { color: textColor }]} numberOfLines={1}>
                {company.name}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={secondaryText} />
            </TouchableOpacity>
          ))}

          {recentCompanies.length === 0 && (
            <View style={[styles.emptySectionCard, { backgroundColor: cardColor, borderColor }]}>
              <Ionicons name="business-outline" size={28} color={secondaryText} style={{ marginBottom: 6 }} />
              <Text style={[styles.emptySectionText, { color: secondaryText }]}>No hay empresas agregadas recientemente.</Text>
            </View>
          )}
        </View>

        {/* 6. Próximos recordatorios */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>Próximos Recordatorios</Text>
            {upcomingReminders.length > 0 && (
              <Text style={[styles.seeAllText, { color: accent1 }]}>{upcomingReminders.length} en total</Text>
            )}
          </View>
          
          {upcomingReminders.map((reminder) => {
            const contact = contacts.find(c => c.id === reminder.contactoId);
            return (
              <TouchableOpacity 
                key={reminder.id} 
                style={[styles.reminderCard, { backgroundColor: cardColor, borderColor, borderLeftColor: accent1, opacity: contact ? 1 : 0.7 }]}
                onPress={() => {
                  if (contact) {
                    router.push(`/contacto/${reminder.contactoId}`);
                  }
                }}
                activeOpacity={contact ? 0.7 : 1}
              >
                <View style={styles.reminderIcon}>
                  <Ionicons name="notifications" size={20} color={accent1} />
                </View>
                <View style={styles.reminderInfo}>
                  <Text style={[styles.reminderTitle, { color: textColor }]}>
                    {contact ? contact.name : 'Contacto no disponible'}
                  </Text>
                  <Text style={[styles.reminderSubtitle, { color: secondaryText }]} numberOfLines={1}>
                    {reminder.nota || 'Sin nota'}
                  </Text>
                  <Text style={[styles.reminderDate, { color: accent1 }]}>
                    {formatDate(reminder.fecha)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          
          {upcomingReminders.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: cardColor, borderColor }]}>
              <Ionicons name="calendar-outline" size={32} color={secondaryText} style={{ marginBottom: 8 }} />
              <Text style={{ color: secondaryText, textAlign: 'center' }}>No hay seguimientos pendientes para los próximos 7 días.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  userTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  userRole: {
    fontSize: 13,
    marginTop: 2,
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  metricItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  pendingRemindersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bellIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  pendingTextContainer: {
    flex: 1,
  },
  pendingCountNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  pendingCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  pendingCardSubtext: {
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  compactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compactAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  compactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compactTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  emptySectionCard: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptySectionText: {
    fontSize: 13,
    textAlign: 'center',
  },
  reminderCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
  },
  reminderIcon: {
    marginRight: 12,
    justifyContent: 'center',
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  reminderSubtitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  reminderDate: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
