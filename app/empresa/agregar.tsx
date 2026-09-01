import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { ControlledInput } from '../../components/ui/controlled-input';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '../../context/CompaniesContext';
import { useThemeColor } from '../../hooks/use-theme-color';

import { useToast } from '../../context/ToastContext';

export default function AgregarEmpresaScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
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

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Nueva Empresa',
      headerStyle: { backgroundColor },
      headerTintColor: primaryColor,
      headerTitleStyle: { color: primaryColor, fontWeight: 'bold' },
    });
  }, [navigation, backgroundColor, primaryColor]);

  const isSavingRef = React.useRef(false);

  const hasUnsavedChanges = Boolean(name.trim() || sector.trim() || notes.trim());

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

  const handleSave = async () => {
    if (isSaving) return;
    if (!name.trim()) {
      toast.error('El nombre de la empresa es obligatorio.');
      return;
    }

    setIsSaving(true);
    isSavingRef.current = true;
    try {
      await addCompany({
        name: name.trim(),
        sector: sector.trim(),
        notes: notes.trim(),
      });
      toast.success('Empresa creada correctamente');
      router.back();
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo guardar la empresa.');
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
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
