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

interface ContactCardProps {
  contact: Contact;
  onPress?: () => void;
  onToggleFavorite?: () => void;
}

export const ContactCard: React.FC<ContactCardProps> = React.memo(({ contact, onPress, onToggleFavorite }) => {
  const { getRemindersForContact } = useReminders();
  const cardColor = useThemeColor({}, 'card');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');

  const contactReminders = getRemindersForContact(contact.id);
  const hasReminders = contactReminders.length > 0;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      // Trigger pop animation
      scale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withSpring(1, { damping: 10, stiffness: 100 })
      );
      onToggleFavorite();
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: cardColor, borderColor }]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.avatarContainer, { backgroundColor: primaryColor }]}>
          <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>{contact.name.charAt(0)}</Text>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={[styles.nameText, { color: primaryColor }]}>{contact.name}</Text>
            {hasReminders && (
              <Ionicons name="notifications" size={14} color={accent1} style={{ marginLeft: 6 }} />
            )}
          </View>
          <Text style={[styles.companyText, { color: secondaryText }]}>{contact.company}</Text>
        </View>
        
        <TouchableOpacity 
          onPress={handleToggleFavorite}
          style={styles.favoriteButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Animated.View style={animatedStyle}>
            <Ionicons 
              name={contact.favorito ? "star" : "star-outline"} 
              size={24} 
              color={contact.favorito ? accent2 : secondaryText} 
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.tagsContainer}>
        {contact.tags.map((tag, index) => (
          <View key={index} style={[styles.tagBadge, { backgroundColor: '#FDF361' }]}>
            <Text style={[styles.tagText, { color: '#333333' }]}>{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
});



const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  companyText: {
    fontSize: 14,
  },
  favoriteButton: {
    padding: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
