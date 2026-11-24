import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useReminders } from '../context/RemindersContext';
import { useContacts } from '../context/ContactsContext';
import { useThemeColor } from '../hooks/use-theme-color';
import { useToast } from '../context/ToastContext';
import { ReminderModal } from '../components/ReminderModal';
import { Recordatorio } from '../constants/MockData';
import { formatDate } from '../utils/date';
import { shadowStyle } from '../utils/shadow';

type FilterType = 'todos' | 'pendientes' | 'completados';

interface SectionGroup {
  title: string;
  data: Recordatorio[];
}

export default function SeguimientosScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const {
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    isLoading,
  } = useReminders();
  const { contacts } = useContacts();

  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Recordatorio | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');
  const borderColor = useThemeColor({}, 'border');

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Seguimiento',
      headerStyle: { backgroundColor },
      headerTintColor: primaryColor,
      headerTitleStyle: { color: primaryColor, fontWeight: 'bold' },
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            setEditingReminder(undefined);
            setIsModalVisible(true);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.headerAddButton}
          accessibilityLabel="Crear seguimiento"
        >
          <Ionicons name="add" size={26} color={primaryColor} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, backgroundColor, primaryColor]);

  // Mapa rápido de contactos por ID
  const contactsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contacts || []) {
      if (c && c.id) {
        map.set(c.id, c.name);
      }
    }
    return map;
  }, [contacts]);

  // Filtrado inicial por estado
  const filteredReminders = useMemo(() => {
    const list = Array.isArray(reminders) ? reminders : [];
    if (activeFilter === 'pendientes') {
      return list.filter((r) => !r.completado);
    }
    if (activeFilter === 'completados') {
      return list.filter((r) => Boolean(r.completado));
    }
    return list;
  }, [reminders, activeFilter]);

  // Contadores para los chips de filtro
  const counts = useMemo(() => {
    const list = Array.isArray(reminders) ? reminders : [];
    const pendientes = list.filter((r) => !r.completado).length;
    const completados = list.filter((r) => Boolean(r.completado)).length;
    return {
      todos: list.length,
      pendientes,
      completados,
    };
  }, [reminders]);

  // Agrupación cronológica
  const sections = useMemo<SectionGroup[]>(() => {
    if (filteredReminders.length === 0) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
    const endOfWeek = startOfToday + 7 * 24 * 60 * 60 * 1000 - 1;

    // Si el filtro activo es 'completados', agrupar solo por completados ordenados por fecha descendente
    if (activeFilter === 'completados') {
      const sorted = [...filteredReminders].sort((a, b) => {
        const tA = new Date(a.fecha).getTime() || 0;
        const tB = new Date(b.fecha).getTime() || 0;
        return tB - tA;
      });
      return [{ title: 'Completados', data: sorted }];
    }

    const atrasados: Recordatorio[] = [];
    const hoy: Recordatorio[] = [];
    const estaSemana: Recordatorio[] = [];
    const masAdelante: Recordatorio[] = [];
    const completados: Recordatorio[] = [];

    // Ordenar cronológicamente
    const sorted = [...filteredReminders].sort((a, b) => {
      const tA = new Date(a.fecha).getTime() || 0;
      const tB = new Date(b.fecha).getTime() || 0;
      return tA - tB;
    });

    for (const item of sorted) {
      if (item.completado) {
        completados.push(item);
        continue;
      }
      const itemTime = new Date(item.fecha).getTime() || 0;
      if (itemTime < startOfToday) {
        atrasados.push(item);
      } else if (itemTime <= endOfToday) {
        hoy.push(item);
      } else if (itemTime <= endOfWeek) {
        estaSemana.push(item);
      } else {
        masAdelante.push(item);
      }
    }

    const result: SectionGroup[] = [];
    if (atrasados.length > 0) result.push({ title: 'Atrasados', data: atrasados });
    if (hoy.length > 0) result.push({ title: 'Para Hoy', data: hoy });
    if (estaSemana.length > 0) result.push({ title: 'Esta Semana', data: estaSemana });
    if (masAdelante.length > 0) result.push({ title: 'Más Adelante', data: masAdelante });
    if (completados.length > 0) result.push({ title: 'Completados', data: completados });

    return result;
  }, [filteredReminders, activeFilter]);

  // Selección / deselección individual de tarjeta
  const toggleSelect = useCallback((id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Acción por lote: Marcar seleccionados como completados
  const handleBatchComplete = useCallback(async () => {
    if (selectedIds.size === 0 || isProcessingBatch) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsProcessingBatch(true);
    try {
      const idsToUpdate = Array.from(selectedIds);
      const list = Array.isArray(reminders) ? reminders : [];

      for (const id of idsToUpdate) {
        const item = list.find((r) => r.id === id);
        if (item && !item.completado) {
          const contactName = item.contactoId ? contactsMap.get(item.contactoId) : undefined;
          await updateReminder(id, { completado: true }, contactName);
        }
      }

      toast.success(
        idsToUpdate.length === 1
          ? 'Seguimiento completado'
          : `${idsToUpdate.length} seguimientos completados`
      );
      clearSelection();
    } catch (error: any) {
      toast.error(error?.message || 'Error al completar los seguimientos.');
    } finally {
      setIsProcessingBatch(false);
    }
  }, [selectedIds, isProcessingBatch, reminders, contactsMap, updateReminder, toast, clearSelection]);

  // Acción por lote: Eliminar seleccionados con confirmación
  const executeBatchDelete = useCallback(async () => {
    const idsToDelete = Array.from(selectedIds);
    setIsProcessingBatch(true);
    try {
      for (const id of idsToDelete) {
        await deleteReminder(id);
      }
      toast.info(
        idsToDelete.length === 1
          ? 'Seguimiento eliminado'
          : `${idsToDelete.length} seguimientos eliminados`
      );
      clearSelection();
    } catch (error: any) {
      toast.error(error?.message || 'Error al eliminar los seguimientos.');
    } finally {
      setIsProcessingBatch(false);
    }
  }, [selectedIds, deleteReminder, toast, clearSelection]);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0 || isProcessingBatch) return;

    const count = selectedIds.size;
    const message =
      count === 1
        ? '¿Estás seguro de que deseas eliminar este seguimiento?'
        : `¿Estás seguro de que deseas eliminar los ${count} seguimientos seleccionados?`;

    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined' && window.confirm ? window.confirm(message) : true;
      if (confirmed) {
        executeBatchDelete();
      }
      return;
    }

    Alert.alert(
      count === 1 ? 'Eliminar Seguimiento' : 'Eliminar Seguimientos',
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: executeBatchDelete,
        },
      ]
    );
  }, [selectedIds, isProcessingBatch, executeBatchDelete]);

  // Edición individual directa
  const openEdit = useCallback((reminder: Recordatorio) => {
    setEditingReminder(reminder);
    setIsModalVisible(true);
  }, []);

  const handleSaveModal = useCallback(
    async (data: { fecha: string; nota: string; contactIds: string[] }) => {
      try {
        if (editingReminder) {
          const cId = data.contactIds[0] || editingReminder.contactoId;
          const cName = cId ? contactsMap.get(cId) : undefined;
          await updateReminder(
            editingReminder.id,
            {
              contactoId: cId,
              fecha: data.fecha,
              nota: data.nota,
            },
            cName
          );
          toast.success('Seguimiento actualizado');
        } else {
          for (const cId of data.contactIds) {
            const cName = contactsMap.get(cId);
            await addReminder(
              {
                contactoId: cId,
                fecha: data.fecha,
                nota: data.nota,
                completado: false,
              },
              cName
            );
          }
          toast.success('Seguimiento creado');
        }
        setIsModalVisible(false);
      } catch (error: any) {
        toast.error(error?.message || 'No se pudo guardar el seguimiento.');
      }
    },
    [editingReminder, contactsMap, updateReminder, addReminder, toast]
  );

  const selectedCount = selectedIds.size;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* 1. Barra de Filtros centrada y con ancho responsivo */}
      <View style={[styles.filtersWrapper, { backgroundColor, borderBottomColor: borderColor }]}>
        <View style={styles.responsiveContent}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {(['todos', 'pendientes', 'completados'] as FilterType[]).map((filterKey) => {
              const isActive = activeFilter === filterKey;
              const label =
                filterKey === 'todos'
                  ? `Todos (${counts.todos})`
                  : filterKey === 'pendientes'
                  ? `Pendientes (${counts.pendientes})`
                  : `Completados (${counts.completados})`;

              return (
                <TouchableOpacity
                  key={filterKey}
                  style={[
                    styles.filterChip,
                    { backgroundColor: cardColor, borderColor },
                    isActive && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setActiveFilter(filterKey);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: primaryColor },
                      isActive && { color: '#FFFFFF' },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* 2. Barra de acciones por lote (visible cuando selectedCount > 0) */}
      {selectedCount > 0 && (
        <View
          style={[
            styles.batchBarWrapper,
            { backgroundColor: cardColor, borderBottomColor: borderColor },
          ]}
        >
          <View style={[styles.responsiveContent, styles.batchBarContent]}>
            <View style={styles.batchCountRow}>
              <View style={[styles.batchCountBadge, { backgroundColor: primaryColor }]}>
                <Text style={styles.batchCountText}>{selectedCount}</Text>
              </View>
              <Text style={[styles.batchCountLabel, { color: primaryColor }]}>
                {selectedCount === 1 ? 'seleccionado' : 'seleccionados'}
              </Text>
              <TouchableOpacity
                onPress={clearSelection}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginLeft: 8 }}
                accessibilityLabel="Deseleccionar todos"
              >
                <Text style={[styles.clearSelectionText, { color: secondaryText }]}>Deseleccionar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.batchActionsRow}>
              {/* Botón Marcar como completado */}
              <TouchableOpacity
                style={[styles.batchButton, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}
                onPress={handleBatchComplete}
                disabled={isProcessingBatch}
                activeOpacity={0.7}
                accessibilityLabel="Marcar seleccionados como completados"
              >
                <Ionicons name="checkmark-done" size={16} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={[styles.batchButtonText, { color: '#10B981' }]}>
                  Completar
                </Text>
              </TouchableOpacity>

              {/* Botón Eliminar */}
              <TouchableOpacity
                style={[styles.batchButton, { backgroundColor: accent2 + '15', borderColor: accent2 + '40' }]}
                onPress={handleBatchDelete}
                disabled={isProcessingBatch}
                activeOpacity={0.7}
                accessibilityLabel="Eliminar seleccionados"
              >
                <Ionicons name="trash-outline" size={16} color={accent2} style={{ marginRight: 6 }} />
                <Text style={[styles.batchButtonText, { color: accent2 }]}>
                  Eliminar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 3. Contenido / Listado con ancho responsivo centrado */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.responsiveContent}>
            {sections.map((section) => (
              <View key={section.title} style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: primaryColor }]}>{section.title}</Text>
                  <View style={[styles.badgeCount, { backgroundColor: primaryColor + '15' }]}>
                    <Text style={[styles.badgeCountText, { color: primaryColor }]}>
                      {section.data.length}
                    </Text>
                  </View>
                </View>

                {section.data.map((item) => {
                  const contactName = item.contactoId ? contactsMap.get(item.contactoId) : null;
                  const isCompleted = Boolean(item.completado);
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.card,
                        {
                          backgroundColor: cardColor,
                          borderColor: isSelected
                            ? primaryColor
                            : isCompleted
                            ? '#10B98135'
                            : borderColor,
                          borderWidth: isSelected ? 1.5 : 1,
                          opacity: isCompleted && !isSelected ? 0.8 : 1,
                        },
                      ]}
                    >
                      {/* Casilla de selección individual (Checkbox a la izquierda) */}
                      <TouchableOpacity
                        onPress={() => toggleSelect(item.id)}
                        style={styles.checkboxTouch}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={isSelected ? 'Deseleccionar' : 'Seleccionar'}
                      >
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={isSelected ? primaryColor : secondaryText}
                        />
                      </TouchableOpacity>

                      {/* Información central */}
                      <View style={styles.cardInfo}>
                        {/* Fila superior: Contacto asociado y botón Editar */}
                        <View style={styles.cardTopRow}>
                          {item.contactoId ? (
                            <TouchableOpacity
                              onPress={() => router.push(`/contacto/${item.contactoId}`)}
                              activeOpacity={0.7}
                              style={{ flex: 1, marginRight: 8 }}
                            >
                              <Text
                                style={[
                                  styles.contactName,
                                  { color: primaryColor },
                                  isCompleted && styles.completedText,
                                ]}
                                numberOfLines={1}
                              >
                                {contactName || 'Contacto asociado'}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <Text
                              style={[styles.contactName, { color: secondaryText, flex: 1, marginRight: 8 }]}
                              numberOfLines={1}
                            >
                              Sin contacto asignado
                            </Text>
                          )}

                          {/* Botón Editar individual */}
                          <TouchableOpacity
                            onPress={() => openEdit(item)}
                            style={[styles.editButton, { borderColor: primaryColor + '40', backgroundColor: primaryColor + '08' }]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.7}
                            accessibilityLabel="Editar seguimiento"
                          >
                            <Ionicons name="create-outline" size={13} color={primaryColor} style={{ marginRight: 4 }} />
                            <Text style={[styles.editButtonText, { color: primaryColor }]}>Editar</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Descripción / Nota */}
                        <Text
                          style={[
                            styles.noteText,
                            { color: textColor },
                            isCompleted && { color: secondaryText, textDecorationLine: 'line-through' },
                          ]}
                        >
                          {item.nota || 'Sin descripción'}
                        </Text>

                        {/* Fila inferior: Fecha y estado */}
                        <View style={styles.cardBottomRow}>
                          <View style={styles.dateRow}>
                            <Ionicons
                              name="time-outline"
                              size={14}
                              color={isCompleted ? '#10B981' : accent1}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.dateText,
                                { color: isCompleted ? '#10B981' : accent1 },
                              ]}
                            >
                              {formatDate(item.fecha)}
                            </Text>
                          </View>

                          {isCompleted && (
                            <View style={[styles.completedBadge, { backgroundColor: '#10B98115' }]}>
                              <Text style={[styles.completedBadgeText, { color: '#10B981' }]}>
                                Completado
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}

            {sections.length === 0 && (
              <View style={[styles.emptyContainer, { backgroundColor: cardColor, borderColor }]}>
                <Ionicons name="calendar-outline" size={48} color={secondaryText} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: primaryColor }]}>
                  {activeFilter === 'completados'
                    ? 'No hay seguimientos completados'
                    : activeFilter === 'pendientes'
                    ? 'No tienes seguimientos pendientes'
                    : 'Aún no tienes seguimientos registrados'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: secondaryText }]}>
                  {activeFilter === 'todos' || activeFilter === 'pendientes'
                    ? 'Pulsa el botón «+» en la parte superior para agendar una nueva llamada o reunión.'
                    : 'Los seguimientos que marques como completados aparecerán aquí.'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* 4. Modal de Creación / Edición */}
      <ReminderModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSave={handleSaveModal}
        initialData={editingReminder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAddButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filtersWrapper: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  filtersScrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  batchBarWrapper: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    ...shadowStyle(2, 0.05, 4),
  },
  batchBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  batchCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batchCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  batchCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  batchCountLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearSelectionText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  batchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  batchButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingTop: 16,
  },
  responsiveContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  badgeCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeCountText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    ...shadowStyle(2, 0.05, 4),
  },
  checkboxTouch: {
    marginRight: 12,
    paddingTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
