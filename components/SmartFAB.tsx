import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';
import { useThemeColor } from '../hooks/use-theme-color';
import { shadowStyle } from '../utils/shadow';

export interface SmartFABProps {
  onAddContact: () => void;
  onAddCompany: () => void;
  onAddReminder: () => void;
  onSyncContacts: () => void;
  primaryColor?: string;
}

export const SmartFAB: React.FC<SmartFABProps> = React.memo(({
  onAddContact,
  onAddCompany,
  onAddReminder,
  onSyncContacts,
  primaryColor = '#4F185A',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');

  const { height: windowHeight } = useWindowDimensions();
  const isCompactHeight = windowHeight < 420;

  const bottomOffset = insets.bottom + (isCompactHeight ? (Platform.OS === 'ios' ? 56 : 50) : (Platform.OS === 'ios' ? 70 : 64));
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      animationProgress.value = withSpring(1, { damping: 14, stiffness: 120 });
    } else {
      animationProgress.value = withTiming(0, { duration: 180 });
    }
  }, [isOpen, animationProgress]);

  const toggleMenu = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsOpen(prev => !prev);
  };

  const handleAction = (action: () => void) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsOpen(false);
    action();
  };

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: animationProgress.value,
  }));

  const menuAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: animationProgress.value,
      transform: [
        { translateY: (1 - animationProgress.value) * 15 },
        { scale: animationProgress.value }
      ],
    };
  });

  const fabIconAnimatedStyle = useAnimatedStyle(() => {
    const rotation = animationProgress.value * 45; // 0deg -> 45deg
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  return (
    <>
      {isOpen && (
        <Pressable
          onPress={() => setIsOpen(false)}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
        </Pressable>
      )}

      <View style={[styles.container, { bottom: bottomOffset, pointerEvents: 'box-none' } as any]}>
        {isOpen && (
          <Animated.View style={[styles.menuContainer, isCompactHeight && styles.menuContainerCompact, menuAnimatedStyle]}>
            <TouchableOpacity
              style={[styles.menuItem, isCompactHeight && styles.menuItemCompact, { backgroundColor: cardColor, borderColor }]}
              onPress={() => handleAction(onAddContact)}
              activeOpacity={0.8}
            >
              <Text style={[styles.menuLabel, isCompactHeight && styles.menuLabelCompact, { color: textColor }]}>Nuevo Contacto</Text>
              <View style={[styles.iconCircle, isCompactHeight && styles.iconCircleCompact, { backgroundColor: primaryColor + '15' }]}>
                <Ionicons name="person-add-outline" size={isCompactHeight ? 17 : 20} color={primaryColor} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, isCompactHeight && styles.menuItemCompact, { backgroundColor: cardColor, borderColor }]}
              onPress={() => handleAction(onAddCompany)}
              activeOpacity={0.8}
            >
              <Text style={[styles.menuLabel, isCompactHeight && styles.menuLabelCompact, { color: textColor }]}>Nueva Empresa</Text>
              <View style={[styles.iconCircle, isCompactHeight && styles.iconCircleCompact, { backgroundColor: accent1 + '15' }]}>
                <Ionicons name="business-outline" size={isCompactHeight ? 17 : 20} color={accent1} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, isCompactHeight && styles.menuItemCompact, { backgroundColor: cardColor, borderColor }]}
              onPress={() => handleAction(onAddReminder)}
              activeOpacity={0.8}
            >
              <Text style={[styles.menuLabel, isCompactHeight && styles.menuLabelCompact, { color: textColor }]}>Nuevo Recordatorio</Text>
              <View style={[styles.iconCircle, isCompactHeight && styles.iconCircleCompact, { backgroundColor: accent2 + '15' }]}>
                <Ionicons name="notifications-outline" size={isCompactHeight ? 17 : 20} color={accent2} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, isCompactHeight && styles.menuItemCompact, { backgroundColor: cardColor, borderColor }]}
              onPress={() => handleAction(onSyncContacts)}
              activeOpacity={0.8}
            >
              <Text style={[styles.menuLabel, isCompactHeight && styles.menuLabelCompact, { color: textColor }]}>Sincronizar contactos</Text>
              <View style={[styles.iconCircle, isCompactHeight && styles.iconCircleCompact, { backgroundColor: primaryColor + '15' }]}>
                <Ionicons name="sync-outline" size={isCompactHeight ? 17 : 20} color={primaryColor} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        <TouchableOpacity
          style={[styles.fabButton, isCompactHeight && styles.fabButtonCompact, { backgroundColor: primaryColor }]}
          onPress={toggleMenu}
          activeOpacity={0.85}
        >
          <Animated.View style={fabIconAnimatedStyle}>
            <Ionicons name="add" size={isCompactHeight ? 24 : 28} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 998,
  },
  container: {
    position: 'absolute',
    right: 20,
    alignItems: 'flex-end',
    zIndex: 999,
  },
  menuContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
    gap: 6,
  },
  menuContainerCompact: {
    marginBottom: 4,
    gap: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 18,
    borderWidth: 1,
    ...shadowStyle(4, 0.12, 6),
  },
  menuItemCompact: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 15,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  menuLabelCompact: {
    fontSize: 12,
    marginRight: 6,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleCompact: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadowStyle(6, 0.25, 8),
  },
  fabButtonCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});
