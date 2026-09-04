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
const TAB_ROUTES = [HOME_ROUTE, '/contactos', '/favoritos', '/empresas', '/perfil'];

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
  if (path.startsWith('/favoritos') || path.startsWith('/(tabs)/favoritos')) return 2;
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
    router.push('/agregar');
  }, [router]);

  const handleFABAddCompany = useCallback(() => {
    router.push('/empresa/agregar');
  }, [router]);

  const handleFABAddReminder = useCallback(() => {
    setIsReminderModalVisible(true);
  }, []);

  const handleSaveReminder = useCallback(async (data: { fecha: string; nota: string; contactIds: string[] }) => {
    for (const contactId of data.contactIds) {
      await addReminder({
        contactoId: contactId,
        fecha: data.fecha,
        nota: data.nota,
      });
    }
  }, [addReminder]);

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

  // Gesto horizontal para navegar entre las pestañas
  const panGesture = useMemo(() => {
    // Delimitar el área activa del gesto excluyendo completamente la zona física del Tab Bar inferior
    const bottomCutoff = -(55 + (insets.bottom || 0));

    return Gesture.Pan()
      .enabled(isMainScreen)
      .hitSlop({ bottom: bottomCutoff })
      .activeOffsetX([-35, 35])
      .failOffsetY([-15, 15])
      .cancelsTouchesInView(false)
      .onEnd((e) => {
        'worklet';
        const { translationX, velocityX } = e;
        const isFastSwipe = Math.abs(velocityX) > 300;
        const isLongSwipe = Math.abs(translationX) > 60;

        if (isFastSwipe || isLongSwipe) {
          if (translationX < -35 && velocityX < -100) {
            runOnJS(handleTabSwipe)('left');
          } else if (translationX > 35 && velocityX > 100) {
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
              name="agregar"
              options={{
                href: null,
              }}
            />
            <Tabs.Screen
              name="favoritos"
              options={{
                title: 'Favoritos',
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
          </Tabs>
        </View>
      </GestureDetector>

      {/* Instancia Única Global del Smart FAB en Pantallas Principales */}
      {isMainScreen && (
        <SmartFAB
          onAddContact={handleFABAddContact}
          onAddCompany={handleFABAddCompany}
          onAddReminder={handleFABAddReminder}
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

