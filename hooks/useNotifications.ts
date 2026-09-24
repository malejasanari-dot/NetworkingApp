import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'checking';

export interface UseNotificationsReturn {
  /** Estado actual del permiso de notificaciones del sistema */
  permissionStatus: PermissionStatus;
  /** Solicita permisos al usuario (solo si están 'undetermined') */
  requestPermission: () => Promise<PermissionStatus>;
  /** Re-consulta el estado actual del permiso */
  refreshStatus: () => Promise<void>;
  /** false en Expo Go y Web — true en Development Build / APK / IPA */
  isAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Detección de entorno y carga condicional de expo-notifications
// ---------------------------------------------------------------------------
// En Expo Go Android (SDK 53+), el módulo nativo de expo-notifications fue
// eliminado. Un import estático (`import * as Notifications from ...`) provoca
// un crash inmediato antes de que podamos ejecutar cualquier lógica.
//
// Estrategia:
//   1. Detectar Expo Go mediante Constants.expoVersion (non-null = Expo Go).
//   2. En entornos que NO son Expo Go ni Web, intentar require() dinámico.
//   3. Si require() falla (módulo nativo ausente), Notifications queda null.
//   4. Todas las funciones comprueban `if (!Notifications)` y retornan no-ops.
//
// Esto garantiza:
//   - Expo Go Android: app inicia sin crash, notificaciones deshabilitadas.
//   - Development Build / APK / IPA: expo-notifications funciona normalmente.
//   - Web: notificaciones nativas deshabilitadas.
// ---------------------------------------------------------------------------

const isExpoGo = Constants.expoVersion !== null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Notifications: any = null;

if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
  } catch {
    // Módulo nativo no disponible en este entorno
    Notifications = null;
  }
}

/** true cuando expo-notifications está disponible y operativo */
export const notificationsAvailable: boolean = Notifications !== null;

// ---------------------------------------------------------------------------
// Configuración del handler de notificaciones en foreground.
// Solo se ejecuta cuando el módulo está disponible (Development Build / APK).
// ---------------------------------------------------------------------------
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ---------------------------------------------------------------------------
// Hook centralizado
// ---------------------------------------------------------------------------
export function useNotifications(): UseNotificationsReturn {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>(
    Notifications ? 'checking' : 'undetermined'
  );
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Consultar el estado actual del permiso
  const refreshStatus = useCallback(async () => {
    if (!Notifications) {
      setPermissionStatus('undetermined');
      return;
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status as PermissionStatus);
    } catch {
      setPermissionStatus('undetermined');
    }
  }, []);

  // Solicitar permisos — solo si están 'undetermined'.
  // Si ya fueron concedidos o rechazados, no vuelve a solicitar.
  // Se invoca ÚNICAMENTE desde Perfil → Notificaciones (D02.32).
  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    if (!Notifications) {
      return 'undetermined';
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      // Si ya fue decidido, simplemente devolver el estado actual
      if (existingStatus === 'granted' || existingStatus === 'denied') {
        setPermissionStatus(existingStatus as PermissionStatus);
        return existingStatus as PermissionStatus;
      }

      // Solo solicita si aún no se ha decidido
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(newStatus as PermissionStatus);
      return newStatus as PermissionStatus;
    } catch {
      setPermissionStatus('undetermined');
      return 'undetermined';
    }
  }, []);

  // Consultar permisos al montar el hook (solo consulta, no solicita)
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Re-consultar cuando la app vuelve a foreground (el usuario pudo haber
  // cambiado el permiso en Configuración > Notificaciones del dispositivo)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        refreshStatus();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [refreshStatus]);

  return {
    permissionStatus,
    requestPermission,
    refreshStatus,
    isAvailable: notificationsAvailable,
  };
}

// ---------------------------------------------------------------------------
// Funciones de Programación y Cancelación de Recordatorios
// ---------------------------------------------------------------------------

export interface ScheduleReminderParams {
  reminderId: string;
  contactId?: string;
  contactName?: string;
  nota?: string;
  fecha: string | Date;
}

/**
 * Programa una notificación local para un recordatorio si la fecha es futura.
 * Retorna el ID de la notificación generada por Expo o null si no se pudo programar.
 *
 * - Development Build / APK / IPA: programa la notificación normalmente.
 * - Expo Go / Web: retorna null sin lanzar excepciones ni solicitar permisos.
 */
export async function scheduleReminderNotification(params: ScheduleReminderParams): Promise<string | null> {
  if (!Notifications) return null;

  try {
    const triggerDate = typeof params.fecha === 'string' ? new Date(params.fecha) : params.fecha;
    const now = new Date();

    // Validar fecha válida y que esté en el futuro
    if (isNaN(triggerDate.getTime()) || triggerDate.getTime() <= now.getTime()) {
      return null;
    }

    // Verificar permisos — NO solicitar automáticamente (D02.32)
    // El permiso se gestiona exclusivamente desde Perfil → Notificaciones
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const title = params.contactName ? `Recordatorio: ${params.contactName}` : 'Recordatorio de contacto';
    const body = params.nota && params.nota.trim() ? params.nota.trim() : 'Tienes un seguimiento programado para este momento.';

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          reminderId: params.reminderId,
          contactId: params.contactId,
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error al programar notificación de recordatorio:', error);
    return null;
  }
}

/**
 * Cancela una notificación local programada por su ID de notificación.
 * En Expo Go / Web: no-op sin errores.
 */
export async function cancelReminderNotification(notificationId?: string | null): Promise<void> {
  if (!Notifications || !notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error(`Error al cancelar notificación ${notificationId}:`, error);
  }
}

/**
 * Cancela cualquier notificación programada asociada a un recordatorio
 * buscando por su reminderId en los datos.
 * En Expo Go / Web: no-op sin errores.
 */
export async function cancelReminderNotificationByReminderId(reminderId: string): Promise<void> {
  if (!Notifications || !reminderId) return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data && notif.content.data.reminderId === reminderId) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (error) {
    console.error(`Error al cancelar notificaciones para recordatorio ${reminderId}:`, error);
  }
}
