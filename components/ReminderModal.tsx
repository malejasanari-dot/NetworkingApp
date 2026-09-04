import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard, 
  Alert,
  ScrollView
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';
import { useThemeColor } from '../hooks/use-theme-color';
import { Recordatorio, Contact } from '../constants/MockData';
import { useContacts } from '../context/ContactsContext';
import { formatDateString, formatTimeString } from '../utils/date';

interface ReminderModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (reminder: { fecha: string; nota: string; contactIds: string[] }) => void;
  initialData?: Recordatorio;
  initialContactId?: string;
  contacts?: Contact[];
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ 
  isVisible, 
  onClose, 
  onSave, 
  initialData,
  initialContactId,
  contacts: propContacts,
}) => {
  const { contacts: contextContacts } = useContacts();
  const availableContacts = propContacts || contextContacts || [];

  const [fecha, setFecha] = useState(new Date());
  const [nota, setNota] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);

  const backgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');

  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (initialData) {
      setFecha(new Date(initialData.fecha));
      setNota(initialData.nota || '');
      setSelectedContactIds(initialData.contactoId ? [initialData.contactoId] : []);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setSeconds(0, 0);
      setFecha(tomorrow);
      setNota('');
      if (initialContactId) {
        setSelectedContactIds([initialContactId]);
      } else {
        setSelectedContactIds([]);
      }
    }
    setSearchQuery('');
  }, [initialData, initialContactId, isVisible]);

  useEffect(() => {
    if (isVisible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = 0.9;
      opacity.value = 0;
    }
  }, [isVisible, scale, opacity]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return availableContacts;
    const query = searchQuery.toLowerCase();
    return availableContacts.filter(c => 
      c.name.toLowerCase().includes(query) || 
      (c.company && c.company.toLowerCase().includes(query))
    );
  }, [availableContacts, searchQuery]);

  const selectedContacts = useMemo(() => {
    return availableContacts.filter(c => selectedContactIds.includes(c.id));
  }, [availableContacts, selectedContactIds]);

  const toggleContactSelection = (contactId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedContactIds(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  const handleRemoveContact = (contactId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedContactIds(prev => prev.filter(id => id !== contactId));
  };

  const handleConfirmDate = (selectedDate: Date) => {
    const newDate = new Date(fecha);
    newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    setFecha(newDate);
    setDatePickerVisibility(false);
  };

  const handleConfirmTime = (selectedTime: Date) => {
    const newDate = new Date(fecha);
    newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    setFecha(newDate);
    setTimePickerVisibility(false);
  };

  const isSaveDisabled = selectedContactIds.length === 0;

  const handleSave = () => {
    if (isSaveDisabled) {
      Alert.alert(
        'Contacto requerido',
        'Debes seleccionar al menos un contacto para el recordatorio.'
      );
      return;
    }

    if (fecha < new Date() && !initialData) {
      Alert.alert(
        'Fecha u hora inválida',
        'No puedes crear un recordatorio con una fecha u hora pasada.'
      );
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onSave({
      fecha: fecha.toISOString(),
      nota: nota.trim(),
      contactIds: selectedContactIds,
    });
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          >
            <Animated.View style={[styles.modalContent, { backgroundColor, borderColor }, animatedContentStyle]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: primaryColor }]}>
                  {initialData ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color={secondaryText} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.scrollArea}
              >
                {/* 1. Selector de Contactos */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: primaryColor }]}>
                    Contacto(s) asociado(s) <Text style={{ color: accent2 }}>*</Text>
                  </Text>

                  {/* Chips de contactos seleccionados */}
                  {selectedContacts.length > 0 && (
                    <View style={styles.selectedChipsContainer}>
                      {selectedContacts.map(contact => (
                        <View 
                          key={contact.id} 
                          style={[styles.chip, { backgroundColor: primaryColor + '15', borderColor: primaryColor + '40' }]}
                        >
                          <Text style={[styles.chipText, { color: primaryColor }]} numberOfLines={1}>
                            {contact.name}
                          </Text>
                          <TouchableOpacity 
                            onPress={() => handleRemoveContact(contact.id)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="close-circle" size={16} color={primaryColor} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Buscador de contactos */}
                  <View style={[styles.searchBox, { borderColor, backgroundColor: borderColor + '10' }]}>
                    <Ionicons name="search-outline" size={18} color={secondaryText} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.searchInput, { color: textColor }]}
                      placeholder="Buscar contacto..."
                      placeholderTextColor={secondaryText}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={16} color={secondaryText} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Lista de contactos para selección */}
                  <View style={[styles.contactsListContainer, { borderColor, backgroundColor: borderColor + '05' }]}>
                    <ScrollView 
                      nestedScrollEnabled 
                      style={styles.contactsScroll} 
                      keyboardShouldPersistTaps="handled"
                    >
                      {filteredContacts.length === 0 ? (
                        <Text style={[styles.emptyContactsText, { color: secondaryText }]}>
                          No se encontraron contactos.
                        </Text>
                      ) : (
                        filteredContacts.map(contact => {
                          const isSelected = selectedContactIds.includes(contact.id);
                          return (
                            <TouchableOpacity
                              key={contact.id}
                              style={[
                                styles.contactItem,
                                isSelected && { backgroundColor: primaryColor + '12' },
                              ]}
                              onPress={() => toggleContactSelection(contact.id)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.contactItemLeft}>
                                <View 
                                  style={[
                                    styles.avatarCircle, 
                                    { backgroundColor: isSelected ? primaryColor : primaryColor + '20' }
                                  ]}
                                >
                                  <Text style={[styles.avatarText, { color: isSelected ? '#FFF' : primaryColor }]}>
                                    {contact.name.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.contactTextContainer}>
                                  <Text style={[styles.contactName, { color: textColor }]} numberOfLines={1}>
                                    {contact.name}
                                  </Text>
                                  {contact.company ? (
                                    <Text style={[styles.contactCompany, { color: secondaryText }]} numberOfLines={1}>
                                      {contact.company}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                              <Ionicons 
                                name={isSelected ? "checkbox" : "square-outline"} 
                                size={22} 
                                color={isSelected ? primaryColor : secondaryText} 
                              />
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                  </View>
                </View>

                {/* 2. Selector de Fecha y Hora */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: primaryColor }]}>¿Cuándo quieres hacer el seguimiento?</Text>
                  <View style={styles.dateTimeContainer}>
                    <TouchableOpacity 
                      style={[styles.dateSelector, { flex: 1, marginRight: 6, borderColor, backgroundColor: borderColor + '10' }]} 
                      onPress={() => setDatePickerVisibility(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color={accent1} />
                      <Text style={[styles.dateText, { color: textColor }]}>{formatDateString(fecha)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.dateSelector, { flex: 1, marginLeft: 6, borderColor, backgroundColor: borderColor + '10' }]} 
                      onPress={() => setTimePickerVisibility(true)}
                    >
                      <Ionicons name="time-outline" size={20} color={accent1} />
                      <Text style={[styles.dateText, { color: textColor }]}>{formatTimeString(fecha)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 3. Campo de Nota */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: primaryColor }]}>Nota (opcional)</Text>
                  <TextInput
                    style={[styles.input, { borderColor, color: textColor, backgroundColor: borderColor + '05' }]}
                    placeholder="Ej: Enviar propuesta, llamar para saludar..."
                    placeholderTextColor={secondaryText}
                    value={nota}
                    onChangeText={setNota}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>

              {/* Botones de acción */}
              <View style={styles.footer}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { borderColor }]} 
                  onPress={onClose}
                >
                  <Text style={[styles.cancelButtonText, { color: secondaryText }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.saveButton, 
                    { backgroundColor: primaryColor },
                    isSaveDisabled && styles.disabledButton,
                  ]} 
                  onPress={handleSave}
                  disabled={isSaveDisabled}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisibility(false)}
        date={fecha}
        minimumDate={initialData ? undefined : new Date()}
      />

      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleConfirmTime}
        onCancel={() => setTimePickerVisibility(false)}
        date={fecha}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
  },
  modalContent: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '100%',
  },
  scrollArea: {
    maxHeight: 460,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 150,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  contactsListContainer: {
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 130,
    overflow: 'hidden',
  },
  contactsScroll: {
    maxHeight: 130,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  contactItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  contactTextContainer: {
    flex: 1,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '600',
  },
  contactCompany: {
    fontSize: 11,
  },
  emptyContactsText: {
    textAlign: 'center',
    padding: 14,
    fontSize: 12,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 70,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 14,
    paddingTop: 8,
  },
  cancelButton: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    paddingVertical: 11,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.45,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
