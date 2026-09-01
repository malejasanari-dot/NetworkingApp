import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useThemeColor } from '../hooks/use-theme-color';

export interface StatsDonutChartProps {
  companyPercentage: number;
  companyColor?: string;
  size?: number;
}

export const StatsDonutChart: React.FC<StatsDonutChartProps> = React.memo(({
  companyPercentage,
  companyColor = '#4F185A',
  size = 90,
}) => {
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');

  // Clamp percentage between 0 and 100
  const compPct = Math.min(100, Math.max(0, companyPercentage));

  // Geometry for SVG Donut Ring
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const dashLength = (compPct / 100) * circumference;

  return (
    <View style={styles.container}>
      <View style={[styles.chartWrapper, { width: size, height: size }]}>
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

            {/* Empresas Relacionadas Progress Arc */}
            {compPct > 0 && (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={companyColor}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                fill="none"
              />
            )}
          </G>
        </Svg>

        {/* Center Indicator: ÚNICAMENTE el porcentaje */}
        <View style={styles.centerTextWrapper} pointerEvents="none">
          <Text style={[styles.centerText, { color: primaryColor }]}>{compPct}%</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  chartWrapper: {
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
    fontSize: 18,
    fontWeight: 'bold',
  },
});

