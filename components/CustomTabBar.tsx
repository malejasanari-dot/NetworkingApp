import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../hooks/use-theme-color';

interface TabItem {
  id: string;
  name: string;
  route: string;
  iconFocused: keyof typeof Ionicons.glyphMap;
  iconUnfocused: keyof typeof Ionicons.glyphMap;
  isMatch: (path: string) => boolean;
}

const TABS: TabItem[] = [
  {
    id: 'index',
    name: 'Inicio',
    route: '/(tabs)',
    iconFocused: 'home',
    iconUnfocused: 'home-outline',
    isMatch: (path: string) =>
      path === '/' ||
      path === '/index' ||
      path === '/(tabs)' ||
      path === '/(tabs)/' ||
      path === '/(tabs)/index',
  },
  {
    id: 'contactos',
    name: 'Contactos',
    route: '/contactos',
    iconFocused: 'people',
    iconUnfocused: 'people-outline',
    isMatch: (path: string) =>
      path.startsWith('/contactos') || path.startsWith('/(tabs)/contactos'),
  },
  {
    id: 'favoritos',
    name: 'Favoritos',
    route: '/favoritos',
    iconFocused: 'star',
    iconUnfocused: 'star-outline',
    isMatch: (path: string) =>
      path.startsWith('/favoritos') || path.startsWith('/(tabs)/favoritos'),
  },
  {
    id: 'empresas',
    name: 'Empresas',
    route: '/empresas',
    iconFocused: 'business',
    iconUnfocused: 'business-outline',
    isMatch: (path: string) =>
      path.startsWith('/empresas') || path.startsWith('/(tabs)/empresas'),
  },
  {
    id: 'perfil',
    name: 'Perfil',
    route: '/perfil',
    iconFocused: 'person',
    iconUnfocused: 'person-outline',
    isMatch: (path: string) =>
      path.startsWith('/perfil') || path.startsWith('/(tabs)/perfil'),
  },
];

interface CustomTabBarProps {
  style?: StyleProp<ViewStyle>;
}

export function CustomTabBar({ style }: CustomTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const activeColor = useThemeColor({}, 'tabIconSelected');
  const inactiveColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');

  const handleTabPress = (tab: TabItem, isFocused: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!isFocused) {
      router.replace(tab.route as any);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderTopColor: borderColor,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        style,
      ]}
    >
      {TABS.map((tab) => {
        const isFocused = tab.isMatch(pathname);
        const iconName = isFocused ? tab.iconFocused : tab.iconUnfocused;
        const color = isFocused ? activeColor : inactiveColor;

        return (
          <Pressable
            key={tab.id}
            onPress={() => handleTabPress(tab, isFocused)}
            style={({ pressed }) => [
              styles.tabButton,
              pressed && styles.tabButtonPressed,
            ]}
            android_ripple={{
              color: 'rgba(0, 0, 0, 0.06)',
              borderless: true,
              radius: 28,
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={tab.name}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <View style={styles.iconWrapper}>
              <Ionicons name={iconName} size={24} color={color} />
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color, fontWeight: isFocused ? '600' : '500' },
              ]}
              numberOfLines={1}
            >
              {tab.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
    height: Platform.select({
      ios: undefined,
      default: 58,
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  iconWrapper: {
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  tabLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
});

export default CustomTabBar;
