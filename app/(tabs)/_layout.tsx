import { Tabs, useRouter, usePathname } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/use-theme-color';
import { SmartFAB } from '../../components/SmartFAB';
import { ReminderModal } from '../../components/ReminderModal';
import { useReminders } from '../../context/RemindersContext';
import { useContacts } from '../../context/ContactsContext';

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

  const mainScreens = ['/', '/index', '/contactos', '/favoritos', '/empresas', '/perfil'];
  const isMainScreen = mainScreens.includes(pathname);

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

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,
          headerShown: true,
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
