import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { ControlledInput } from '../../../components/ui/controlled-input';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '../../../context/CompaniesContext';
import { useContacts } from '../../../context/ContactsContext';

export default function EditarEmpresaScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { companies, updateCompany } = useCompanies();
  const { contacts, updateContact } = useContacts();
  
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const company = companies.find(c => c.id === id);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setSector(company.sector || '');
      setNotes(company.notes || '');
    }
  }, [company]);

  if (!company) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#666" />
        <Text style={styles.errorText}>Empresa no encontrada.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre de la empresa es obligatorio.');
      return;
    }

    const newName = name.trim();
    if (typeof id === 'string') {
      const duplicate = companies.find(
        c => c.id !== id && c.name.trim().toLowerCase() === newName.toLowerCase()
      );
      if (duplicate) {
        Alert.alert('Error', 'Ya existe una empresa registrada con este nombre.');
        return;
      }

      setIsSaving(true);
      try {
        const oldName = company.name;
        await updateCompany(id, {
          name: newName,
          sector: sector.trim(),
          notes: notes.trim(),
        });

        if (oldName.toLowerCase() !== newName.toLowerCase()) {
          const linkedContacts = contacts.filter(
            c => c.empresaActual === id || 
                 c.empresasAnteriores?.includes(id) || 
                 (c.company && c.company.toLowerCase() === oldName.toLowerCase())
          );
          for (const c of linkedContacts) {
            await updateContact(c.id, { company: newName });
          }
        }

        router.back();
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'No se pudo actualizar la empresa.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Editar Empresa</Text>
        <Text style={styles.subtitle}>Modifica la información de la empresa seleccionada.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre de la Empresa *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="business-outline" size={20} color="#4F185A" style={styles.inputIcon} />
            <ControlledInput
              style={styles.input}
              placeholder="Ej: Google, Tech startups..."
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Sector / Industria</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="hammer-outline" size={20} color="#4F185A" style={styles.inputIcon} />
            <ControlledInput
              style={styles.input}
              placeholder="Ej: Tecnología, Diseño, Salud..."
              value={sector}
              onChangeText={setSector}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notas</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <ControlledInput
              style={[styles.input, styles.textArea]}
              placeholder="Información adicional..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleUpdate}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={22} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Actualizar Empresa</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#4F185A',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F185A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F185A',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1A1A1A',
  },
  textAreaWrapper: {
    paddingVertical: 12,
  },
  textArea: {
    height: 100,
  },
  saveButton: {
    backgroundColor: '#4F185A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
