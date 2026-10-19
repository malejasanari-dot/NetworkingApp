import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CandidateDirectoryItem, formatCandidateYear } from '../services/directoryApi';
import { useThemeColor } from '../hooks/use-theme-color';
import { useColorScheme } from '../hooks/use-color-scheme';
import { shadowStyle } from '../utils/shadow';
import { isValidLinkedInUrl } from '../utils/linkedin';

export interface DirectoryCandidateCardProps {
  candidate: CandidateDirectoryItem;
  onPress?: () => void;
}

/**
 * Extrae las iniciales del candidato (ej: "Juan Pérez" -> "JP", "Maria" -> "M").
 */
export function getCandidateInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export const DirectoryCandidateCard: React.FC<DirectoryCandidateCardProps> = React.memo(({ candidate, onPress }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');

  const initials = getCandidateInitials(candidate.nombreCompleto);
  const hasLinkedIn = isValidLinkedInUrl(candidate.linkedin);
  const candidateYear = formatCandidateYear(candidate.fechaInicioPrograma);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardColor, borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Candidato ${candidate.nombreCompleto}, ${candidate.cargo || ''} en ${candidate.empresa || ''}`}
    >
      <View style={styles.contentRow}>
        {/* Avatar Circular con Iniciales siguiendo patrón existente */}
        <View style={[styles.avatarContainer, { backgroundColor: primaryColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Información Principal: Nombre completo, Cargo y Empresa */}
        <View style={styles.infoContainer}>
          <Text style={[styles.nameText, { color: primaryColor }]} numberOfLines={1}>
            {candidate.nombreCompleto || 'Candidato sin nombre'}
          </Text>

          {Boolean(candidate.cargo) && (
            <Text style={[styles.cargoText, { color: textColor }]} numberOfLines={1}>
              {candidate.cargo}
            </Text>
          )}

          {Boolean(candidate.empresa) && (
            <View style={styles.companyRow}>
              <Ionicons name="business-outline" size={13} color={secondaryText} style={styles.companyIcon} />
              <Text style={[styles.companyText, { color: secondaryText }]} numberOfLines={1}>
                {candidate.empresa}
              </Text>
            </View>
          )}

          {/* Badges: Etiqueta morada «Directorio LHH» y Año */}
          <View style={styles.badgesRow}>
            <View
              style={[
                styles.directoryBadge,
                {
                  backgroundColor: isDark ? 'rgba(222, 184, 230, 0.16)' : 'rgba(79, 24, 90, 0.09)',
                  borderColor: isDark ? 'rgba(222, 184, 230, 0.35)' : 'rgba(79, 24, 90, 0.22)',
                },
              ]}
            >
              <View style={[styles.badgeDot, { backgroundColor: primaryColor }]} />
              <Text style={[styles.directoryBadgeText, { color: primaryColor }]}>
                Directorio LHH
              </Text>
            </View>

            {Boolean(candidateYear) && (
              <View
                style={[
                  styles.dateBadge,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                    borderColor,
                  },
                ]}
              >
                <Ionicons name="calendar-outline" size={11} color={secondaryText} style={{ marginRight: 3 }} />
                <Text style={[styles.dateBadgeText, { color: secondaryText }]}>
                  {candidateYear}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Indicadores derechos: LinkedIn informativo y Flecha de navegación */}
        <View style={styles.rightActions}>
          {hasLinkedIn && (
            <View
              style={styles.linkedInBadge}
              accessibilityLabel="Cuenta con enlace de LinkedIn registrado"
            >
              <Ionicons name="logo-linkedin" size={16} color="#0A66C2" />
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={secondaryText} style={styles.chevron} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

DirectoryCandidateCard.displayName = 'DirectoryCandidateCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    ...shadowStyle(1, 0.04, 4),
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  nameText: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: -0.2,
  },
  cargoText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  companyIcon: {
    marginRight: 4,
  },
  companyText: {
    fontSize: 12,
    flexShrink: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  directoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  directoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 6,
  },
  linkedInBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 102, 194, 0.10)',
  },
  chevron: {
    opacity: 0.8,
  },
});
