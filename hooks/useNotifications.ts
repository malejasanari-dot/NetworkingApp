import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';

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
}

// ---------------------------------------------------------------------------
// Configuración del handler de notificaciones en foreground.
// Se ejecuta una sola vez al importar el módulo, antes de cualquier render.
// Esto asegura que si llega una notificación con la app abierta, se muestre.
// ---------------------------------------------------------------------------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ---------------------------------------------------------------------------
// Hook centralizado
// ---------------------------------------------------------------------------
export function useNotifications(): UseNotificationsReturn {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking');
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Consultar el estado actual del permiso
  const refreshStatus = useCallback(async () => {
    // En web no aplican notificaciones push nativas
    if (Platform.OS === 'web') {
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
  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    if (Platform.OS === 'web') {
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

  // Consultar permisos al montar el hook
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

  return { permissionStatus, requestPermission, refreshStatus };
}
