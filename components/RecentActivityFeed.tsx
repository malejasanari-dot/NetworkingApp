import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../hooks/use-theme-color';
import { formatDate } from '../utils/date';

export interface ActivityItem {
  id: string;
  type: 'contact' | 'note';
  date: string;
  contactId: string;
  contactName: string;
  content?: string;
}

export interface RecentActivityFeedProps {
  activities: ActivityItem[];
  onPressItem?: (item: ActivityItem) => void;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = React.memo(({
  activities,
  onPressItem,
}) => {
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const borderColor = useThemeColor({}, 'border');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');

  if (!activities || activities.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: cardColor, borderColor }]}>
        <Ionicons name="time-outline" size={28} color={secondaryText} style={{ marginBottom: 6 }} />
        <Text style={{ color: secondaryText, textAlign: 'center', fontSize: 13 }}>
          Sin actividad reciente registrada.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {activities.map((item) => {
        const isNote = item.type === 'note';
        const iconName = isNote ? "create-outline" : "person-add-outline";
        const iconBg = isNote ? accent2 + '15' : primaryColor + '15';
        const iconColor = isNote ? accent2 : primaryColor;

        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.activityItem, { backgroundColor: cardColor, borderColor }]}
            onPress={() => onPressItem && onPressItem(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name={iconName} size={18} color={iconColor} />
            </View>

            <View style={styles.contentContainer}>
              <View style={styles.topRow}>
                <Text style={[styles.titleText, { color: primaryColor }]} numberOfLines={1}>
                  {item.contactName}
                </Text>
                <Text style={[styles.dateText, { color: accent1 }]}>
                  {formatDate(item.date)}
                </Text>
              </View>

              <Text style={[styles.subtitleText, { color: textColor }]} numberOfLines={1}>
                {isNote ? `Nota: "${item.content || 'Sin texto'}"` : 'Nuevo contacto agregado a la red'}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleText: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtitleText: {
    fontSize: 12,
  },
  emptyCard: {
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
