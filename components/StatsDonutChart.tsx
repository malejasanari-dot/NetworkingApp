import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useThemeColor } from '../hooks/use-theme-color';

export interface StatsDonutChartProps {
  companyPercentage: number;
  favoritesPercentage: number;
  remindersPercentage?: number;
  companyColor?: string;
  favoritesColor?: string;
  remindersColor?: string;
}

export const StatsDonutChart: React.FC<StatsDonutChartProps> = React.memo(({
  companyPercentage,
  favoritesPercentage,
  remindersPercentage = 0,
  companyColor = '#4F185A',
  favoritesColor = '#E23369',
}) => {
  const primaryColor = useThemeColor({}, 'primary');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const borderColor = useThemeColor({}, 'border');

  // Clamp percentages between 0 and 100
  const compPct = Math.min(100, Math.max(0, companyPercentage));
  const favPct = Math.min(100, Math.max(0, favoritesPercentage));

  // Geometry for SVG Donut Ring
  const size = 100;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2; // 45
  const center = size / 2; // 50
  const circumference = 2 * Math.PI * radius; // ~282.74

  // Prepare active segments (only Empresas & Favoritos)
  const rawSegments = [
    { id: 'empresas', value: compPct, color: companyColor },
    { id: 'favoritos', value: favPct, color: favoritesColor },
  ];

  const activeSegments = rawSegments.filter(s => s.value > 0);
  const totalValue = activeSegments.reduce((sum, s) => sum + s.value, 0);
  const activeCount = activeSegments.length;

  let currentOffset = 0;
  const gapLength = activeCount > 1 ? 12 : 0;
  const availableCircumference = circumference - activeCount * gapLength;

  const renderedSegments = activeSegments.map(segment => {
    const proportion = totalValue > 0 ? segment.value / totalValue : 0;
    const arcLength = proportion * availableCircumference;
    const visualDash = activeCount > 1 ? Math.max(0.1, arcLength - strokeWidth) : arcLength;
    const offset = currentOffset;

    currentOffset += arcLength + gapLength;

    return {
      ...segment,
      dashLength: visualDash,
      offset,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Base Background Track Circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={borderColor}
              strokeWidth={strokeWidth}
              fill="none"
              opacity={0.5}
            />

            {/* Proportional Segments on a Single Continuous Ring */}
            {renderedSegments.map(seg => (
              <Circle
                key={seg.id}
                cx={center}
                cy={center}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap={activeCount > 1 ? 'round' : 'butt'}
                fill="none"
              />
            ))}
          </G>
        </Svg>

        {/* Center Indicator */}
        <View style={styles.centerTextWrapper} pointerEvents="none">
          <Text style={[styles.centerText, { color: primaryColor }]}>{compPct}%</Text>
          <Text style={[styles.centerSubtext, { color: secondaryText }]}>Red</Text>
        </View>
      </View>

      {/* Segment Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: companyColor }]} />
          <Text style={[styles.legendText, { color: secondaryText }]} numberOfLines={1}>Empresas ({compPct}%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: favoritesColor }]} />
          <Text style={[styles.legendText, { color: secondaryText }]} numberOfLines={1}>Favoritos ({favPct}%)</Text>
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
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  centerTextWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  centerSubtext: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
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

