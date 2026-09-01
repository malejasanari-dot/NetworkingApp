import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { ControlledInput } from '../../components/ui/controlled-input';
import { CompanySelector } from '../../components/CompanySelector';
import { useCompanies } from '../../context/CompaniesContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useContacts } from '../../context/ContactsContext';
import { useNotes } from '../../context/NotesContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { parseTags } from '../../utils/tags';
import { CONTACT_CATEGORIES, ContactCategory } from '../../constants/categories';

import { useToast } from '../../context/ToastContext';

export default function AgregarScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
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
  const [categoria, setCategoria] = useState<ContactCategory | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent2 = useThemeColor({}, 'accent2');
  const borderColor = useThemeColor({}, 'border');

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Agregar Contacto',
      headerStyle: { backgroundColor },
      headerTintColor: primaryColor,
      headerTitleStyle: { color: primaryColor, fontWeight: 'bold' },
    });
  }, [navigation, backgroundColor, primaryColor]);

  const isSavingRef = React.useRef(false);

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmpresaActual('');
    setEmpresasAnteriores([]);
    setTagsInput('');
    setNotes('');
    setFavorito(false);
    setCategoria(undefined);
  };

  const hasUnsavedChanges = Boolean(
    name.trim() ||
    phone.trim() ||
    empresaActual ||
    (empresasAnteriores && empresasAnteriores.length > 0) ||
    tagsInput.trim() ||
    notes.trim() ||
    favorito ||
    categoria
  );

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
              resetForm();
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
              resetForm();
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/contactos');
              }
            } 
          }
        ]
      );
    } else {
      resetForm();
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push('/contactos');
      }
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!name.trim()) {
      toast.error('El nombre es obligatorio.');
      return;
    }

    setIsSaving(true);
    isSavingRef.current = true;
    try {
      const tagsArray = parseTags(tagsInput);

      const compName = empresaActual ? companies.find(c => c.id === empresaActual)?.name || '' : '';

      const newContact = await addContact({
        name: name.trim(),
        phone: phone.trim(),
        company: compName,
        empresaActual,
        empresasAnteriores,
        tags: tagsArray,
        categoria,
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

      toast.success('Contacto guardado correctamente');
      
      resetForm();
      router.push('/contactos');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo guardar el contacto.');
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
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        
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

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: primaryColor }]}>Categoría</Text>
          <View style={styles.categoryRow}>
            {CONTACT_CATEGORIES.map(cat => {
              const isActive = categoria === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: cardColor, borderColor },
                    isActive && { backgroundColor: primaryColor, borderColor: primaryColor },
                  ]}
                  onPress={() => setCategoria(isActive ? undefined : cat)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: primaryColor },
                    isActive && { color: '#FFFFFF' },
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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

        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: primaryColor, opacity: isSaving ? 0.7 : 1 }]} 
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Contacto</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.cancelButton, { borderColor, marginTop: 12 }]} 
          onPress={handleCancel}
          disabled={isSaving}
        >
          <Text style={[styles.cancelButtonText, { color: secondaryText }]}>Cancelar</Text>
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
    paddingBottom: 60,
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
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
