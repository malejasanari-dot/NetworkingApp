import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useContacts } from '../../context/ContactsContext';
import { useCompanies, Company } from '../../context/CompaniesContext';
import { useReminders } from '../../context/RemindersContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { ContactCard } from '../../components/ContactCard';

export default function HomeScreen() {
  const router = useRouter();
  const { contacts } = useContacts();
  const { companies } = useCompanies();
  const { theme, setTheme, isDark } = useTheme();
  const { getUpcomingReminders } = useReminders();
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const accent1 = useThemeColor({}, 'accent1');

  const upcomingReminders = getUpcomingReminders(7);
  const recentContacts = contacts.slice(0, 2); 
  
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

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day} ${monthNames[date.getMonth()]} ${date.getFullYear()} - ${timeString}`;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor }]} contentContainerStyle={styles.content}>
      {/* Theme Switch Section */}
      <View style={[styles.themeCard, { backgroundColor: cardColor, borderColor }]}>
        <View style={styles.themeInfo}>
          <Text style={[styles.themeTitle, { color: primaryColor }]}>Modo Oscuro</Text>
          <Text style={[styles.themeSubtitle, { color: secondaryText }]}>
            {isDark ? 'Desactiva para tema claro' : 'Activa para tema oscuro'}
          </Text>
        </View>
        <View style={styles.switchContainer}>
          <Ionicons name="sunny" size={20} color={isDark ? secondaryText : '#FFB800'} style={{ marginRight: 8 }} />
          <Switch 
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: borderColor, true: primaryColor + '50' }}
            thumbColor={isDark ? primaryColor : '#f4f3f4'}
            ios_backgroundColor={borderColor}
          />
          <Ionicons name="moon" size={20} color={isDark ? '#BB86FC' : secondaryText} style={{ marginLeft: 8 }} />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={[styles.quickActionBox, { backgroundColor: cardColor, borderColor }]} 
          onPress={() => router.push('/agregar')}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme === 'dark' ? '#331D36' : '#F3EAF4' }]}>
            <Ionicons name="person-add" size={24} color={primaryColor} />
          </View>
          <Text style={[styles.quickActionText, { color: primaryColor }]}>Nuevo Contacto</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.quickActionBox, { backgroundColor: cardColor, borderColor }]} 
          onPress={() => router.push('/favoritos')}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme === 'dark' ? '#3D1520' : '#FFEDF1' }]}>
            <Ionicons name="star" size={24} color="#E23369" />
          </View>
          <Text style={[styles.quickActionText, { color: primaryColor }]}>Ver Favoritos</Text>
        </TouchableOpacity>
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
              style={[styles.reminderCard, { backgroundColor: cardColor, borderColor }]}
              onPress={() => router.push(`/contacto/${reminder.contactoId}`)}
            >
              <View style={styles.reminderIcon}>
                <Ionicons name="notifications" size={20} color={accent1} />
              </View>
              <View style={styles.reminderInfo}>
                <Text style={[styles.reminderTitle, { color: textColor }]}>
                  {contact ? contact.name : 'Contacto'}
                </Text>
                <Text style={[styles.reminderSubtitle, { color: secondaryText }]} numberOfLines={1}>
                  {reminder.nota || 'Sin nota de seguimiento'}
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

      {/* Recent Contacts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: primaryColor }]}>Agregados Recientemente</Text>
          <TouchableOpacity onPress={() => router.push('/contactos')}>
            <Text style={[styles.seeAllText, { color: accent1 }]}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        {recentContacts.map(contact => (
          <ContactCard 
            key={contact.id} 
            contact={contact} 
            onPress={() => router.push(`/contacto/${contact.id}`)} 
          />
        ))}
        {recentContacts.length === 0 && (
          <Text style={{ textAlign: 'center', color: secondaryText, marginTop: 10 }}>Sin contactos recientes</Text>
        )}
      </View>

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
  themeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  themeInfo: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  themeSubtitle: {
    fontSize: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
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
    marginBottom: 12,
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
    borderLeftColor: '#FF8F3B',
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
  }
});
