import React, { useMemo, useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useContacts } from '../../context/ContactsContext';
import { useCompanies } from '../../context/CompaniesContext';
import { useReminders } from '../../context/RemindersContext';
import { useNotes } from '../../context/NotesContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { formatDate } from '../../utils/date';
import { MOCK_PROFILE } from '../../constants/MockData';
import { StatsDonutChart } from '../../components/StatsDonutChart';
import { RecentActivityFeed, ActivityItem } from '../../components/RecentActivityFeed';
import { SmartFAB } from '../../components/SmartFAB';
import { ReminderModal } from '../../components/ReminderModal';

export default function HomeScreen() {
  const router = useRouter();
  const { contacts } = useContacts();
  const { companies } = useCompanies();
  const { notes } = useNotes();
  const { getUpcomingReminders, addReminder } = useReminders();
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    requestAnimationFrame(() => {
      setRefreshing(false);
    });
  }, []);

  const upcomingReminders = useMemo(() => {
    return getUpcomingReminders(7);
  }, [getUpcomingReminders]);

  const topCompanies = useMemo(() => {
    return companies
      .map(company => {
        const count = contacts.filter(
          c => c.empresaActual === company.id || 
               c.empresasAnteriores?.includes(company.id) ||
               (!c.empresaActual && c.company && c.company.toLowerCase() === company.name.toLowerCase())
        ).length;
        return { ...company, contactCount: count };
      })
      .filter(c => c.contactCount > 0)
      .sort((a, b) => b.contactCount - a.contactCount)
      .slice(0, 5);
  }, [companies, contacts]);


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

  const remindersPercentage = useMemo(() => {
    if (totalContacts === 0) return 0;
    return Math.round((upcomingReminders.length / totalContacts) * 100);
  }, [upcomingReminders, totalContacts]);

  const recentActivities = useMemo<ActivityItem[]>(() => {
    const contactEvents: ActivityItem[] = (contacts || []).map(c => ({
      id: `contact_${c.id}`,
      type: 'contact',
      date: c.dateAdded || new Date().toISOString(),
      contactId: c.id,
      contactName: c.name,
    }));

    const noteEvents: ActivityItem[] = (notes || []).map(n => {
      const contactObj = (contacts || []).find(c => c.id === n.contactoId);
      return {
        id: `note_${n.id}`,
        type: 'note',
        date: n.fecha,
        contactId: n.contactoId,
        contactName: contactObj ? contactObj.name : 'Contacto no disponible',
        content: n.contenido,
      };
    });

    const combined = [...contactEvents, ...noteEvents];
    return combined
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [contacts, notes]);

  const handlePressActivity = useCallback((item: ActivityItem) => {
    if (item && item.contactId) {
      router.push(`/contacto/${item.contactId}`);
    }
  }, [router]);

  const handleFABAddContact = useCallback(() => {
    router.push('/agregar');
  }, [router]);

  const handleFABAddCompany = useCallback(() => {
    router.push('/empresa/agregar');
  }, [router]);

  const handleFABAddReminder = useCallback(() => {
    setIsReminderModalVisible(true);
  }, []);

  const handleSaveReminder = useCallback(async (data: { fecha: string; nota: string }) => {
    const defaultContactId = contacts.length > 0 ? contacts[0].id : '';
    await addReminder({
      contactoId: defaultContactId,
      fecha: data.fecha,
      nota: data.nota,
    });
  }, [contacts, addReminder]);

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
        {/* Header de Usuario */}
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: primaryColor + '15', borderColor: primaryColor }]}>
            <Text style={[styles.avatarText, { color: primaryColor }]}>{MOCK_PROFILE.name.charAt(0)}</Text>
          </View>
          <View style={styles.userTextContainer}>
            <Text style={[styles.greeting, { color: primaryColor }]}>¡Hola, {MOCK_PROFILE.name.split(' ')[0]}!</Text>
            <Text style={[styles.userRole, { color: secondaryText }]} numberOfLines={1}>{MOCK_PROFILE.title}</Text>
          </View>
        </View>

        {/* Dashboard Estadístico con StatsDonutChart */}
        <View style={[styles.statsCard, { backgroundColor: cardColor, borderColor }]}>
          <Text style={[styles.statsCardTitle, { color: primaryColor }]}>Salud de mi Red</Text>
          
          <StatsDonutChart 
            companyPercentage={companyPercentage}
            favoritesPercentage={favoritesPercentage}
            remindersPercentage={remindersPercentage}
          />

          {/* Tarjetas de Métricas Rápidas */}
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

        {/* Companies Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>Empresas en mi Red</Text>
            <TouchableOpacity onPress={() => router.push('/empresas')}>
              <Text style={[styles.seeAllText, { color: accent1 }]}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companiesScroll}>
            {topCompanies.map((company) => (
              <TouchableOpacity 
                key={company.id} 
                style={[styles.companyMiniCard, { backgroundColor: cardColor, borderColor }]}
                onPress={() => router.push(`/empresa/${company.id}`)}
              >
                <View style={[styles.companyIconCircle, { backgroundColor: primaryColor + '10' }]}>
                  <Ionicons name="business" size={20} color={primaryColor} />
                </View>
                <Text style={[styles.companyMiniTitle, { color: textColor }]} numberOfLines={1}>
                  {company.name}
                </Text>
                <View style={[styles.companyBadge, { backgroundColor: primaryColor + '15' }]}>
                  <Text style={[styles.companyBadgeText, { color: primaryColor }]}>
                    {company.contactCount} {company.contactCount === 1 ? 'persona' : 'personas'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {topCompanies.length === 0 && (
              <View style={[styles.emptyCompanyBox, { borderColor }]}>
                <Text style={{ color: secondaryText, fontSize: 13 }}>
                  Vincula contactos a empresas para ver el resumen aquí.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Reminders Section */}
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

        {/* Seccion de Actividad Reciente */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>Actividad Reciente</Text>
            <TouchableOpacity onPress={() => router.push('/contactos')}>
              <Text style={[styles.seeAllText, { color: accent1 }]}>Ver todo</Text>
            </TouchableOpacity>
          </View>
          
          <RecentActivityFeed 
            activities={recentActivities} 
            onPressItem={handlePressActivity} 
          />
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
    paddingBottom: 40,
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
    marginBottom: 24,
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
  donutPlaceholder: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  donutPlaceholderText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
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
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: 'bold',
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
  companiesScroll: {
    paddingRight: 20,
    gap: 12,
  },
  companyMiniCard: {
    width: 140,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  companyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyMiniTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  companyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  companyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyCompanyBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    width: 250,
    justifyContent: 'center',
  },
  activityPlaceholderCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
