import React, { useState, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/use-theme-color';
import { useNotifications, PermissionStatus } from '../../hooks/useNotifications';
import { shadowStyle } from '../../utils/shadow';

export default function NotificacionesScreen() {
  const navigation = useNavigation();
  const { permissionStatus, requestPermission, isAvailable } = useNotifications();

  // Colores del sistema de temas existente
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');

  // Estados locales para los sub-interruptores (puramente visuales por ahora)
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [activitySummaryEnabled, setActivitySummaryEnabled] = useState(true);
  const [appAlertsEnabled, setAppAlertsEnabled] = useState(true);

  // El estado real del sistema determina el interruptor general
  const systemPermissionStatus: PermissionStatus = permissionStatus;
  const generalEnabled = permissionStatus === 'granted';

  // Configuración del Header de navegación
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Notificaciones',
      headerStyle: { backgroundColor },
      headerTintColor: primaryColor,
      headerTitleStyle: { color: primaryColor, fontWeight: 'bold' },
    });
  }, [navigation, backgroundColor, primaryColor]);

  // Manejador del interruptor general — conectado al permiso real del sistema
  const handleToggleGeneral = async (newValue: boolean) => {
    if (newValue) {
      // Si quiere activar: solicitar permiso si es undetermined
      if (permissionStatus === 'undetermined') {
        await requestPermission();
      } else if (permissionStatus === 'denied') {
        // Si fue denegado previamente, guiar al usuario a Configuración
        Linking.openSettings();
      }
    } else {
      // Si quiere desactivar: guiar al usuario a Configuración del sistema
      Linking.openSettings();
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Encabezado Introductorio */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerIconBadge, { backgroundColor: primaryColor + '15' }]}>
          <Ionicons name="notifications-outline" size={28} color={primaryColor} />
        </View>
        <Text style={[styles.headerTitle, { color: primaryColor }]}>Notificaciones</Text>
        <Text style={[styles.headerDescription, { color: secondaryText }]}>
          Administra cómo y cuándo deseas recibir alertas, recordatorios y avisos de NetworkingApp.
        </Text>
      </View>

      {/* Aviso: Expo Go no soporta notificaciones nativas */}
      {!isAvailable && (
        <View style={[styles.card, { backgroundColor: cardColor, borderColor, marginBottom: 16 }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <View style={[styles.iconBadge, { backgroundColor: accent2 + '15' }]}>
                <Ionicons name="information-circle-outline" size={20} color={accent2} />
              </View>
              <View style={styles.switchTextContainer}>
                <Text style={[styles.switchTitle, { color: textColor }]}>
                  Notificaciones no disponibles
                </Text>
                <Text style={[styles.switchSubtitle, { color: secondaryText }]}>
                  Las notificaciones push requieren una versión instalada de la aplicación (Development Build o APK). En Expo Go esta funcionalidad no está disponible.
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 2. Interruptor General */}
      <View style={[styles.card, { backgroundColor: cardColor, borderColor }, !isAvailable && styles.disabledCard]}>
        <View style={styles.switchRow}>
          <View style={styles.switchLeft}>
            <View style={[styles.iconBadge, { backgroundColor: primaryColor + '12' }]}>
              <Ionicons
                name={generalEnabled ? 'notifications' : 'notifications-off-outline'}
                size={20}
                color={primaryColor}
              />
            </View>
            <View style={styles.switchTextContainer}>
              <Text style={[styles.switchTitle, { color: textColor }]}>
                Notificaciones de la aplicación
              </Text>
              <Text style={[styles.switchSubtitle, { color: secondaryText }]}>
                {generalEnabled
                  ? 'Las notificaciones están activadas'
                  : 'Todas las notificaciones están desactivadas'}
              </Text>
            </View>
          </View>
          <Switch
            value={generalEnabled}
            onValueChange={handleToggleGeneral}
            disabled={!isAvailable}
            trackColor={{ false: borderColor, true: primaryColor }}
            thumbColor={
              Platform.OS === 'android'
                ? generalEnabled
                  ? '#FFFFFF'
                  : '#F4F3F4'
                : undefined
            }
            ios_backgroundColor={borderColor}
          />
        </View>

        {/* Indicador de estado del sistema */}
        <View style={[styles.statusBadgeRow, { borderTopColor: borderColor + '60' }]}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  generalEnabled && systemPermissionStatus === 'granted'
                    ? '#10B981'
                    : systemPermissionStatus === 'denied'
                    ? accent2
                    : secondaryText + '80',
              },
            ]}
          />
          <Text style={[styles.statusBadgeText, { color: secondaryText }]}>
            {systemPermissionStatus === 'checking'
              ? 'Verificando estado del sistema...'
              : systemPermissionStatus === 'granted' && generalEnabled
              ? 'Permisos del sistema concedidos'
              : systemPermissionStatus === 'denied'
              ? 'Permisos bloqueados en el sistema operativo'
              : 'Notificaciones inactivas'}
          </Text>
        </View>
      </View>

      {/* 3. Sección "Tipos de notificación" */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: primaryColor }]}>
          Tipos de notificación
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: cardColor, borderColor },
            !generalEnabled && styles.disabledCard,
          ]}
        >
          {/* Opción A: Recordatorios de contactos */}
          <View style={[styles.itemRow, { borderBottomColor: borderColor }]}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBadge, { backgroundColor: primaryColor + '12' }]}>
                <Ionicons name="alarm-outline" size={20} color={primaryColor} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text
                  style={[
                    styles.itemTitle,
                    { color: generalEnabled ? textColor : secondaryText },
                  ]}
                >
                  Recordatorios de contactos
                </Text>
                <Text style={[styles.itemDescription, { color: secondaryText }]}>
                  Recibe avisos cuando llegue la fecha de tus recordatorios.
                </Text>
              </View>
            </View>
            <Switch
              value={remindersEnabled && generalEnabled}
              onValueChange={setRemindersEnabled}
              disabled={!generalEnabled}
              trackColor={{ false: borderColor, true: primaryColor }}
              thumbColor={
                Platform.OS === 'android'
                  ? remindersEnabled && generalEnabled
                    ? '#FFFFFF'
                    : '#F4F3F4'
                  : undefined
              }
              ios_backgroundColor={borderColor}
            />
          </View>

          {/* Opción B: Resumen de actividad */}
          <View style={[styles.itemRow, { borderBottomColor: borderColor }]}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBadge, { backgroundColor: accent1 + '15' }]}>
                <Ionicons name="stats-chart-outline" size={20} color={accent1} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text
                  style={[
                    styles.itemTitle,
                    { color: generalEnabled ? textColor : secondaryText },
                  ]}
                >
                  Resumen de actividad
                </Text>
                <Text style={[styles.itemDescription, { color: secondaryText }]}>
                  Recibe un resumen periódico de la actividad de tu red.
                </Text>
              </View>
            </View>
            <Switch
              value={activitySummaryEnabled && generalEnabled}
              onValueChange={setActivitySummaryEnabled}
              disabled={!generalEnabled}
              trackColor={{ false: borderColor, true: accent1 }}
              thumbColor={
                Platform.OS === 'android'
                  ? activitySummaryEnabled && generalEnabled
                    ? '#FFFFFF'
                    : '#F4F3F4'
                  : undefined
              }
              ios_backgroundColor={borderColor}
            />
          </View>

          {/* Opción C: Avisos de la aplicación */}
          <View style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <View style={[styles.iconBadge, { backgroundColor: accent2 + '15' }]}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={accent2}
                />
              </View>
              <View style={styles.itemTextContainer}>
                <Text
                  style={[
                    styles.itemTitle,
                    { color: generalEnabled ? textColor : secondaryText },
                  ]}
                >
                  Notificaciones de la aplicación
                </Text>
                <Text style={[styles.itemDescription, { color: secondaryText }]}>
                  Recibe avisos importantes relacionados con NetworkingApp.
                </Text>
              </View>
            </View>
            <Switch
              value={appAlertsEnabled && generalEnabled}
              onValueChange={setAppAlertsEnabled}
              disabled={!generalEnabled}
              trackColor={{ false: borderColor, true: accent2 }}
              thumbColor={
                Platform.OS === 'android'
                  ? appAlertsEnabled && generalEnabled
                    ? '#FFFFFF'
                    : '#F4F3F4'
                  : undefined
              }
              ios_backgroundColor={borderColor}
            />
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
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    ...shadowStyle(1, 0.04, 4),
  },
  disabledCard: {
    opacity: 0.55,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLeft: {
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
  switchTextContainer: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  switchSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
});
