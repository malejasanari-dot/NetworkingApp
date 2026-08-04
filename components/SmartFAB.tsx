import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TouchableWithoutFeedback, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useThemeColor } from '../hooks/use-theme-color';

export interface SmartFABProps {
  onAddContact: () => void;
  onAddCompany: () => void;
  onAddReminder: () => void;
  primaryColor?: string;
}

export const SmartFAB: React.FC<SmartFABProps> = React.memo(({
  onAddContact,
  onAddCompany,
  onAddReminder,
  primaryColor = '#4F185A',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const toggleMenu = () => {
    setIsOpen(prev => !prev);
  };

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      {isOpen && (
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      )}

      <View style={styles.container} pointerEvents="box-none">
        {isOpen && (
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: cardColor, borderColor }]}
              onPress={() => handleAction(onAddContact)}
              activeOpacity={0.8}
            >
              <Text style={[styles.menuLabel, { color: textColor }]}>Nuevo Contacto</Text>
              <View style={[styles.iconCircle, { backgroundColor: primaryColor + '15' }]}>
                <Ionicons name="person-add-outline" size={20} color={primaryColor} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: cardColor, borderColor }]}
              onPress={() => handleAction(onAddCompany)}
              activeOpacity={0.8}
            >
              <Text style={[styles.menuLabel, { color: textColor }]}>Nueva Empresa</Text>
              <View style={[styles.iconCircle, { backgroundColor: accent1 + '15' }]}>
                <Ionicons name="business-outline" size={20} color={accent1} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: cardColor, borderColor }]}
              onPress={() => handleAction(onAddReminder)}
              activeOpacity={0.8}
            >
              <Text style={[styles.menuLabel, { color: textColor }]}>Nuevo Recordatorio</Text>
              <View style={[styles.iconCircle, { backgroundColor: accent2 + '15' }]}>
                <Ionicons name="notifications-outline" size={20} color={accent2} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: primaryColor }]}
          onPress={toggleMenu}
          activeOpacity={0.85}
        >
          <Ionicons 
            name={isOpen ? "close" : "add"} 
            size={28} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 998,
  },
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 84 : 72,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 999,
  },
  menuContainer: {
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
