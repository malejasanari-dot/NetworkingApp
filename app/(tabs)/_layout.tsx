import * as Haptics from 'expo-haptics';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomTabBar } from '../../components/CustomTabBar';
import { ReminderModal } from '../../components/ReminderModal';
import { SmartFAB } from '../../components/SmartFAB';
import { useContacts } from '../../context/ContactsContext';
import { useReminders } from '../../context/RemindersContext';
import { useThemeColor } from '../../hooks/use-theme-color';

const HOME_ROUTE = '/(tabs)';
const TAB_ROUTES = [HOME_ROUTE, '/contactos', '/directorio', '/empresas', '/perfil'];

const isHomePath = (path: string): boolean => {
  return (
    path === '/' ||
    path === '/index' ||
    path === '/(tabs)' ||
    path === '/(tabs)/' ||
    path === '/(tabs)/index'
  );
};

const getCurrentTabIndex = (path: string): number => {
  if (isHomePath(path)) return 0;
  if (path.startsWith('/contactos') || path.startsWith('/(tabs)/contactos')) return 1;
  if (path.startsWith('/directorio') || path.startsWith('/(tabs)/directorio')) return 2;
  if (path.startsWith('/empresas') || path.startsWith('/(tabs)/empresas')) return 3;
  if (path.startsWith('/perfil') || path.startsWith('/(tabs)/perfil')) return 4;
  return -1;
};

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { addReminder } = useReminders();
  const { contacts } = useContacts();
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);

  const primaryColor = useThemeColor({}, 'primary');

  const isMainScreen = getCurrentTabIndex(pathname) !== -1;

  const handleFABAddContact = useCallback(() => {
    router.push({
      pathname: '/agregar',
      params: { from: pathname },
    });
  }, [router, pathname]);

  const handleFABAddCompany = useCallback(() => {
    router.push('/empresa/agregar');
  }, [router]);

  const handleFABAddReminder = useCallback(() => {
    setIsReminderModalVisible(true);
  }, []);

  const handleFABSyncContacts = useCallback(() => {
    router.push('/contacto/importar');
  }, [router]);

  const handleSaveReminder = useCallback(async (data: { fecha: string; nota: string; contactIds: string[] }) => {
    for (const contactId of data.contactIds) {
      const contactObj = (contacts || []).find(c => c && c.id === contactId);
      await addReminder({
        contactoId: contactId,
        fecha: data.fecha,
        nota: data.nota,
        completado: false,
      }, contactObj?.name);
    }
  }, [addReminder, contacts]);

  const handleTabSwipe = useCallback((direction: 'left' | 'right') => {
    const currentIndex = getCurrentTabIndex(pathname);
    if (currentIndex === -1) return;

    if (direction === 'left' && currentIndex < TAB_ROUTES.length - 1) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const nextRoute = TAB_ROUTES[currentIndex + 1];
      router.replace(nextRoute as any);
    } else if (direction === 'right' && currentIndex > 0) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const prevRoute = TAB_ROUTES[currentIndex - 1];
      router.replace(prevRoute as any);
    }
  }, [pathname, router]);

  // Gesto horizontal para navegar entre las pestañas (exclusivo para plataformas móviles con validación de dominancia horizontal)
  const panGesture = useMemo(() => {
    // En Web se desactiva totalmente para permitir selección de texto con ratón y evitar conflictos con trackpad
    const isGestureEnabled = Platform.OS !== 'web' && isMainScreen;
    // Delimitar el área activa del gesto excluyendo completamente la zona física del Tab Bar inferior
    const bottomCutoff = -(55 + (insets.bottom || 0));

    return Gesture.Pan()
      .enabled(isGestureEnabled)
      .hitSlop({ bottom: bottomCutoff })
      .activeOffsetX([-45, 45])
      .failOffsetY([-25, 25])
      .cancelsTouchesInView(false)
      .onEnd((e) => {
        'worklet';
        const { translationX, translationY, velocityX, velocityY } = e;
        // Exigir dominancia horizontal clara para evitar disparos accidentales durante scroll vertical
        const isHorizontalDominant =
          Math.abs(translationX) > Math.abs(translationY) * 1.5 &&
          Math.abs(velocityX) > Math.abs(velocityY);
        const isSignificantHorizontal = Math.abs(translationX) > 60;
        const isNotVerticalScroll = Math.abs(translationY) < 40;

        if (isHorizontalDominant && isSignificantHorizontal && isNotVerticalScroll) {
          if (translationX < -60 && velocityX < -150) {
            runOnJS(handleTabSwipe)('left');
          } else if (translationX > 60 && velocityX > 150) {
            runOnJS(handleTabSwipe)('right');
          }
        }
      });
  }, [isMainScreen, handleTabSwipe, insets.bottom]);

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={panGesture}>
        <View style={{ flex: 1 }}>
          <Tabs
            tabBar={() => (isMainScreen ? <CustomTabBar /> : null)}
            screenOptions={{
              headerShown: false,
            }}>
            <Tabs.Screen
              name="index"
              options={{
                title: 'Inicio',
              }}
            />
            <Tabs.Screen
              name="contactos"
              options={{
                title: 'Contactos',
              }}
            />
            <Tabs.Screen
              name="directorio"
              options={{
                title: 'Directorio',
              }}
            />
            <Tabs.Screen
              name="empresas"
              options={{
                title: 'Empresas',
              }}
            />
            <Tabs.Screen
              name="perfil"
              options={{
                title: 'Perfil',
              }}
            />
            <Tabs.Screen
              name="favoritos"
              options={{
                href: null,
                title: 'Favoritos',
              }}
            />
            <Tabs.Screen
              name="agregar"
              options={{
                href: null,
              }}
            />
          </Tabs>
        </View>
      </GestureDetector>

      {/* Instancia Única Global del Smart FAB en Pantallas Principales */}
      {isMainScreen && (
        <SmartFAB
          onAddContact={handleFABAddContact}
          onAddCompany={handleFABAddCompany}
          onAddReminder={handleFABAddReminder}
          onSyncContacts={handleFABSyncContacts}
          primaryColor={primaryColor}
        />
      )}

      {/* Modal de Recordatorios Global */}
      <ReminderModal
        isVisible={isReminderModalVisible}
        onClose={() => setIsReminderModalVisible(false)}
        onSave={handleSaveReminder}
      />
    </View>
  );
}

