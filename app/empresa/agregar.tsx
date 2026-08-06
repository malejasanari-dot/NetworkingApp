import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { ControlledInput } from '../../components/ui/controlled-input';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '../../context/CompaniesContext';
import { useThemeColor } from '../../hooks/use-theme-color';

export default function AgregarEmpresaScreen() {
  const router = useRouter();
  const { addCompany } = useCompanies();
  
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
        <Text style={[styles.title, { color: primaryColor }]}>Nueva Empresa</Text>
        <Text style={[styles.subtitle, { color: secondaryText }]}>Crea una entidad para organizar tus contactos de red profesional.</Text>
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
              placeholder="Información adicional sobre la empresa..."
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
