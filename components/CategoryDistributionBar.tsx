import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Contact } from '../constants/MockData';
import { CONTACT_CATEGORIES, CATEGORY_COLORS, CATEGORY_COLORS_DARK } from '../constants/categories';
import { useThemeColor } from '../hooks/use-theme-color';
import { useColorScheme } from '../hooks/use-color-scheme';

interface CategoryDistributionBarProps {
  contacts: Contact[];
}

export const CategoryDistributionBar: React.FC<CategoryDistributionBarProps> = React.memo(({ contacts }) => {
  const scheme = useColorScheme() ?? 'light';
  const secondaryText = useThemeColor({}, 'secondaryText');
  const borderColor = useThemeColor({}, 'border');

  const colors = scheme === 'dark' ? CATEGORY_COLORS_DARK : CATEGORY_COLORS;

  const stats = useMemo(() => {
    const total = contacts.length;
    const counts: Record<string, number> = {
      Conocidos: 0,
      Referidos: 0,
      Gestionados: 0,
    };

    contacts.forEach(c => {
      if (c.categoria && counts[c.categoria] !== undefined) {
        counts[c.categoria]++;
      }
    });

    return CONTACT_CATEGORIES.map(cat => ({
      name: cat,
      count: counts[cat],
      percentage: total > 0 ? Math.round((counts[cat] / total) * 100) : 0,
      color: colors[cat],
    }));
  }, [contacts, colors]);

  const total = contacts.length;
  const classifiedTotal = stats.reduce((sum, s) => sum + s.count, 0);

  if (total === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: secondaryText }]}>
          Sin contactos todavía
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra segmentada */}
      <View style={[styles.barContainer, { backgroundColor: borderColor + '60' }]}>
        {classifiedTotal > 0 ? (
          stats.map((stat, index) => {
            if (stat.count === 0) return null;
            const widthPercent = (stat.count / total) * 100;
            return (
              <View
                key={stat.name}
                style={[
                  styles.barSegment,
                  {
                    width: `${widthPercent}%`,
                    backgroundColor: stat.color,
                    borderTopLeftRadius: index === 0 || stats.slice(0, index).every(s => s.count === 0) ? 6 : 0,
                    borderBottomLeftRadius: index === 0 || stats.slice(0, index).every(s => s.count === 0) ? 6 : 0,
                    borderTopRightRadius: index === stats.length - 1 || stats.slice(index + 1).every(s => s.count === 0) ? 6 : 0,
                    borderBottomRightRadius: index === stats.length - 1 || stats.slice(index + 1).every(s => s.count === 0) ? 6 : 0,
                  },
                ]}
              />
            );
          })
        ) : null}
      </View>

      {/* Leyenda */}
      <View style={styles.legendContainer}>
        {stats.map(stat => (
          <View key={stat.name} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: stat.color }]} />
            <Text style={[styles.legendName, { color: secondaryText }]}>{stat.name}</Text>
            <Text style={[styles.legendValue, { color: secondaryText }]}>
              {stat.count}  ·  {stat.percentage}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  barContainer: {
    height: 14,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  legendContainer: {
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 90,
  },
  legendValue: {
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
