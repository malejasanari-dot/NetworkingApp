import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { ControlledInput } from '../../components/ui/controlled-input';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '../../context/CompaniesContext';

export default function AgregarEmpresaScreen() {
  const router = useRouter();
  const { addCompany } = useCompanies();
  
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre de la empresa es obligatorio.');
      return;
    }

    setIsSaving(true);
    try {
      await addCompany({
        name: name.trim(),
        sector: sector.trim(),
        notes: notes.trim(),
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo guardar la empresa.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Nueva Empresa</Text>
        <Text style={styles.subtitle}>Crea una entidad para organizar tus contactos de red profesional.</Text>
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
              placeholder="Información adicional sobre la empresa..."
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
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={22} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Guardar Empresa</Text>
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
    backgroundColor: '#FF8F3B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#FF8F3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
