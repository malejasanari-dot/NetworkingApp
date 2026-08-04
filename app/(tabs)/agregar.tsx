import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ControlledInput } from '../../components/ui/controlled-input';
import { CompanySelector } from '../../components/CompanySelector';
import { useCompanies } from '../../context/CompaniesContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContacts } from '../../context/ContactsContext';
import { useNotes } from '../../context/NotesContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { parseTags } from '../../utils/tags';

export default function AgregarScreen() {
  const router = useRouter();
  const { addContact } = useContacts();
  const { addNote } = useNotes();
  const { companies, syncContactCompanies } = useCompanies();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [empresaActual, setEmpresaActual] = useState('');
  const [empresasAnteriores, setEmpresasAnteriores] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [favorito, setFavorito] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent2 = useThemeColor({}, 'accent2');
  const borderColor = useThemeColor({}, 'border');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }

    const tagsArray = parseTags(tagsInput);

    const compName = empresaActual ? companies.find(c => c.id === empresaActual)?.name || '' : '';

    const newContact = await addContact({
      name,
      phone,
      company: compName,
      empresaActual,
      empresasAnteriores,
      tags: tagsArray,
      notes: undefined,
      favorito,
    });

    await syncContactCompanies(newContact.id, empresaActual, empresasAnteriores);

    if (notes.trim()) {
      await addNote({
        contactoId: newContact.id,
        contenido: notes,
        fecha: new Date().toISOString(),
      });
    }

    Alert.alert('¡Éxito!', 'Contacto guardado correctamente.');
    
    setName('');
    setPhone('');
    setEmpresaActual('');
    setEmpresasAnteriores([]);
    setTagsInput('');
    setNotes('');
    setFavorito(false);

    router.push('/contactos');
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.header}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: primaryColor + '10', borderColor: primaryColor }]}>
            <Ionicons name="camera" size={32} color={primaryColor} />
          </View>
          <Text style={[styles.headerText, { color: primaryColor }]}>Añadir Foto</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: primaryColor }]}>Nombre completo *</Text>
          <ControlledInput 
            style={[styles.input, { backgroundColor: cardColor, borderColor, color: textColor }]}
            placeholder="Ej. Juan Pérez"
            placeholderTextColor={secondaryText}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: primaryColor }]}>Teléfono</Text>
          <ControlledInput 
            style={[styles.input, { backgroundColor: cardColor, borderColor, color: textColor }]}
            placeholder="Ej. +34 600 000 000"
            keyboardType="phone-pad"
            placeholderTextColor={secondaryText}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <View style={styles.formGroup}>
          <CompanySelector 
            label="Empresa Actual"
            value={empresaActual}
            onChange={setEmpresaActual}
            placeholder="Seleccionar empresa actual..."
          />
        </View>

        <View style={styles.formGroup}>
          <CompanySelector 
            label="Empresas Anteriores"
            value={empresasAnteriores}
            onChange={setEmpresasAnteriores}
            multiple={true}
            placeholder="Añadir empresas anteriores..."
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: primaryColor }]}>Etiquetas (separadas por coma)</Text>
          <ControlledInput 
            style={[styles.input, { backgroundColor: cardColor, borderColor, color: textColor }]}
            placeholder="Ej. Evento, Inversor, Marketing"
            placeholderTextColor={secondaryText}
            value={tagsInput}
            onChangeText={setTagsInput}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: primaryColor }]}>Notas adicionales</Text>
          <ControlledInput 
            style={[styles.input, styles.textArea, { backgroundColor: cardColor, borderColor, color: textColor }]}
            placeholder="Ej. Hablamos sobre el nuevo proyecto de la empresa..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={secondaryText}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <View style={[styles.switchGroup, { backgroundColor: cardColor, borderColor }]}>
          <View>
            <Text style={[styles.switchLabel, { color: primaryColor }]}>Marcar como Favorito</Text>
            <Text style={[styles.switchSubLabel, { color: secondaryText }]}>Aparecerá destacado en la lista</Text>
          </View>
          <Switch 
            value={favorito}
            onValueChange={setFavorito}
            trackColor={{ false: borderColor, true: accent2 }}
            thumbColor={'#FFFFFF'}
          />
        </View>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: primaryColor }]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar Contacto</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  switchSubLabel: {
    fontSize: 12,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
