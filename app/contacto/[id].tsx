import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  withTiming 
} from 'react-native-reanimated';
import { useContacts } from '../../context/ContactsContext';
import { useCompanies } from '../../context/CompaniesContext';
import { useReminders } from '../../context/RemindersContext';
import { useNotes } from '../../context/NotesContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { ReminderModal } from '../../components/ReminderModal';
import { Recordatorio, Nota } from '../../constants/MockData';
import { formatDate } from '../../utils/date';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams();
  const { contacts, deleteContact, updateContact } = useContacts();
  const { companies, syncContactCompanies } = useCompanies();
  const { getRemindersForContact, addReminder, updateReminder, deleteReminder } = useReminders();
  const { getNotesForContact, addNote, updateNote, deleteNote } = useNotes();
  const router = useRouter();

  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [editingReminder, setEditingReminder] = React.useState<Recordatorio | undefined>(undefined);
  
  // States for new note
  const [newNoteContent, setNewNoteContent] = React.useState('');
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');
  const borderColor = useThemeColor({}, 'border');

  const scale = useSharedValue(1);

  const contactReminders = getRemindersForContact(id as string);
  const contactNotes = getNotesForContact(id as string);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const contact = contacts.find(c => c.id === id);

  const empresaActualObj = contact?.empresaActual ? companies.find(c => c.id === contact.empresaActual) : null;
  const empresasAnterioresStr = (contact?.empresasAnteriores || [])
    .map(companyId => companies.find(c => c.id === companyId)?.name)
    .filter(Boolean)
    .join(', ');

  const handleToggleFavorite = () => {
    if (contact) {
      scale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withSpring(1, { damping: 10, stiffness: 100 })
      );
      updateContact(contact.id, { favorito: !contact.favorito });
    }
  };

  const handleSaveReminder = async (data: { fecha: string; nota: string }) => {
    if (editingReminder) {
      await updateReminder(editingReminder.id, data);
    } else {
      await addReminder({
        contactoId: id as string,
        ...data,
      });
    }
  };

  const handleAddOrUpdateNote = async () => {
    if (!newNoteContent.trim()) return;

    if (editingNoteId) {
      await updateNote(editingNoteId, newNoteContent);
      setEditingNoteId(null);
    } else {
      await addNote({
        contactoId: id as string,
        contenido: newNoteContent,
        fecha: new Date().toISOString(),
      });
    }
    setNewNoteContent('');
  };

  const startEditingNote = (note: Nota) => {
    setNewNoteContent(note.contenido);
    setEditingNoteId(note.id);
  };

  const cancelEditingNote = () => {
    setNewNoteContent('');
    setEditingNoteId(null);
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert(
      "Eliminar Nota",
      "¿Estás seguro de que deseas eliminar esta nota del historial?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => deleteNote(noteId) }
      ]
    );
  };

  const openAddReminder = () => {
    setEditingReminder(undefined);
    setIsModalVisible(true);
  };

  const openEditReminder = (reminder: Recordatorio) => {
    setEditingReminder(reminder);
    setIsModalVisible(true);
  };

  const handleDeleteReminder = (reminderId: string) => {
    Alert.alert(
      "Eliminar Recordatorio",
      "¿Estás seguro de que deseas eliminar este recordatorio?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => deleteReminder(reminderId) }
      ]
    );
  };


  const handleDelete = () => {
    Alert.alert(
      "Eliminar Contacto",
      "¿Estás seguro de que deseas eliminar este contacto? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            if (contact) {
              // Limpiar relaciones con empresas antes de borrar
              await syncContactCompanies(contact.id, undefined, undefined);
              await deleteContact(contact.id);
              router.back();
            }
          }
        }
      ]
    );
  };

  if (!contact) {
    return (
      <View style={[styles.errorContainer, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: secondaryText }]}>Contacto no encontrado.</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: primaryColor }]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {/* ... actions ... */}
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.headerButton, { backgroundColor: primaryColor + '15' }]} 
            onPress={() => router.push(`/contacto/editar/${contact.id}`)}
          >
            <Ionicons name="pencil" size={20} color={primaryColor} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.headerButton, { backgroundColor: contact.favorito ? accent2 + '15' : primaryColor + '15' }]} 
            onPress={handleToggleFavorite}
          >
            <Animated.View style={animatedStyle}>
              <Ionicons 
                name={contact.favorito ? "star" : "star-outline"} 
                size={22} 
                color={contact.favorito ? accent2 : primaryColor} 
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={[styles.avatar, { backgroundColor: '#4F185A', borderColor: '#4F185A' }]}>
          <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>{contact.name.charAt(0)}</Text>
        </View>
        <Text style={[styles.name, { color: primaryColor }]}>{contact.name}</Text>
        
        {empresaActualObj ? (
          <TouchableOpacity onPress={() => router.push(`/empresa/${empresaActualObj.id}`)}>
             <Text style={[styles.company, { color: primaryColor, textDecorationLine: 'underline' }]}>
               {empresaActualObj.name}
             </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.company, { color: secondaryText }]}>{contact.company || 'Sin empresa'}</Text>
        )}

        {empresasAnterioresStr ? (
          <Text style={styles.anterioresText}>
            Anteriores: {empresasAnterioresStr}
          </Text>
        ) : null}
        
        
        {contact.favorito && (
          <View style={[styles.favoriteBadge, { backgroundColor: accent2 + '15', borderColor: accent2 + '30' }]}>
            <Ionicons name="star" size={16} color={accent2} />
            <Text style={[styles.favoriteText, { color: accent2 }]}>Favorito</Text>
          </View>
        )}
      </View>

      {/* Reminders Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: primaryColor, borderBottomColor: borderColor }]}>Seguimiento</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddReminder}>
            <Ionicons name="add-circle" size={24} color={accent1} />
            <Text style={[styles.addButtonText, { color: accent1 }]}>Añadir</Text>
          </TouchableOpacity>
        </View>

        {contactReminders.map(reminder => (
          <View key={reminder.id} style={[styles.reminderItem, { backgroundColor: cardColor, borderColor }]}>
            <View style={styles.reminderContent}>
              <View style={styles.reminderTop}>
                <Ionicons name="notifications-outline" size={16} color={accent1} />
                <Text style={[styles.reminderDate, { color: accent1 }]}>{formatDate(reminder.fecha)}</Text>
              </View>
              <Text style={[styles.reminderNote, { color: textColor }]}>{reminder.nota || 'Sin nota'}</Text>
            </View>
            <View style={styles.reminderActions}>
              <TouchableOpacity onPress={() => openEditReminder(reminder)}>
                <Ionicons name="create-outline" size={20} color={secondaryText} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteReminder(reminder.id)}>
                <Ionicons name="trash-outline" size={20} color={accent2} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {contactReminders.length === 0 && (
          <Text style={[styles.noDataText, { color: secondaryText }]}>No hay recordatorios configurados.</Text>
        )}
      </View>

      {/* History Notes Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: primaryColor, borderBottomColor: borderColor }]}>Historial de Interacciones</Text>
        
        <View style={[styles.noteInputContainer, { backgroundColor: cardColor, borderColor }]}>
          <TextInput
            style={[styles.noteInput, { color: textColor }]}
            placeholder={editingNoteId ? "Editando nota..." : "Escribe una nueva nota de tu interacción..."}
            placeholderTextColor={secondaryText}
            multiline
            value={newNoteContent}
            onChangeText={setNewNoteContent}
          />
          <View style={styles.noteInputFooter}>
            {editingNoteId && (
              <TouchableOpacity style={styles.cancelEditButton} onPress={cancelEditingNote}>
                <Text style={{ color: secondaryText }}>Cancelar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.saveNoteButton, { backgroundColor: primaryColor }]} 
              onPress={handleAddOrUpdateNote}
            >
              <Text style={styles.saveNoteButtonText}>{editingNoteId ? "Actualizar" : "Guardar Nota"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {contactNotes.map((note, index) => (
          <View key={note.id} style={[styles.noteCard, { backgroundColor: index % 2 === 0 ? cardColor : primaryColor + '08', borderColor }]}>
            <View style={styles.noteCardHeader}>
              <Text style={[styles.noteDate, { color: secondaryText }]}>{formatDate(note.fecha)}</Text>
              <View style={styles.noteCardActions}>
                <TouchableOpacity onPress={() => startEditingNote(note)}>
                  <Ionicons name="pencil-outline" size={16} color={secondaryText} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteNote(note.id)}>
                  <Ionicons name="trash-outline" size={16} color={accent2} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.noteContent, { color: textColor }]}>{note.contenido}</Text>
          </View>
        ))}

        {contactNotes.length === 0 && (
          <Text style={[styles.noDataText, { color: secondaryText }]}>No hay historial registrado.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: primaryColor, borderBottomColor: borderColor }]}>Información de Contacto</Text>
        <View style={[styles.infoRow, { backgroundColor: cardColor, borderColor }]}>
          <Ionicons name="call-outline" size={24} color={primaryColor} />
          <Text style={[styles.infoText, { color: textColor }]}>{contact.phone || 'No registrado'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: primaryColor, borderBottomColor: borderColor }]}>Etiquetas</Text>
        <View style={styles.tagsContainer}>
          {contact.tags.map((tag, index) => (
            <View key={index} style={[styles.tagBadge, { backgroundColor: '#FDF361' }]}>
              <Text style={[styles.tagText, { color: '#333333' }]}>{tag}</Text>
            </View>
          ))}
          {contact.tags.length === 0 && (
            <Text style={[styles.noDataText, { color: secondaryText }]}>Sin etiquetas</Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={[styles.deleteButton, { backgroundColor: accent2 }]} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={20} color="#FFF" />
        <Text style={styles.deleteButtonText}>Eliminar Contacto</Text>
      </TouchableOpacity>

      <ReminderModal 
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSave={handleSaveReminder}
        initialData={editingReminder}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  headerActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  headerButton: {
    padding: 10,
    borderRadius: 24,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  company: {
    fontSize: 16,
    marginBottom: 4,
  },
  anterioresText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  favoriteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  favoriteText: {
    marginLeft: 6,
    fontWeight: 'bold',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    marginLeft: 16,
    fontSize: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },

  noDataText: {
    fontStyle: 'italic',
  },
  noteInputContainer: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  noteInput: {
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    padding: 8,
  },
  noteInputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  saveNoteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveNoteButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noteCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  noteContent: {
    fontSize: 15,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reminderDate: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  reminderNote: {
    fontSize: 14,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 16,
    marginLeft: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 40,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
