import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { Contact } from '../constants/MockData';
import { useReminders } from '../context/RemindersContext';
import { useThemeColor } from '../hooks/use-theme-color';
import { useColorScheme } from '../hooks/use-color-scheme';
import { CATEGORY_COLORS, CATEGORY_COLORS_DARK } from '../constants/categories';

import { useToast } from '../context/ToastContext';

interface ContactCardProps {
  contact: Contact;
  onPress?: () => void;
  onToggleFavorite?: () => void;
}

export const ContactCard: React.FC<ContactCardProps> = React.memo(({ contact, onPress, onToggleFavorite }) => {
  const { getRemindersForContact } = useReminders();
  const toast = useToast();
  const colorScheme = useColorScheme() ?? 'light';
  const cardColor = useThemeColor({}, 'card');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');

  const contactReminders = getRemindersForContact(contact.id);
  const hasReminders = contactReminders.length > 0;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      scale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withSpring(1, { damping: 10, stiffness: 100 })
      );
      if (!contact.favorito) {
        toast.success('Agregado a favoritos');
      } else {
        toast.info('Quitado de favoritos');
      }
      onToggleFavorite();
    }
  };

  const hasCompany = Boolean(contact.company && contact.company.trim());
  const tagsList = Array.isArray(contact.tags) ? contact.tags.filter(t => typeof t === 'string' && t.trim().length > 0) : [];
  const maxVisibleTags = 2;
  const visibleTags = tagsList.slice(0, maxVisibleTags);
  const extraTagsCount = tagsList.length - maxVisibleTags;
  const hasCategory = Boolean(contact.categoria);

  const categoryColorMap = colorScheme === 'dark' ? CATEGORY_COLORS_DARK : CATEGORY_COLORS;
  const categoryColor = contact.categoria ? categoryColorMap[contact.categoria] : primaryColor;

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: cardColor, borderColor }]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.mainRow}>
        {/* Avatar Compacto */}
        <View style={[styles.avatarContainer, { backgroundColor: primaryColor }]}>
          <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
        </View>

        {/* Informaciones principales */}
        <View style={styles.infoContainer}>
          {/* Nivel 1: Nombre + Recordatorio */}
          <View style={styles.nameRow}>
            <Text style={[styles.nameText, { color: primaryColor }]} numberOfLines={1}>
              {contact.name}
            </Text>
            {hasReminders && (
              <Ionicons name="notifications" size={13} color={accent1} style={styles.reminderIcon} />
            )}
          </View>

          {/* Nivel 2: Empresa (solo si existe) */}
          {hasCompany && (
            <Text style={[styles.companyText, { color: secondaryText }]} numberOfLines={1}>
              {contact.company}
            </Text>
          )}

          {/* Nivel 3: Categoría y Tags (solo si existen) */}
          {(hasCategory || tagsList.length > 0) && (
            <View style={styles.badgesRow}>
              {hasCategory && (
                <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '15', borderColor: categoryColor + '30' }]}>
                  <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                  <Text style={[styles.categoryText, { color: categoryColor }]}>
                    {contact.categoria}
                  </Text>
                </View>
              )}

              {visibleTags.map((tag, idx) => (
                <View key={idx} style={[styles.tagBadge, { backgroundColor: '#FDF361' }]}>
                  <Text style={styles.tagText} numberOfLines={1}>{tag}</Text>
                </View>
              ))}

              {extraTagsCount > 0 && (
                <View style={[styles.tagBadge, { backgroundColor: borderColor + '40' }]}>
                  <Text style={[styles.tagText, { color: secondaryText }]}>+{extraTagsCount}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Botón Favorito */}
        <TouchableOpacity 
          onPress={handleToggleFavorite}
          style={styles.favoriteButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Animated.View style={animatedStyle}>
            <Ionicons 
              name={contact.favorito ? "star" : "star-outline"} 
              size={22} 
              color={contact.favorito ? accent2 : secondaryText} 
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 15,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  reminderIcon: {
    marginLeft: 5,
  },
  companyText: {
    fontSize: 13,
    marginTop: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333333',
  },
  favoriteButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

