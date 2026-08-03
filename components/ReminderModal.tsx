import React, { useState, useEffect } from 'react';
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
  Alert
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../hooks/use-theme-color';
import { Recordatorio } from '../constants/MockData';
import { formatDateString, formatTimeString } from '../utils/date';

interface ReminderModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (reminder: { fecha: string; nota: string }) => void;
  initialData?: Recordatorio;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ 
  isVisible, 
  onClose, 
  onSave, 
  initialData 
}) => {
  const [fecha, setFecha] = useState(new Date());
  const [nota, setNota] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);

  const backgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const accent1 = useThemeColor({}, 'accent1');

  useEffect(() => {
    if (initialData) {
      setFecha(new Date(initialData.fecha));
      setNota(initialData.nota || '');
    } else {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setSeconds(0, 0);
      setFecha(tomorrow);
      setNota('');
    }
  }, [initialData, isVisible]);

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

  const handleSave = () => {
    if (fecha < new Date() && !initialData) {
      Alert.alert(
        'Fecha u hora inválida',
        'No puedes crear un recordatorio con una fecha u hora pasada.'
      );
      return;
    }
    onSave({
      fecha: fecha.toISOString(),
      nota: nota.trim(),
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
          >
            <View style={[styles.modalContent, { backgroundColor, borderColor }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: primaryColor }]}>
                  {initialData ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={secondaryText} />
                </TouchableOpacity>
              </View>

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

              <View style={styles.footer}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { borderColor }]} 
                  onPress={onClose}
                >
                  <Text style={[styles.cancelButtonText, { color: secondaryText }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: primaryColor }]} 
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  dateText: {
    marginLeft: 8,
    fontSize: 15,
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
    padding: 16,
    fontSize: 16,
    minHeight: 80,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontWeight: 'bold',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
