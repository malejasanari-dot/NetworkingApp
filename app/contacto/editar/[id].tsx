import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { ControlledInput } from '../../../components/ui/controlled-input';
import { CompanySelector } from '../../../components/CompanySelector';
import { useCompanies } from '../../../context/CompaniesContext';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useContacts } from '../../../context/ContactsContext';
import { useThemeColor } from '../../../hooks/use-theme-color';
import { parseTags, formatTags } from '../../../utils/tags';
import { CONTACT_CATEGORIES, ContactCategory } from '../../../constants/categories';
import { Ionicons } from '@expo/vector-icons';

import { useToast } from '../../../context/ToastContext';
import { shadowStyle } from '../../../utils/shadow';

export default function EditarScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const { id } = useLocalSearchParams();
  const { contacts, updateContact } = useContacts();
  const { companies, syncContactCompanies } = useCompanies();

  const contact = contacts.find(c => c.id === id);

  const isFromDirectory = React.useMemo(() => {
    if (!contact) return false;
    return Boolean(
      contact.directorioId ||
      (contact.tags && contact.tags.some(t => typeof t === 'string' && t.toLowerCase().startsWith('directorio_id:')))
    );
  }, [contact]);

  const [name, setName] = useState('');
  const [cargoRol, setCargoRol] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [empresaActual, setEmpresaActual] = useState('');
  const [empresasAnteriores, setEmpresasAnteriores] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
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
      title: 'Editar Contacto',
      headerStyle: { backgroundColor },
      headerTintColor: primaryColor,
      headerTitleStyle: { color: primaryColor, fontWeight: 'bold' },
    });
  }, [navigation, backgroundColor, primaryColor]);

  useEffect(() => {
    if (contact) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(contact.name || '');
      setCargoRol(contact.cargoRol || '');
      setPhone(contact.phone || '');
      setLinkedin(contact.linkedin || '');
      setEmpresaActual(contact.empresaActual || '');
      setEmpresasAnteriores(contact.empresasAnteriores || []);
      // Ocultar etiquetas internas de directorio del campo editable
      const visibleTags = (contact.tags || []).filter(
        t => !t.toLowerCase().startsWith('directorio_id:') && t !== 'Directorio LHH'
      );
      setTagsInput(formatTags(visibleTags));
      setFavorito(contact.favorito || false);
      setCategoria(isFromDirectory ? 'Directorio LHH' : (contact.categoria || undefined));
    }
  }, [contact, isFromDirectory]);

  const isSavingRef = React.useRef(false);

  const initialValues = React.useMemo(() => {
    if (!contact) return null;
    const visibleTags = (contact.tags || []).filter(
      t => !t.toLowerCase().startsWith('directorio_id:') && t !== 'Directorio LHH'
    );
    return {
      name: contact.name || '',
      cargoRol: contact.cargoRol || '',
      phone: contact.phone || '',
      linkedin: contact.linkedin || '',
      empresaActual: contact.empresaActual || '',
      empresasAnteriores: contact.empresasAnteriores || [],
      tagsInput: formatTags(visibleTags),
      favorito: Boolean(contact.favorito),
      categoria: isFromDirectory ? 'Directorio LHH' : (contact.categoria || undefined),
    };
  }, [contact, isFromDirectory]);

  const hasUnsavedChanges = React.useMemo(() => {
    if (!initialValues) return false;
    const sameName = name.trim() === initialValues.name.trim();
    const sameCargoRol = cargoRol.trim() === initialValues.cargoRol.trim();
    const samePhone = phone.trim() === initialValues.phone.trim();
    const sameLinkedin = linkedin.trim() === initialValues.linkedin.trim();
    const sameEmpresaActual = empresaActual === initialValues.empresaActual;
    const sameEmpresasAnteriores = JSON.stringify(empresasAnteriores) === JSON.stringify(initialValues.empresasAnteriores);
    const sameTags = tagsInput.trim() === initialValues.tagsInput.trim();
    const sameFavorito = favorito === initialValues.favorito;
    const sameCategoria = isFromDirectory ? true : categoria === initialValues.categoria;

    return !(sameName && sameCargoRol && samePhone && sameLinkedin && sameEmpresaActual && sameEmpresasAnteriores && sameTags && sameFavorito && sameCategoria);
  }, [initialValues, name, cargoRol, phone, linkedin, empresaActual, empresasAnteriores, tagsInput, favorito, categoria, isFromDirectory]);

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

  if (!contact) {
    return (
      <View style={[styles.errorContainer, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: secondaryText }]}>Contacto no encontrado.</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: primaryColor }]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
      toast.error('El nombre es obligatorio.');
      return;
    }

    setIsSaving(true);
    isSavingRef.current = true;
    try {
      const userTags = parseTags(tagsInput);
      const internalTags = (contact.tags || []).filter(t => t.toLowerCase().startsWith('directorio_id:'));
      const tagsArray = [...internalTags, ...userTags];

      const compName = empresaActual ? companies.find(c => c.id === empresaActual)?.name || '' : '';
      const finalCategoria = isFromDirectory ? 'Directorio LHH' : categoria;

      await updateContact(id as string, {
        name: name.trim(),
        cargoRol: cargoRol.trim() || undefined,
        phone: phone.trim(),
        linkedin: linkedin.trim() || undefined,
        company: compName,
        empresaActual,
        empresasAnteriores,
        tags: tagsArray,
        categoria: finalCategoria,
        favorito,
      });

      await syncContactCompanies(id as string, empresaActual, empresasAnteriores);

      toast.success('Contacto actualizado correctamente');
      router.back();
    } catch (error: any) {
      setIsSaving(false);
      isSavingRef.current = false;
      toast.error(error?.message || 'No se pudo actualizar el contacto.');
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
          <Text style={[styles.headerTitle, { color: primaryColor }]}>Editar Contacto</Text>
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
          <Text style={[styles.label, { color: primaryColor }]}>Cargo/Rol</Text>
          <ControlledInput
            style={[styles.input, { backgroundColor: cardColor, borderColor, color: textColor }]}
            placeholder="Ej. Director de Operaciones"
            placeholderTextColor={secondaryText}
            value={cargoRol}
            onChangeText={setCargoRol}
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
          <Text style={[styles.label, { color: primaryColor }]}>URL de LinkedIn</Text>
          <ControlledInput
            style={[styles.input, { backgroundColor: cardColor, borderColor, color: textColor }]}
            placeholder="Ej. https://www.linkedin.com/in/usuario"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={secondaryText}
            value={linkedin}
            onChangeText={setLinkedin}
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
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: primaryColor, marginBottom: 0 }]}>Categoría</Text>
            {isFromDirectory && (
              <View style={[styles.lockedBadge, { backgroundColor: primaryColor + '12' }]}>
                <Ionicons name="lock-closed" size={12} color={primaryColor} />
                <Text style={[styles.lockedText, { color: primaryColor }]}>Fija por Directorio LHH</Text>
              </View>
            )}
          </View>
          {isFromDirectory ? (
            <View style={[styles.protectedCategoryCard, { backgroundColor: primaryColor + '08', borderColor: primaryColor + '30' }]}>
              <View style={styles.protectedCategoryHeader}>
                <View style={[styles.protectedCategoryChip, { backgroundColor: primaryColor, borderColor: primaryColor }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="lock-closed" size={13} color="#FFFFFF" />
                    <Text style={[styles.categoryChipText, { color: '#FFFFFF' }]}>Directorio LHH</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.protectedCategoryHelp, { color: secondaryText }]}>
                Este contacto fue incorporado desde el Directorio LHH. La categoría «Directorio LHH» está protegida y se conserva de forma permanente.
              </Text>
            </View>
          ) : (
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
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: primaryColor },
                        isActive && { color: '#FFFFFF' },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.cancelButton, { borderColor }]} onPress={handleCancel} disabled={isSaving}>
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
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
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
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    ...shadowStyle(2, 0.05, 5),
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
    marginVertical: 10,
    ...shadowStyle(4, 0.15, 8),
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
  },
  cancelButtonText: {
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
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lockedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  protectedCategoryCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  protectedCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  protectedCategoryChip: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  protectedCategoryHelp: {
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.2,
    marginTop: 4,
  },
});
