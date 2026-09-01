import React, { useMemo, useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, Platform, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../../context/AuthContext';
import { useContacts } from '../../context/ContactsContext';
import { useCompanies } from '../../context/CompaniesContext';
import { useReminders } from '../../context/RemindersContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { formatDate } from '../../utils/date';
import { MOCK_PROFILE } from '../../constants/MockData';
import { StatsDonutChart } from '../../components/StatsDonutChart';
import { CategoryDistributionBar } from '../../components/CategoryDistributionBar';

export default function HomeScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 600;

  const { user, profile } = useAuth();
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
    if (totalCompanies === 0) return 0;
    const relatedCompaniesCount = companies.filter(company => {
      if (!company) return false;
      if (Array.isArray(company.contactIds) && company.contactIds.length > 0) {
        return true;
      }
      return contacts.some(c => {
        if (!c) return false;
        if (c.empresaActual === company.id) return true;
        if (Array.isArray(c.empresasAnteriores) && c.empresasAnteriores.includes(company.id)) return true;
        if (c.company && c.company.trim().toLowerCase() === company.name.trim().toLowerCase()) return true;
        return false;
      });
    }).length;
    return Math.round((relatedCompaniesCount / totalCompanies) * 100);
  }, [companies, totalCompanies, contacts]);

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

  // Motor de Selección de Frases Motivadoras por Prioridad (Categorías A - H)
  const motivationalMessage = useMemo(() => {
    // Evaluación de empresas sin contactos relacionados
    const unrelatedCompaniesCount = companies.filter(company => {
      if (!company) return false;
      if (Array.isArray(company.contactIds) && company.contactIds.length > 0) return false;
      const isLinked = contacts.some(c => 
        c && (
          c.empresaActual === company.id || 
          (Array.isArray(c.empresasAnteriores) && c.empresasAnteriores.includes(company.id)) ||
          (c.company && c.company.trim().toLowerCase() === company.name.trim().toLowerCase())
        )
      );
      return !isLinked;
    }).length;

    // Alternancia determinista entre Frase 1 y Frase 2 (Sección 7)
    const altIndex = (totalContacts + totalCompanies + totalRemindersCount) % 2;

    // PRIORIDAD 1: Seguimientos pendientes (Categoría E: COMPLETAR SEGUIMIENTOS)
    if (totalRemindersCount > 0) {
      return {
        category: 'E',
        icon: 'notifications-outline' as const,
        color: accent1,
        text: altIndex === 0 
          ? "Tienes relaciones esperando tu atención. Completa tus seguimientos y mantén tu red activa."
          : "Un pequeño seguimiento puede mantener viva una gran conexión. Ponte al día con tus pendientes."
      };
    }

    // PRIORIDAD 2: Empresas sin contactos relacionados (Categoría C: RELACIONAR CONTACTOS CON EMPRESAS)
    if (unrelatedCompaniesCount > 0 && totalCompanies > 0) {
      return {
        category: 'C',
        icon: 'link-outline' as const,
        color: accent1,
        text: altIndex === 0
          ? "Una empresa sin contactos es solo un nombre. Relaciona tus conexiones y completa tu red."
          : "Conecta tus contactos con sus empresas y convierte tu red en relaciones visibles."
      };
    }

    // PRIORIDAD 3: Muy pocos contactos (Categoría A: AGREGAR CONTACTOS)
    if (totalContacts < 3) {
      return {
        category: 'A',
        icon: 'people-outline' as const,
        color: primaryColor,
        text: altIndex === 0
          ? "Cada nueva conexión puede abrir una nueva oportunidad. Agrega un contacto hoy."
          : "Tu red empieza con una conversación. Suma nuevos contactos y hazla crecer."
      };
    }

    // PRIORIDAD 4: Pocas empresas respecto a los contactos existentes (Categoría B: AGREGAR EMPRESAS)
    if (totalCompanies === 0 || totalCompanies < Math.max(1, Math.floor(totalContacts * 0.3))) {
      return {
        category: 'B',
        icon: 'business-outline' as const,
        color: primaryColor,
        text: altIndex === 0
          ? "Tu red también vive en las empresas. Agrega las organizaciones que forman parte de tus conexiones."
          : "Conocer dónde están tus contactos te ayuda a descubrir nuevas oportunidades. Agrega una empresa."
      };
    }

    // PRIORIDAD 5: No hay seguimientos y poca actividad reciente (Categoría F: NUTRIR LA RED)
    if (totalRemindersCount === 0 && totalContacts < 8) {
      return {
        category: 'F',
        icon: 'sparkles-outline' as const,
        color: primaryColor,
        text: altIndex === 0
          ? "Una red saludable se cultiva. Retoma una conversación y mantén tus conexiones activas."
          : "Tu red ya creció. Ahora es momento de nutrirla con nuevas conversaciones."
      };
    }

    // PRIORIDAD 6: Existe crecimiento y buena actividad (Categoría G: RECONOCER CRECIMIENTO)
    if (totalContacts >= 5 && companyPercentage < 75) {
      return {
        category: 'G',
        icon: 'trending-up-outline' as const,
        color: primaryColor,
        text: altIndex === 0
          ? "Tu red está creciendo. Sigue conectando personas, empresas y oportunidades."
          : "Cada conexión suma. Tu networking está tomando fuerza; sigue construyendo relaciones."
      };
    }

    // PRIORIDAD 7: La red tiene buena relación entre empresas y contactos (Categoría H: RED BIEN RELACIONADA)
    return {
      category: 'H',
      icon: 'planet-outline' as const,
      color: primaryColor,
      text: altIndex === 0
        ? "Tu red está bien conectada. Sigue fortaleciendo las relaciones que ya construiste."
        : "Personas y empresas están tomando forma como una verdadera red. Sigue construyendo relaciones."
    };
  }, [contacts, companies, totalContacts, totalCompanies, totalRemindersCount, companyPercentage, primaryColor, accent1]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[primaryColor]}
            tintColor={primaryColor}
          />
        }
      >
        {/* 1. Encabezado elegante y compacto */}
        <View style={styles.userHeader}>
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
                {(profile?.name || (user?.user_metadata?.name as string) || MOCK_PROFILE.name).charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.userTextContainer}>
            <Text style={[styles.greeting, { color: primaryColor }]}>
              ¡Hola, {(profile?.name || (user?.user_metadata?.name as string) || MOCK_PROFILE.name).split(' ')[0]}!
            </Text>
            <Text style={[styles.userRole, { color: secondaryText }]} numberOfLines={1}>
              {profile?.title || MOCK_PROFILE.title}
            </Text>
          </View>
        </View>

        {/* 2. Tarjeta principal: Salud de mi Red */}
        <View style={[styles.healthCardContainer, { backgroundColor: cardColor, borderColor }]}>
          <Text style={[styles.healthCardTitle, { color: primaryColor }]}>Salud de mi Red</Text>

          <View style={styles.statsRow}>
            {/* Indicador A: Seguimientos pendientes */}
            <View style={styles.statBox}>
              <View style={[styles.statIconBadge, { backgroundColor: accent1 + '15' }]}>
                <Ionicons name="notifications" size={20} color={accent1} />
              </View>
              <Text style={[styles.bigNumberText, { color: accent1 }]}>
                {totalRemindersCount}
              </Text>
              <Text style={[styles.statLabelText, { color: secondaryText }]} numberOfLines={2}>
                {totalRemindersCount === 1 ? 'Seguimiento pendiente' : 'Seguimientos pendientes'}
              </Text>
            </View>

            {/* Divisor vertical sutil */}
            <View style={[styles.verticalDivider, { backgroundColor: borderColor + '80' }]} />

            {/* Indicador B: Dona de Empresas Relacionadas */}
            <View style={styles.statBox}>
              <StatsDonutChart companyPercentage={companyPercentage} size={76} companyColor={primaryColor} />
              <Text style={[styles.statLabelText, { color: secondaryText, marginTop: 6 }]} numberOfLines={2}>
                Empresas relacionadas
              </Text>
            </View>
          </View>

          {/* Indicador C: Mensaje Motivador Editorial integrado */}
          <View style={[styles.editorialMotivationalSection, { borderTopColor: borderColor + '50' }]}>
            <View style={[styles.editorialIconWrapper, { backgroundColor: motivationalMessage.color + '15' }]}>
              <Ionicons name={motivationalMessage.icon} size={20} color={motivationalMessage.color} />
            </View>
            <Text style={[styles.editorialPhraseText, { color: textColor }]}>
              "{motivationalMessage.text}"
            </Text>
          </View>
        </View>

        {/* 3. Distribución de mi Red — Sección independiente */}
        <View style={[styles.distributionCard, { backgroundColor: cardColor, borderColor }]}>
          <Text style={[styles.distributionTitle, { color: primaryColor }]}>Distribución de mi Red</Text>
          <CategoryDistributionBar contacts={contacts} />
        </View>

        {/* 4. Últimos contactos agregados */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>Últimos contactos agregados</Text>
            <TouchableOpacity 
              onPress={() => router.push('/contactos')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
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
              <View style={styles.compactInfo}>
                <Text style={[styles.compactTitle, { color: primaryColor }]} numberOfLines={1}>
                  {contact.name}
                </Text>
                {contact.company ? (
                  <Text style={[styles.compactSubtitle, { color: secondaryText }]} numberOfLines={1}>
                    {contact.company}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={secondaryText} />
            </TouchableOpacity>
          ))}

          {recentContacts.length === 0 && (
            <View style={[styles.emptySectionCard, { backgroundColor: cardColor, borderColor }]}>
              <Ionicons name="people-outline" size={24} color={secondaryText} style={{ marginBottom: 4 }} />
              <Text style={[styles.emptySectionText, { color: secondaryText }]}>
                No hay contactos agregados recientemente.
              </Text>
            </View>
          )}
        </View>

        {/* 5. Últimas empresas agregadas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>Últimas empresas agregadas</Text>
            <TouchableOpacity 
              onPress={() => router.push('/empresas')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
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
              <View style={styles.compactInfo}>
                <Text style={[styles.compactTitle, { color: primaryColor }]} numberOfLines={1}>
                  {company.name}
                </Text>
                {(company as any).sector ? (
                  <Text style={[styles.compactSubtitle, { color: secondaryText }]} numberOfLines={1}>
                    {(company as any).sector}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={secondaryText} />
            </TouchableOpacity>
          ))}

          {recentCompanies.length === 0 && (
            <View style={[styles.emptySectionCard, { backgroundColor: cardColor, borderColor }]}>
              <Ionicons name="business-outline" size={24} color={secondaryText} style={{ marginBottom: 4 }} />
              <Text style={[styles.emptySectionText, { color: secondaryText }]}>
                No hay empresas agregadas recientemente.
              </Text>
            </View>
          )}
        </View>

        {/* 6. Próximos recordatorios */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>Próximos Recordatorios</Text>
            {upcomingReminders.length > 0 && (
              <Text style={[styles.seeAllText, { color: accent1 }]}>
                {upcomingReminders.length} {upcomingReminders.length === 1 ? 'pendiente' : 'pendientes'}
              </Text>
            )}
          </View>
          
          {upcomingReminders.map((reminder) => {
            const contact = contacts.find(c => c.id === reminder.contactoId);
            return (
              <TouchableOpacity 
                key={reminder.id} 
                style={[
                  styles.reminderCard, 
                  { 
                    backgroundColor: cardColor, 
                    borderColor, 
                    borderLeftColor: accent1, 
                    opacity: contact ? 1 : 0.75 
                  }
                ]}
                onPress={() => {
                  if (contact) {
                    router.push(`/contacto/${reminder.contactoId}`);
                  }
                }}
                activeOpacity={contact ? 0.7 : 1}
              >
                <View style={styles.reminderIcon}>
                  <Ionicons name="notifications" size={18} color={accent1} />
                </View>
                <View style={styles.reminderInfo}>
                  <Text style={[styles.reminderTitle, { color: primaryColor }]} numberOfLines={1}>
                    {contact ? contact.name : 'Contacto no disponible'}
                  </Text>
                  <Text style={[styles.reminderSubtitle, { color: textColor }]} numberOfLines={1}>
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
            <View style={[styles.emptySectionCard, { backgroundColor: cardColor, borderColor }]}>
              <Ionicons name="calendar-outline" size={24} color={secondaryText} style={{ marginBottom: 4 }} />
              <Text style={[styles.emptySectionText, { color: secondaryText }]}>
                No hay seguimientos pendientes para los próximos 7 días.
              </Text>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRole: {
    fontSize: 13,
    marginTop: 1,
  },
  healthCardContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  healthCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  bigNumberText: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 30,
  },
  statLabelText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
  verticalDivider: {
    width: 1,
    height: 64,
  },
  editorialMotivationalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  editorialIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  editorialPhraseText: {
    flex: 1,
    fontSize: 12.5,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  distributionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  distributionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  compactCard: {
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
  compactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
    marginRight: 10,
  },
  compactInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  compactSubtitle: {
    fontSize: 12,
    marginTop: 1,
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
    lineHeight: 17,
  },
  reminderCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderLeftWidth: 3.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    alignItems: 'center',
  },
  reminderIcon: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  reminderSubtitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  reminderDate: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 1,
  },
});
