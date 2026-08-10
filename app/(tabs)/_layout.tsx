import { Tabs, useRouter, usePathname } from 'expo-router';
import React, { useState, useCallback, useMemo } from 'react';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useThemeColor } from '../../hooks/use-theme-color';
import { SmartFAB } from '../../components/SmartFAB';
import { ReminderModal } from '../../components/ReminderModal';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';
import { HapticTab } from '../../components/haptic-tab';
import { useReminders } from '../../context/RemindersContext';
import { useContacts } from '../../context/ContactsContext';

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
  const { addReminder } = useReminders();
  const { contacts } = useContacts();
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);

  const activeColor = useThemeColor({}, 'tabIconSelected');
  const inactiveColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
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

  const handleSaveReminder = useCallback(async (data: { fecha: string; nota: string }) => {
    const defaultContactId = contacts.length > 0 ? contacts[0].id : '';
    await addReminder({
      contactoId: defaultContactId,
      fecha: data.fecha,
      nota: data.nota,
    });
  }, [contacts, addReminder]);

  const handleTabSwipe = useCallback((direction: 'left' | 'right') => {
    const currentIndex = getCurrentTabIndex(pathname);
    if (currentIndex === -1) return;

    if (direction === 'left' && currentIndex < TAB_ROUTES.length - 1) {
      const nextRoute = TAB_ROUTES[currentIndex + 1];
      router.replace(nextRoute as any);
    } else if (direction === 'right' && currentIndex > 0) {
      const prevRoute = TAB_ROUTES[currentIndex - 1];
      router.replace(prevRoute as any);
    }
  }, [pathname, router]);

  // Gesto nativo de referencia para declarar coexistencia explícita con RefreshControl y FlatList scroll
  const nativeGesture = useMemo(() => Gesture.Native(), []);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(isMainScreen)
      .activeOffsetX([-35, 35])
      .failOffsetY([-15, 15])
      .simultaneousWithExternalGesture(nativeGesture)
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
  }, [isMainScreen, handleTabSwipe, nativeGesture]);

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={panGesture}>
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              tabBarButton: HapticTab,
              tabBarActiveTintColor: activeColor,
              tabBarInactiveTintColor: inactiveColor,
              headerShown: true,
              headerRight: () => <ThemeToggleButton />,
              headerStyle: {
                backgroundColor: backgroundColor,
              },
              headerTitleStyle: {
                fontWeight: 'bold',
                color: textColor,
              },
              tabBarStyle: Platform.select({
                default: {
                  backgroundColor: backgroundColor,
                  borderTopWidth: 1,
                  borderTopColor: borderColor,
                },
              }),
            }}>
            <Tabs.Screen
              name="index"
              options={{
                title: 'Inicio',
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="contactos"
              options={{
                title: 'Contactos',
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
                ),
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
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'star' : 'star-outline'} size={24} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="empresas"
              options={{
                title: 'Empresas',
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'business' : 'business-outline'} size={24} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="perfil"
              options={{
                title: 'Perfil',
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
                ),
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

