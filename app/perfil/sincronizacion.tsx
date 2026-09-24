import React, { useState, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useThemeColor } from '../../hooks/use-theme-color';
import { useContacts } from '../../context/ContactsContext';
import { useCompanies } from '../../context/CompaniesContext';
import { shadowStyle } from '../../utils/shadow';

const escapeCsv = (val?: string | null): string => {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
};

export default function SincronizacionScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { contacts, updateContact } = useContacts();
  const { companies, syncCompanies } = useCompanies();

  const [isExportingContacts, setIsExportingContacts] = useState(false);
  const [isSyncingCompanies, setIsSyncingCompanies] = useState(false);
  const [isExportingCompanies, setIsExportingCompanies] = useState(false);

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

  // 1. Importar contactos: Navegar a la pantalla de selección e importación
  const handleImportContacts = () => {
    router.push('/contacto/importar');
  };

  // 2. Exportar contactos: Generar CSV y compartir con expo-sharing
  const handleExportContacts = async () => {
    if (isExportingContacts) return;

    if (!contacts || contacts.length === 0) {
      Alert.alert(
        'Sin contactos',
        'No tienes contactos registrados en tu red para exportar.'
      );
      return;
    }

    setIsExportingContacts(true);
    try {
      const headers = [
        'Nombre',
        'Teléfono',
        'Empresa',
        'Categoría',
        'Etiquetas',
        'Notas',
        'Fecha de Registro',
      ];

      const rows = contacts.map(c => {
        const companyName = c.company || (c.empresaActual ? companies.find(comp => comp.id === c.empresaActual)?.name : '') || '';
        const tags = Array.isArray(c.tags) ? c.tags.join('; ') : '';
        return [
          escapeCsv(c.name),
          escapeCsv(c.phone || ''),
          escapeCsv(companyName),
          escapeCsv(c.categoria || ''),
          escapeCsv(tags),
          escapeCsv(c.notes || ''),
          escapeCsv(c.dateAdded || ''),
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.map(h => escapeCsv(h)).join(','), ...rows].join('\n');
      const file = new File(Paths.cache, 'contactos_networking.csv');
      if (file.exists) {
        file.delete();
      }
      file.create();
      file.write(csvContent);

      if (!file.exists) {
        throw new Error('No se pudo generar el archivo de contactos.');
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          'Compartir no disponible',
          'La función para compartir archivos no está disponible en este dispositivo.'
        );
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar Contactos',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error: any) {
      console.error('Error al exportar contactos:', error);
      Alert.alert(
        'Error',
        error?.message || 'Ocurrió un error al exportar los contactos.'
      );
    } finally {
      setIsExportingContacts(false);
    }
  };

  // 3. Importar / Sincronizar empresas desde los contactos
  const handleSyncCompanies = async () => {
    if (isSyncingCompanies) return;

    if (!contacts || contacts.length === 0) {
      Alert.alert(
        'Sin contactos',
        'No tienes contactos registrados para identificar empresas.'
      );
      return;
    }

    setIsSyncingCompanies(true);
    try {
      const result = await syncCompanies(contacts);
      const allCompanies = result.updatedCompanies || companies;

      // Vincular empresaActual en los contactos si corresponde
      for (const contact of contacts) {
        if (!contact.empresaActual && contact.company && contact.company.trim()) {
          const matchedCompany = allCompanies.find(
            c => c.name.toLowerCase() === contact.company?.trim().toLowerCase()
          );
          if (matchedCompany) {
            await updateContact(contact.id, { empresaActual: matchedCompany.id });
          }
        }
      }

      Alert.alert(
        'Sincronización Completada',
        `Se han identificado y procesado tus empresas (${result.created} ${result.created === 1 ? 'empresa nueva creada' : 'empresas nuevas creadas'}).`
      );
    } catch (error: any) {
      console.error('Error al sincronizar empresas:', error);
      Alert.alert('Error', 'No se pudo completar la sincronización de empresas.');
    } finally {
      setIsSyncingCompanies(false);
    }
  };

  // 4. Exportar empresas: Generar CSV y compartir con expo-sharing
  const handleExportCompanies = async () => {
    if (isExportingCompanies) return;

    if (!companies || companies.length === 0) {
      Alert.alert(
        'Sin empresas',
        'No tienes empresas registradas en tu red para exportar.'
      );
      return;
    }

    setIsExportingCompanies(true);
    try {
      const headers = [
        'Nombre Empresa',
        'Sector',
        'Notas',
        'Cantidad Contactos',
      ];

      const rows = companies.map(comp => {
        const associatedCount = contacts.filter(
          c => c.empresaActual === comp.id ||
               c.empresasAnteriores?.includes(comp.id) ||
               (!c.empresaActual && c.company && c.company.toLowerCase() === comp.name.toLowerCase())
        ).length;

        return [
          escapeCsv(comp.name),
          escapeCsv(comp.sector || ''),
          escapeCsv(comp.notes || ''),
          escapeCsv(associatedCount.toString()),
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.map(h => escapeCsv(h)).join(','), ...rows].join('\n');
      const file = new File(Paths.cache, 'empresas_networking.csv');
      if (file.exists) {
        file.delete();
      }
      file.create();
      file.write(csvContent);

      if (!file.exists) {
        throw new Error('No se pudo generar el archivo de empresas.');
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          'Compartir no disponible',
          'La función para compartir archivos no está disponible en este dispositivo.'
        );
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar Empresas',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error: any) {
      console.error('Error al exportar empresas:', error);
      Alert.alert(
        'Error',
        error?.message || 'Ocurrió un error al exportar las empresas.'
      );
    } finally {
      setIsExportingCompanies(false);
    }
  };

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
            onPress={handleImportContacts}
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
          <TouchableOpacity
            style={styles.itemRow}
            activeOpacity={0.7}
            onPress={handleExportContacts}
            disabled={isExportingContacts}
          >
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
            {isExportingContacts ? (
              <ActivityIndicator size="small" color={primaryColor} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={secondaryText} />
            )}
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
            onPress={handleSyncCompanies}
            disabled={isSyncingCompanies}
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
            {isSyncingCompanies ? (
              <ActivityIndicator size="small" color={accent1} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={secondaryText} />
            )}
          </TouchableOpacity>

          {/* Opción: Exportar empresas */}
          <TouchableOpacity
            style={styles.itemRow}
            activeOpacity={0.7}
            onPress={handleExportCompanies}
            disabled={isExportingCompanies}
          >
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
            {isExportingCompanies ? (
              <ActivityIndicator size="small" color={accent1} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={secondaryText} />
            )}
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
    ...shadowStyle(1, 0.04, 4),
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
