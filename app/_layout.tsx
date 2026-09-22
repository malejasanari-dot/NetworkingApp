import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/hooks/useNotifications';
import { ContactsProvider } from '@/context/ContactsContext';
import { CompaniesProvider } from '@/context/CompaniesContext';
import { RemindersProvider } from '@/context/RemindersContext';
import { NotesProvider } from '@/context/NotesContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { requestPermission } = useNotifications();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  // Solicitar permisos de notificaciones una vez que el usuario está autenticado
  useEffect(() => {
    if (!loading && user) {
      requestPermission();
    }
  }, [loading, user, requestPermission]);

  const activeThemeKey = colorScheme === 'dark' ? 'dark' : 'light';
  const themeColors = Colors[activeThemeKey];

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerTintColor: themeColors.primary,
          headerTitleStyle: {
            fontWeight: 'bold',
            color: themeColors.primary,
          },
          headerRight: () => <ThemeToggleButton />,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ title: 'Inicio' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="contacto/[id]" options={{ title: 'Detalle de Contacto' }} />
        <Stack.Screen name="contacto/editar/[id]" options={{ title: 'Editar Contacto' }} />
        <Stack.Screen name="contacto/importar" options={{ title: 'Importar Contactos' }} />
        <Stack.Screen name="empresa/agregar" options={{ title: 'Nueva Empresa' }} />
        <Stack.Screen name="empresa/editar/[id]" options={{ title: 'Editar Empresa' }} />
        <Stack.Screen name="empresa/[id]" options={{ title: 'Empresa' }} />
        <Stack.Screen name="perfil/editar" options={{ title: 'Editar Perfil' }} />
        <Stack.Screen name="perfil/notificaciones" options={{ title: 'Notificaciones' }} />
        <Stack.Screen name="perfil/sincronizacion" options={{ title: 'Sincronización' }} />
        <Stack.Screen name="perfil/privacidad" options={{ title: 'Privacidad y Seguridad' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <RemindersProvider>
              <CompaniesProvider>
                <ContactsProvider>
                  <NotesProvider>
                    <RootLayoutContent />
                  </NotesProvider>
                </ContactsProvider>
              </CompaniesProvider>
            </RemindersProvider>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

