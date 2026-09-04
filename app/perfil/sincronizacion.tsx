import React, { useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/use-theme-color';

export default function SincronizacionScreen() {
  const navigation = useNavigation();

  // Colores del sistema de temas existente
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');

  // Configuración del Header de navegación
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Sincronización',
      headerStyle: { backgroundColor },
      headerTintColor: primaryColor,
      headerTitleStyle: { color: primaryColor, fontWeight: 'bold' },
    });
  }, [navigation, backgroundColor, primaryColor]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Encabezado Introductorio */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerIconBadge, { backgroundColor: primaryColor + '15' }]}>
          <Ionicons name="sync-outline" size={28} color={primaryColor} />
        </View>
        <Text style={[styles.headerTitle, { color: primaryColor }]}>Sincronización</Text>
        <Text style={[styles.headerDescription, { color: secondaryText }]}>
          Gestiona la entrada y salida de información de tu red profesional.
        </Text>
      </View>

      {/* 1. Sección Contactos */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: primaryColor }]}>Contactos</Text>
        <Text style={[styles.sectionSubtitle, { color: secondaryText }]}>
          Gestiona los contactos de tu red.
        </Text>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          {/* Opción: Importar contactos */}
          <TouchableOpacity
            style={[styles.itemRow, { borderBottomColor: borderColor }]}
            activeOpacity={0.7}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconBadge, { backgroundColor: primaryColor + '12' }]}>
                <Ionicons name="download-outline" size={20} color={primaryColor} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemTitle, { color: textColor }]}>
                  Importar contactos
                </Text>
                <Text style={[styles.itemDescription, { color: secondaryText }]}>
                  Añade contactos desde archivos o fuentes externas.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={secondaryText} />
          </TouchableOpacity>

          {/* Opción: Exportar contactos */}
          <TouchableOpacity style={styles.itemRow} activeOpacity={0.7}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBadge, { backgroundColor: primaryColor + '12' }]}>
                <Ionicons name="share-outline" size={20} color={primaryColor} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemTitle, { color: textColor }]}>
                  Exportar contactos
                </Text>
                <Text style={[styles.itemDescription, { color: secondaryText }]}>
                  Guarda o comparte tu lista completa de contactos.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={secondaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Sección Empresas */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: primaryColor }]}>Empresas</Text>
        <Text style={[styles.sectionSubtitle, { color: secondaryText }]}>
          Gestiona las empresas de tu red.
        </Text>

        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          {/* Opción: Importar empresas */}
          <TouchableOpacity
            style={[styles.itemRow, { borderBottomColor: borderColor }]}
            activeOpacity={0.7}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconBadge, { backgroundColor: accent1 + '15' }]}>
                <Ionicons name="download-outline" size={20} color={accent1} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemTitle, { color: textColor }]}>
                  Importar empresas
                </Text>
                <Text style={[styles.itemDescription, { color: secondaryText }]}>
                  Añade empresas desde fuentes estructuradas.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={secondaryText} />
          </TouchableOpacity>

          {/* Opción: Exportar empresas */}
          <TouchableOpacity style={styles.itemRow} activeOpacity={0.7}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBadge, { backgroundColor: accent1 + '15' }]}>
                <Ionicons name="share-outline" size={20} color={accent1} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemTitle, { color: textColor }]}>
                  Exportar empresas
                </Text>
                <Text style={[styles.itemDescription, { color: secondaryText }]}>
                  Descarga la información de tus empresas registradas.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={secondaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Sección LinkedIn */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderWithBadge}>
          <Text style={[styles.sectionTitle, { color: primaryColor }]}>LinkedIn</Text>
          <View style={[styles.statusBadge, { backgroundColor: accent1 + '18' }]}>
            <Text style={[styles.statusBadgeText, { color: accent1 }]}>Próximamente</Text>
          </View>
        </View>
        <Text style={[styles.sectionSubtitle, { color: secondaryText }]}>
          Sincronización con LinkedIn.
        </Text>

        <View style={[styles.card, styles.disabledCard, { backgroundColor: cardColor, borderColor }]}>
          <View style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBadge, { backgroundColor: primaryColor + '12' }]}>
                <Ionicons name="logo-linkedin" size={20} color={primaryColor} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemTitle, { color: secondaryText }]}>
                  Conectar cuenta de LinkedIn
                </Text>
                <Text style={[styles.itemDescription, { color: secondaryText }]}>
                  Sincroniza perfiles, experiencias y conexiones profesionales.
                </Text>
              </View>
            </View>
            <View style={[styles.pillBadge, { backgroundColor: borderColor + '60' }]}>
              <Text style={[styles.pillBadgeText, { color: secondaryText }]}>Pendiente</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 4. Sección LHH */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderWithBadge}>
          <Text style={[styles.sectionTitle, { color: primaryColor }]}>LHH</Text>
          <View style={[styles.statusBadge, { backgroundColor: accent2 + '18' }]}>
            <Text style={[styles.statusBadgeText, { color: accent2 }]}>Próximamente</Text>
          </View>
        </View>
        <Text style={[styles.sectionSubtitle, { color: secondaryText }]}>
          Sincronización con la página de LHH.
        </Text>

        <View style={[styles.card, styles.disabledCard, { backgroundColor: cardColor, borderColor }]}>
          <View style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBadge, { backgroundColor: accent2 + '15' }]}>
                <Ionicons name="globe-outline" size={20} color={accent2} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemTitle, { color: secondaryText }]}>
                  Plataforma LHH
                </Text>
                <Text style={[styles.itemDescription, { color: secondaryText }]}>
                  Conecta tus oportunidades y avances con el portal de LHH.
                </Text>
              </View>
            </View>
            <View style={[styles.pillBadge, { backgroundColor: borderColor + '60' }]}>
              <Text style={[styles.pillBadgeText, { color: secondaryText }]}>Pendiente</Text>
            </View>
          </View>
        </View>
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
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  headerIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionHeaderWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  disabledCard: {
    opacity: 0.6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
