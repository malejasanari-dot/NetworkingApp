import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { ControlledInput } from '../../../components/ui/controlled-input';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '../../../context/CompaniesContext';
import { useContacts } from '../../../context/ContactsContext';
import { useThemeColor } from '../../../hooks/use-theme-color';

import { useToast } from '../../../context/ToastContext';

export default function EditarEmpresaScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
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

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Editar Empresa',
      headerStyle: { backgroundColor },
      headerTintColor: primaryColor,
      headerTitleStyle: { color: primaryColor, fontWeight: 'bold' },
    });
  }, [navigation, backgroundColor, primaryColor]);

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

  const isSavingRef = React.useRef(false);

  const initialValues = React.useMemo(() => {
    if (!company) return null;
    return {
      name: company.name || '',
      sector: company.sector || '',
      notes: company.notes || '',
    };
  }, [company]);

  const hasUnsavedChanges = React.useMemo(() => {
    if (!initialValues) return false;
    return (
      name.trim() !== initialValues.name.trim() ||
      sector.trim() !== initialValues.sector.trim() ||
      notes.trim() !== initialValues.notes.trim()
    );
  }, [initialValues, name, sector, notes]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges || isSavingRef.current) {
        return;
      }
      e.preventDefault();
      Alert.alert(
        "¿Deseas salir sin guardar los cambios?",
        "Si sales ahora, se perderán las modificaciones que no hayas guardado.",
        [
          { text: "Seguir editando", style: "cancel" },
          {
            text: "Salir sin guardar",
            style: "destructive",
            onPress: () => {
              isSavingRef.current = true;
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "¿Deseas salir sin guardar los cambios?",
        "Si sales ahora, se perderán las modificaciones que no hayas guardado.",
        [
          { text: "Seguir editando", style: "cancel" },
          { 
            text: "Salir sin guardar", 
            style: "destructive", 
            onPress: () => {
              isSavingRef.current = true;
              router.back();
            } 
          }
        ]
      );
    } else {
      router.back();
    }
  };

  const handleUpdate = async () => {
    if (isSaving) return;
    if (!name.trim()) {
      toast.error('El nombre de la empresa es obligatorio.');
      return;
    }

    const newName = name.trim();
    if (typeof id === 'string') {
      const duplicate = companies.find(
        c => c.id !== id && c.name.trim().toLowerCase() === newName.toLowerCase()
      );
      if (duplicate) {
        toast.error('Ya existe una empresa registrada con este nombre.');
        return;
      }

      setIsSaving(true);
      isSavingRef.current = true;
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

        toast.success('Empresa actualizada correctamente');
        router.back();
      } catch (error: any) {
        toast.error(error?.message || 'No se pudo actualizar la empresa.');
      } finally {
        setIsSaving(false);
        isSavingRef.current = false;
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

        <TouchableOpacity 
          style={[styles.cancelButton, { borderColor }]} 
          onPress={handleCancel}
          disabled={isSaving}
        >
          <Text style={[styles.cancelButtonText, { color: secondaryText }]}>Cancelar</Text>
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
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
