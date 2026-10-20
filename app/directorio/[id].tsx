import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCandidateInitials } from '../../components/DirectoryCandidateCard';
import { Nota } from '../../constants/MockData';
import { useCompanies } from '../../context/CompaniesContext';
import { useContacts } from '../../context/ContactsContext';
import { useNotes } from '../../context/NotesContext';
import { useToast } from '../../context/ToastContext';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useThemeColor } from '../../hooks/use-theme-color';
import {
  CandidateDirectoryItem,
  findCandidateById,
  formatCandidateYear,
  getCachedCandidate,
} from '../../services/directoryApi';
import { isValidLinkedInUrl, openLinkedInUrl } from '../../utils/linkedin';
import { shadowStyle } from '../../utils/shadow';

export default function CandidateDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');

  const { contacts, addContact } = useContacts();
  const { companies, syncContactCompanies } = useCompanies();
  const { getNotesForContact } = useNotes();
  const toast = useToast();

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Estado del candidato
  const [candidate, setCandidate] = useState<CandidateDirectoryItem | null>(() => {
    return id ? (getCachedCandidate(id) || null) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!candidate);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState<boolean>(false);

  // Recuperación segura si la pantalla se abrió directamente o tras recarga
  useEffect(() => {
    let isMounted = true;

    async function ensureCandidate() {
      if (candidate) {
        setIsLoading(false);
        return;
      }

      if (!id) {
        setIsLoading(false);
        setHasAttemptedFetch(true);
        return;
      }

      setIsLoading(true);
      try {
        const found = await findCandidateById(id);
        if (isMounted) {
          setCandidate(found);
        }
      } catch (err) {
        console.warn('[directorio/[id]] Error al recuperar candidato:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setHasAttemptedFetch(true);
        }
      }
    }

    ensureCandidate();

    return () => {
      isMounted = false;
    };
  }, [id, candidate]);

  const initials = useMemo(() => {
    return candidate ? getCandidateInitials(candidate.nombreCompleto) : '?';
  }, [candidate]);

  const hasLinkedIn = useMemo(() => {
    return Boolean(candidate && isValidLinkedInUrl(candidate.linkedin));
  }, [candidate]);

  const candidateYear = useMemo(() => {
    return candidate ? formatCandidateYear(candidate.fechaInicioPrograma) : null;
  }, [candidate]);

  const handleOpenLinkedIn = async () => {
    if (!candidate?.linkedin) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await openLinkedInUrl(candidate.linkedin);
  };

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  // Detección de contacto existente (Deduplicación segura y reactiva)
  const existingContact = useMemo(() => {
    if (!candidate || !contacts || contacts.length === 0) return null;

    const candIdStr = String(candidate.idSistema);
    const idTag = `directorio_id:${candIdStr}`;
    const idNoteSnippet = `#${candIdStr}`;
    const candName = candidate.nombreCompleto?.trim().toLowerCase();
    const candEmpresa = candidate.empresa?.trim().toLowerCase() || '';

    // 1. Prioridad: Coincidencia exacta por directorioId, tag legacy o nota legacy
    const exactMatch = contacts.find((c) => {
      if (c.directorioId && String(c.directorioId) === candIdStr) return true;
      const hasTag = Array.isArray(c.tags) && c.tags.includes(idTag);
      const hasNote = typeof c.notes === 'string' && c.notes.includes(idNoteSnippet);
      return hasTag || hasNote;
    });

    if (exactMatch) {
      return exactMatch;
    }

    // 2. Coincidencia por LinkedIn para contactos del Directorio LHH
    if (candidate.linkedin && candidate.linkedin.trim()) {
      const candLi = candidate.linkedin.trim().toLowerCase();
      const matchByLinkedIn = contacts.find((c) => {
        if (c.categoria === 'Directorio LHH') {
          if (c.linkedin && c.linkedin.trim().toLowerCase() === candLi) return true;
          const notesOfContact = getNotesForContact(c.id);
          const hasLiNote = notesOfContact.some((n: Nota) => n.contenido.toLowerCase().includes(candLi));
          const hasLiInDirectNotes = typeof c.notes === 'string' && c.notes.toLowerCase().includes(candLi);
          return hasLiNote || hasLiInDirectNotes;
        }
        return false;
      });
      if (matchByLinkedIn) {
        return matchByLinkedIn;
      }
    }

    // 3. Coincidencia secundaria por nombre normalizado Y empresa (cuando ambos datos existen)
    if (candName && candEmpresa) {
      const matchByNameAndCompany = contacts.find((c) => {
        const cName = c.name?.trim().toLowerCase();
        const cCompany = (c.company || '').trim().toLowerCase();
        return cName === candName && cCompany === candEmpresa;
      });

      if (matchByNameAndCompany) {
        return matchByNameAndCompany;
      }
    }

    return null;
  }, [candidate, contacts, getNotesForContact]);

  const isAlreadySaved = Boolean(existingContact);

  // Verificación de coincidencia ambigua (mismo nombre pero diferente o sin empresa)
  const findAmbiguousContact = useCallback(() => {
    if (!candidate || !contacts || contacts.length === 0) return null;
    const candName = candidate.nombreCompleto?.trim().toLowerCase();
    if (!candName) return null;

    return contacts.find((c) => {
      const cName = c.name?.trim().toLowerCase();
      return cName === candName;
    }) || null;
  }, [candidate, contacts]);

  const performSaveContact = async () => {
    if (!candidate || isSaving) return;

    setIsSaving(true);
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Vincular empresa si ya existe en CompaniesContext
      let empresaId: string | undefined = undefined;
      if (candidate.empresa) {
        const normEmpresa = candidate.empresa.trim().toLowerCase();
        const foundComp = companies.find((c) => c.name?.trim().toLowerCase() === normEmpresa);
        if (foundComp) {
          empresaId = foundComp.id;
        }
      }

      // Guardar candidato como Contacto con categoría "Directorio LHH", cargoRol, linkedin y empresas
      const newContact = await addContact({
        name: candidate.nombreCompleto.trim(),
        cargoRol: candidate.cargo?.trim() || undefined,
        company: candidate.empresa?.trim() || undefined,
        empresaActual: empresaId,
        empresasAnteriores: [],
        tags: [],
        categoria: 'Directorio LHH',
        notes: undefined,
        favorito: false,
        directorioId: String(candidate.idSistema),
        linkedin: candidate.linkedin?.trim() || undefined,
      });

      if (empresaId && newContact?.id) {
        try {
          await syncContactCompanies(newContact.id, empresaId, []);
        } catch {
          // No bloquear si la vinculación de empresa falla
        }
      }

      toast.success('Candidato agregado a tus contactos');
    } catch (err: any) {
      console.error('[directorio/[id]] Error al agregar contacto:', err);
      toast.error(err?.message || 'No se pudo guardar el contacto. Intente nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToContacts = () => {
    if (isSaving || isAlreadySaved) return;

    // Verificar si existe coincidencia ambigua por nombre
    const ambiguous = findAmbiguousContact();
    if (ambiguous) {
      Alert.alert(
        'Posible contacto existente',
        `Ya tienes un contacto llamado "${ambiguous.name}"${ambiguous.company ? ` en "${ambiguous.company}"` : ''}.\n\n¿Deseas revisarlo o agregarlo como un contacto separado?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ver existente',
            onPress: () => router.push(`/contacto/${ambiguous.id}` as any),
          },
          {
            text: 'Agregar nuevo',
            onPress: performSaveContact,
          },
        ]
      );
      return;
    }

    performSaveContact();
  };

  const handleViewContact = () => {
    if (existingContact?.id) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      router.push(`/contacto/${existingContact.id}` as any);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: candidate ? candidate.nombreCompleto : 'Ficha de Candidato',
          headerBackTitle: 'Directorio',
        }}
      />

      <View style={[styles.container, { backgroundColor }]}>
        {isLoading ? (
          // Estado de Carga / Recuperación
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text style={[styles.loadingText, { color: secondaryText }]}>
              Cargando información del candidato...
            </Text>
          </View>
        ) : !candidate && hasAttemptedFetch ? (
          // Estado: Candidato no encontrado
          <View style={styles.centerContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(79, 24, 90, 0.08)' },
              ]}
            >
              <Ionicons name="person-outline" size={44} color={primaryColor} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>
              Candidato no encontrado
            </Text>
            <Text style={[styles.emptySubtitle, { color: secondaryText }]}>
              El registro solicitado no está disponible en la sesión actual del Directorio LHH.
            </Text>
            <TouchableOpacity
              style={[styles.backActionButton, { backgroundColor: primaryColor }]}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.backActionButtonText}>Volver al Directorio</Text>
            </TouchableOpacity>
          </View>
        ) : candidate ? (
          // Ficha del Candidato Completa
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Tarjeta Principal / Hero */}
            <View style={[styles.heroCard, { backgroundColor: cardColor, borderColor }]}>
              {/* Avatar circular prominente con iniciales */}
              <View style={[styles.avatarCircle, { backgroundColor: primaryColor }]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>

              {/* Nombre completo */}
              <Text style={[styles.candidateName, { color: primaryColor }]}>
                {candidate.nombreCompleto || 'Candidato sin nombre'}
              </Text>

              {/* Cargo actual */}
              {Boolean(candidate.cargo) && (
                <Text style={[styles.candidateCargo, { color: textColor }]}>
                  {candidate.cargo}
                </Text>
              )}

              {/* Empresa actual */}
              {Boolean(candidate.empresa) && (
                <View style={styles.companyRow}>
                  <Ionicons name="business-outline" size={16} color={secondaryText} style={styles.metaIcon} />
                  <Text style={[styles.companyText, { color: secondaryText }]}>
                    {candidate.empresa}
                  </Text>
                </View>
              )}

              {/* Fila de Distintivos: Directorio LHH y Año de inicio */}
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
                      styles.yearBadge,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                        borderColor,
                      },
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={13} color={secondaryText} style={{ marginRight: 4 }} />
                    <Text style={[styles.yearBadgeText, { color: secondaryText }]}>
                      Programa {candidateYear}
                    </Text>
                  </View>
                )}
              </View>

              {/* Botón Principal de Acción: Agregar a Contactos / Estado Guardado */}
              <View style={styles.actionSection}>
                {isAlreadySaved ? (
                  <View style={styles.savedActionRow}>
                    <View
                      style={[
                        styles.savedBadge,
                        {
                          backgroundColor: isDark ? 'rgba(46, 125, 50, 0.16)' : 'rgba(46, 125, 50, 0.09)',
                          borderColor: isDark ? 'rgba(76, 175, 80, 0.35)' : 'rgba(46, 125, 50, 0.25)',
                        },
                      ]}
                    >
                      <Ionicons name="checkmark-circle" size={17} color={isDark ? '#81C784' : '#2E7D32'} style={{ marginRight: 6 }} />
                      <Text style={[styles.savedBadgeText, { color: isDark ? '#81C784' : '#2E7D32' }]}>
                        Guardado en Contactos
                      </Text>
                    </View>

                    {existingContact?.id && (
                      <TouchableOpacity
                        style={[styles.viewContactBtn, { borderColor: primaryColor }]}
                        onPress={handleViewContact}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel="Ver contacto en la libreta"
                      >
                        <Ionicons name="person-outline" size={15} color={primaryColor} style={{ marginRight: 5 }} />
                        <Text style={[styles.viewContactBtnText, { color: primaryColor }]}>
                          Ver contacto
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={primaryColor} style={{ marginLeft: 2 }} />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.addContactButton,
                      { backgroundColor: primaryColor },
                      isSaving && { opacity: 0.75 },
                    ]}
                    onPress={handleAddToContacts}
                    disabled={isSaving}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel="Agregar este candidato a mis contactos"
                  >
                    {isSaving ? (
                      <>
                        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.addContactButtonText}>Guardando contacto...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="person-add" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.addContactButtonText}>Agregar a contactos</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 2. Sección de Información del Candidato */}
            <View style={[styles.infoSectionCard, { backgroundColor: cardColor, borderColor }]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="information-circle-outline" size={20} color={primaryColor} />
                <Text style={[styles.sectionTitle, { color: primaryColor }]}>
                  Información del Candidato
                </Text>
              </View>

              <View style={styles.infoList}>
                {/* Nombre */}
                <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
                  <Text style={[styles.infoLabel, { color: secondaryText }]}>Nombre</Text>
                  <Text style={[styles.infoValue, { color: textColor }]}>
                    {candidate.nombreCompleto || '—'}
                  </Text>
                </View>

                {/* Cargo / Título profesional */}
                <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
                  <Text style={[styles.infoLabel, { color: secondaryText }]}>Cargo</Text>
                  <Text style={[styles.infoValue, { color: textColor }]}>
                    {candidate.cargo || 'No especificado'}
                  </Text>
                </View>

                {/* Empresa */}
                <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
                  <Text style={[styles.infoLabel, { color: secondaryText }]}>Empresa</Text>
                  <Text style={[styles.infoValue, { color: textColor }]}>
                    {candidate.empresa || 'No especificada'}
                  </Text>
                </View>

                {/* Año de inicio del programa */}
                <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
                  <Text style={[styles.infoLabel, { color: secondaryText }]}>Año del programa</Text>
                  <Text style={[styles.infoValue, { color: textColor }]}>
                    {candidateYear || 'No registrado'}
                  </Text>
                </View>

                {/* ID de Sistema LHH */}
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.infoLabel, { color: secondaryText }]}>ID en Directorio</Text>
                  <Text style={[styles.infoValueCode, { color: secondaryText }]}>
                    #{candidate.idSistema}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. Sección de LinkedIn */}
            {hasLinkedIn ? (
              <View style={[styles.linkedInCard, { backgroundColor: cardColor, borderColor }]}>
                <View style={styles.linkedInHeader}>
                  <View style={styles.linkedInIconCircle}>
                    <Ionicons name="logo-linkedin" size={22} color="#0A66C2" />
                  </View>
                  <View style={styles.linkedInHeaderTextCol}>
                    <Text style={[styles.linkedInHeaderTitle, { color: textColor }]}>
                      Perfil en LinkedIn
                    </Text>
                    <Text style={[styles.linkedInHeaderSubtitle, { color: secondaryText }]} numberOfLines={1}>
                      {candidate.linkedin}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.linkedInActionButton}
                  onPress={handleOpenLinkedIn}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel="Ver perfil en LinkedIn"
                >
                  <Ionicons name="logo-linkedin" size={19} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.linkedInActionButtonText}>Ver perfil en LinkedIn</Text>
                  <Ionicons name="open-outline" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.noLinkedInCard, { backgroundColor: cardColor, borderColor }]}>
                <Ionicons name="link-outline" size={20} color={secondaryText} style={{ marginRight: 10 }} />
                <Text style={[styles.noLinkedInText, { color: secondaryText }]}>
                  Este candidato no tiene registrado un perfil de LinkedIn en el directorio.
                </Text>
              </View>
            )}

            {/* 4. Botón de navegación para regresar al Directorio */}
            <TouchableOpacity
              style={[styles.returnButton, { borderColor: primaryColor }]}
              onPress={handleBack}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Regresar al Directorio LHH"
            >
              <Ionicons name="arrow-back" size={18} color={primaryColor} style={{ marginRight: 8 }} />
              <Text style={[styles.returnButtonText, { color: primaryColor }]}>
                Volver al Directorio LHH
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 320,
  },
  backActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  heroCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    ...shadowStyle(1, 0.05, 5),
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    ...shadowStyle(2, 0.15, 6),
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  candidateName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  candidateCargo: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 6,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  metaIcon: {
    marginRight: 6,
  },
  companyText: {
    fontSize: 14,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  directoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  directoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  yearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  yearBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoSectionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    ...shadowStyle(1, 0.04, 4),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoList: {
    gap: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },
  infoValueCode: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    textAlign: 'right',
  },
  linkedInCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    ...shadowStyle(1, 0.04, 4),
  },
  linkedInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  linkedInIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 102, 194, 0.12)',
    marginRight: 12,
  },
  linkedInHeaderTextCol: {
    flex: 1,
  },
  linkedInHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  linkedInHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  linkedInActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A66C2',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    ...shadowStyle(1, 0.1, 3),
  },
  linkedInActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  noLinkedInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  noLinkedInText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 4,
  },
  returnButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionSection: {
    marginTop: 18,
    width: '100%',
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    ...shadowStyle(1, 0.08, 4),
  },
  addContactButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  savedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
    flexWrap: 'wrap',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minWidth: 170,
  },
  savedBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  viewContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  viewContactBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});