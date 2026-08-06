import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { ControlledInput } from '../../../components/ui/controlled-input';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '../../../context/CompaniesContext';
import { useContacts } from '../../../context/ContactsContext';
import { useThemeColor } from '../../../hooks/use-theme-color';

export default function EditarEmpresaScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { companies, updateCompany } = useCompanies();
  const { contacts, updateContact } = useContacts();
  
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent1 = useThemeColor({}, 'accent1');
  const borderColor = useThemeColor({}, 'border');

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
      <View style={[styles.errorContainer, { backgroundColor }]}>
        <Ionicons name="alert-circle-outline" size={64} color={secondaryText} />
        <Text style={[styles.errorText, { color: secondaryText }]}>Empresa no encontrada.</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: primaryColor }]} onPress={() => router.back()}>
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        style={[styles.scroll, { backgroundColor }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
      <View style={styles.header}>
        <Text style={[styles.title, { color: primaryColor }]}>Editar Empresa</Text>
        <Text style={[styles.subtitle, { color: secondaryText }]}>Modifica la información de la empresa seleccionada.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: primaryColor }]}>Nombre de la Empresa *</Text>
          <View style={[styles.inputWrapper, { backgroundColor: cardColor, borderColor }]}>
            <Ionicons name="business-outline" size={20} color={primaryColor} style={styles.inputIcon} />
            <ControlledInput
              style={[styles.input, { color: textColor }]}
              placeholder="Ej: Google, Tech startups..."
              placeholderTextColor={secondaryText}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: primaryColor }]}>Sector / Industria</Text>
          <View style={[styles.inputWrapper, { backgroundColor: cardColor, borderColor }]}>
            <Ionicons name="hammer-outline" size={20} color={primaryColor} style={styles.inputIcon} />
            <ControlledInput
              style={[styles.input, { color: textColor }]}
              placeholder="Ej: Tecnología, Diseño, Salud..."
              placeholderTextColor={secondaryText}
              value={sector}
              onChangeText={setSector}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: primaryColor }]}>Notas</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper, { backgroundColor: cardColor, borderColor }]}>
            <ControlledInput
              style={[styles.input, styles.textArea, { color: textColor }]}
              placeholder="Información adicional..."
              placeholderTextColor={secondaryText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: accent1 }, isSaving && styles.saveButtonDisabled]} 
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
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
    paddingBottom: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  textAreaWrapper: {
    paddingVertical: 12,
  },
  textArea: {
    height: 100,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
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
