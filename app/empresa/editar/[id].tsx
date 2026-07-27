import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { ControlledInput } from '../../../components/ui/controlled-input';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '../../../context/CompaniesContext';

export default function EditarEmpresaScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { companies, updateCompany } = useCompanies();
  
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const company = companies.find(c => c.id === id);
    if (company) {
      setName(company.name);
      setSector(company.sector || '');
      setNotes(company.notes || '');
    }
  }, [id, companies]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre de la empresa es obligatorio.');
      return;
    }

    setIsSaving(true);
    try {
      if (typeof id === 'string') {
        await updateCompany(id, {
          name: name.trim(),
          sector: sector.trim(),
          notes: notes.trim(),
        });
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la empresa.');
    } finally {
      setIsSaving(false);
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
