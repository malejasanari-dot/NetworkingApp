import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ControlledInput } from '../../../components/ui/controlled-input';
import { CompanySelector } from '../../../components/CompanySelector';
import { useCompanies } from '../../../context/CompaniesContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContacts } from '../../../context/ContactsContext';

export default function EditarScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { contacts, updateContact } = useContacts();
  const { companies, syncContactCompanies } = useCompanies();

  const contact = contacts.find(c => c.id === id);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [empresaActual, setEmpresaActual] = useState('');
  const [empresasAnteriores, setEmpresasAnteriores] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [favorito, setFavorito] = useState(false);

  useEffect(() => {
    if (contact) {
      setName(contact.name || '');
      setPhone(contact.phone || '');
      setEmpresaActual(contact.empresaActual || '');
      setEmpresasAnteriores(contact.empresasAnteriores || []);
      setTagsInput(contact.tags ? contact.tags.join(', ') : '');
      setFavorito(contact.favorito || false);
    }
  }, [contact]);

  if (!contact) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Contacto no encontrado.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }

    const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    const compName = empresaActual ? companies.find(c => c.id === empresaActual)?.name || '' : '';

    await updateContact(id as string, {
      name,
      phone,
      company: compName,
      empresaActual,
      empresasAnteriores,
      tags: tagsArray,
      favorito,
    });

    await syncContactCompanies(id as string, empresaActual, empresasAnteriores);

    Alert.alert('¡Éxito!', 'Contacto actualizado correctamente.');
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Editar Contacto</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre completo *</Text>
          <ControlledInput 
            style={styles.input}
            placeholder="Ej. Juan Pérez"
            placeholderTextColor="#A0A0A0"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Teléfono</Text>
          <ControlledInput 
            style={styles.input}
            placeholder="Ej. +34 600 000 000"
            keyboardType="phone-pad"
            placeholderTextColor="#A0A0A0"
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
          <Text style={styles.label}>Etiquetas (separadas por coma)</Text>
          <ControlledInput 
            style={styles.input}
            placeholder="Ej. Evento, Inversor, Marketing"
            placeholderTextColor="#A0A0A0"
            value={tagsInput}
            onChangeText={setTagsInput}
          />
        </View>

        <View style={styles.switchGroup}>
          <View>
            <Text style={styles.switchLabel}>Marcar como Favorito</Text>
            <Text style={styles.switchSubLabel}>Aparecerá destacado en la lista</Text>
          </View>
          <Switch 
            value={favorito}
            onValueChange={setFavorito}
            trackColor={{ false: '#E5E5E5', true: '#E23369' }}
            thumbColor={'#FFFFFF'}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar Cambios</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 22,
    color: '#4F185A',
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4F185A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#4F185A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F185A',
    marginBottom: 4,
  },
  switchSubLabel: {
    fontSize: 12,
    color: '#666666',
  },
  saveButton: {
    backgroundColor: '#4F185A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 10,
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
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#4F185A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
