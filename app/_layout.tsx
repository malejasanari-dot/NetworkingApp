import { DarkTheme, DefaultTheme, ThemeProvider as NavigationProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ContactsProvider } from '@/context/ContactsContext';
import { CompaniesProvider } from '@/context/CompaniesContext';
import { RemindersProvider } from '@/context/RemindersContext';
import { NotesProvider } from '@/context/NotesContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  
  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: Colors.dark.primary,
      background: Colors.dark.background,
      card: Colors.dark.card,
      text: Colors.dark.text,
      border: Colors.dark.border,
      notification: Colors.dark.notification,
    },
  };

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.light.primary,
      background: Colors.light.background,
      card: Colors.light.card,
      text: Colors.light.text,
      border: Colors.light.border,
      notification: Colors.light.notification,
    },
  };

  const activeThemeKey = colorScheme === 'dark' ? 'dark' : 'light';
  const themeColors = Colors[activeThemeKey];

  return (
    <NavigationProvider value={colorScheme === 'dark' ? customDarkTheme : customLightTheme}>
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
          headerBackTitle: 'Atrás',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="contacto/[id]" options={{ title: 'Detalle de Contacto' }} />
        <Stack.Screen name="contacto/editar/[id]" options={{ title: 'Editar Contacto' }} />
        <Stack.Screen name="contacto/importar" options={{ title: 'Importar Contactos' }} />
        <Stack.Screen name="empresa/agregar" options={{ title: 'Nueva Empresa' }} />
        <Stack.Screen name="empresa/editar/[id]" options={{ title: 'Editar Empresa' }} />
        <Stack.Screen name="empresa/[id]" options={{ title: 'Empresa' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavigationProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RemindersProvider>
          <CompaniesProvider>
            <ContactsProvider>
              <NotesProvider>
                <RootLayoutContent />
              </NotesProvider>
            </ContactsProvider>
          </CompaniesProvider>
        </RemindersProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

