import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useThemeColor } from '../hooks/use-theme-color';

export interface StatsDonutChartProps {
  companyPercentage: number;
  favoritesPercentage: number;
  remindersPercentage: number;
  companyColor?: string;
  favoritesColor?: string;
  remindersColor?: string;
}

export const StatsDonutChart: React.FC<StatsDonutChartProps> = React.memo(({
  companyPercentage,
  favoritesPercentage,
  remindersPercentage,
  companyColor = '#4F185A',
  favoritesColor = '#E23369',
  remindersColor = '#FF8F3B',
}) => {
  const primaryColor = useThemeColor({}, 'primary');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const cardColor = useThemeColor({}, 'card');

  // Clamp percentages between 0 and 100
  const compPct = Math.min(100, Math.max(0, companyPercentage));
  const favPct = Math.min(100, Math.max(0, favoritesPercentage));
  const remPct = Math.min(100, Math.max(0, remindersPercentage));

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        {/* Concentric Progress Rings Visualizing Network Health */}
        <View style={[styles.outerRing, { borderColor: companyColor + '25' }]}>
          <View style={[styles.ringProgress, { backgroundColor: companyColor, width: `${compPct}%` }]} />
          
          <View style={[styles.middleRing, { borderColor: favoritesColor + '25' }]}>
            <View style={[styles.ringProgress, { backgroundColor: favoritesColor, width: `${favPct}%` }]} />
            
            <View style={[styles.innerRing, { borderColor: remindersColor + '25', backgroundColor: cardColor }]}>
              <View style={[styles.ringProgress, { backgroundColor: remindersColor, width: `${remPct}%` }]} />
              <Text style={[styles.centerText, { color: primaryColor }]}>{compPct}%</Text>
              <Text style={[styles.centerSubtext, { color: secondaryText }]}>Red</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Segment Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: companyColor }]} />
          <Text style={[styles.legendText, { color: secondaryText }]}>Empresas ({compPct}%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: favoritesColor }]} />
          <Text style={[styles.legendText, { color: secondaryText }]}>Favoritos ({favPct}%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: remindersColor }]} />
          <Text style={[styles.legendText, { color: secondaryText }]}>Seguimiento ({remPct}%)</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chartWrapper: {
    width: 104,
    height: 104,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  middleRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  innerRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 0.85,
  },
  centerText: {
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 15,
  },
  centerSubtext: {
    fontSize: 9,
    fontWeight: '600',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
