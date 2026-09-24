import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated, TouchableOpacity, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../hooks/use-theme-color';
import { shadowStyle } from '../utils/shadow';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  data: ToastData | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = React.memo(({ data, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');

  useEffect(() => {
    if (data) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [data, translateY, opacity]);

  if (!data) return null;

  const getIconAndColor = () => {
    switch (data.type) {
      case 'success':
        return { icon: 'checkmark-circle' as const, color: '#2E7D32' };
      case 'error':
        return { icon: 'alert-circle' as const, color: '#D32F2F' };
      case 'info':
      default:
        return { icon: 'information-circle' as const, color: primaryColor };
    }
  };

  const { icon, color } = getIconAndColor();
  const topOffset = Math.max(insets.top + 8, Platform.OS === 'ios' ? 44 : 16);

  return (
    <View style={[styles.overlay, { top: topOffset, pointerEvents: 'box-none' } as any]}>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY }],
            opacity,
            backgroundColor: cardColor,
            borderColor: color,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.content}
          onPress={onDismiss}
          activeOpacity={0.8}
        >
          <Ionicons name={icon} size={22} color={color} style={styles.icon} />
          <Text style={[styles.message, { color: textColor }]} numberOfLines={2}>
            {data.message}
          </Text>
          <Ionicons name="close" size={18} color={textColor} style={styles.closeIcon} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 14,
    borderWidth: 1.5,
    ...shadowStyle(6, 0.15, 8),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeIcon: {
    marginLeft: 8,
    opacity: 0.6,
  },
});
