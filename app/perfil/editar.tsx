import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ControlledInput } from '../../components/ui/controlled-input';
import { useAuth } from '../../context/AuthContext';
import { useThemeColor } from '../../hooks/use-theme-color';
import { useToast } from '../../context/ToastContext';
import { MOCK_PROFILE } from '../../constants/MockData';

export default function EditarPerfilScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const { user, profile, updateProfile, uploadAvatar } = useAuth();

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [pendingAvatarBase64, setPendingAvatarBase64] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const accent1 = useThemeColor({}, 'accent1');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Editar Perfil',
      headerStyle: { backgroundColor },
      headerTintColor: primaryColor,
      headerTitleStyle: { color: primaryColor, fontWeight: 'bold' },
    });
  }, [navigation, backgroundColor, primaryColor]);

  // Cargar datos iniciales del perfil
  useEffect(() => {
    const currentName = profile?.name || (user?.user_metadata?.name as string) || MOCK_PROFILE.name;
    const currentTitle = profile?.title || MOCK_PROFILE.title;
    const currentCompany = profile?.company || MOCK_PROFILE.company;

    setName(currentName || '');
    setTitle(currentTitle || '');
    setCompany(currentCompany || '');
    setPendingAvatarUri(null);
    setPendingAvatarBase64(null);
  }, [profile, user]);

  const initialValues = useMemo(() => {
    const currentName = profile?.name || (user?.user_metadata?.name as string) || MOCK_PROFILE.name;
    const currentTitle = profile?.title || MOCK_PROFILE.title;
    const currentCompany = profile?.company || MOCK_PROFILE.company;

    return {
      name: (currentName || '').trim(),
      title: (currentTitle || '').trim(),
      company: (currentCompany || '').trim(),
    };
  }, [profile, user]);

  // D-018: Detección de cambios sin guardar (incluyendo selección de foto)
  const hasUnsavedChanges = useMemo(() => {
    if (!initialValues) return false;
    const sameName = name.trim() === initialValues.name;
    const sameTitle = title.trim() === initialValues.title;
    const sameCompany = company.trim() === initialValues.company;
    const sameAvatar = pendingAvatarUri === null && pendingAvatarBase64 === null;

    return !(sameName && sameTitle && sameCompany && sameAvatar);
  }, [initialValues, name, title, company, pendingAvatarUri, pendingAvatarBase64]);

  // D-018: Protección con beforeRemove (Swipe back, botón físico, navegación nativa)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges || isSavingRef.current) {
        return;
      }
      e.preventDefault();
      Alert.alert(
        '¿Deseas salir sin guardar los cambios?',
        'Si sales ahora, se perderán las modificaciones que no hayas guardado.',
        [
          { text: 'Seguir editando', style: 'cancel' },
          {
            text: 'Salir sin guardar',
            style: 'destructive',
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

  // D-018: Handler para botón Cancelar
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        '¿Deseas salir sin guardar los cambios?',
        'Si sales ahora, se perderán las modificaciones que no hayas guardado.',
        [
          { text: 'Seguir editando', style: 'cancel' },
          {
            text: 'Salir sin guardar',
            style: 'destructive',
            onPress: () => {
              isSavingRef.current = true;
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  };

  // Selección y procesamiento de imagen (1:1, redimensionado 500x500, compresión JPEG, base64)
  const handlePickImage = async () => {
    if (isSaving || isProcessingImage) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        toast.error('Se requiere permiso para acceder a la galería de fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsProcessingImage(true);
      const selectedUri = result.assets[0].uri;

      // Procesar y comprimir a máximo 500x500 px JPEG con base64 para React Native
      const manipResult = await ImageManipulator.manipulateAsync(
        selectedUri,
        [{ resize: { width: 500, height: 500 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      setPendingAvatarUri(manipResult.uri);
      setPendingAvatarBase64(manipResult.base64 || null);
    } catch (err: any) {
      console.error('Error al seleccionar imagen:', err);
      toast.error('No se pudo procesar la imagen seleccionada.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Guardar perfil y avatar en Supabase
  const handleSave = async () => {
    if (isSaving || isSavingRef.current) return;

    if (!name.trim()) {
      toast.error('El nombre es obligatorio.');
      return;
    }

    setIsSaving(true);
    isSavingRef.current = true;

    try {
      let finalAvatarUrl: string | undefined = undefined;

      // Subir avatar mediante Base64 si se seleccionó uno nuevo
      if (pendingAvatarBase64) {
        const { avatarUrl, error: uploadError } = await uploadAvatar(pendingAvatarBase64);
        if (uploadError || !avatarUrl) {
          const detailMsg = uploadError?.message || 'Error desconocido de subida';
          console.error('Fallo en subida de avatar:', uploadError);
          toast.error(`Error al subir imagen: ${detailMsg}`);
          isSavingRef.current = false;
          setIsSaving(false);
          return;
        }
        finalAvatarUrl = avatarUrl;
      }

      const { error } = await updateProfile({
        name: name.trim(),
        title: title.trim(),
        company: company.trim(),
        ...(finalAvatarUrl !== undefined ? { avatar_url: finalAvatarUrl } : {}),
      });

      if (error) {
        toast.error(error.message || 'No se pudo actualizar el perfil.');
        isSavingRef.current = false;
        setIsSaving(false);
        return;
      }

      toast.success('Perfil actualizado correctamente');
      router.back();
    } catch (error: any) {
      console.error('Error inesperado al guardar perfil:', error);
      toast.error(error?.message || 'Error inesperado al guardar el perfil.');
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const userEmail = profile?.email || user?.email || 'Sin correo asociado';
  const displayAvatarUri = pendingAvatarUri || profile?.avatar_url;

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
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado visual con Avatar interactivo */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarTouchable}
            onPress={handlePickImage}
            disabled={isSaving || isProcessingImage}
            activeOpacity={0.8}
          >
            <View style={[styles.avatarPreview, { backgroundColor: primaryColor + '15', borderColor: primaryColor }]}>
              {displayAvatarUri ? (
                <Image
                  source={{ uri: displayAvatarUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <Text style={[styles.avatarPreviewText, { color: primaryColor }]}>
                  {name.trim() ? name.trim().charAt(0).toUpperCase() : 'U'}
                </Text>
              )}

              {/* Indicador de procesamiento */}
              {isProcessingImage && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                </View>
              )}
            </View>

            {/* Badge de cámara sobre el avatar */}
            <View style={[styles.cameraBadge, { backgroundColor: primaryColor }]}>
              <Ionicons name="camera" size={15} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changePhotoTextButton}
            onPress={handlePickImage}
            disabled={isSaving || isProcessingImage}
            activeOpacity={0.7}
          >
            <Text style={[styles.changePhotoText, { color: accent1 }]}>
              {isProcessingImage ? 'Procesando imagen...' : 'Cambiar foto de perfil'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.headerSubtitle, { color: secondaryText }]}>
            Personaliza tus datos de identidad profesional
          </Text>
        </View>

        {/* Campo Informativo: Email (No editable en esta versión) */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: primaryColor }]}>Correo electrónico</Text>
          <View style={[styles.readOnlyContainer, { backgroundColor: cardColor, borderColor }]}>
            <Ionicons name="mail-outline" size={18} color={secondaryText} style={{ marginRight: 10 }} />
            <Text style={[styles.readOnlyText, { color: secondaryText }]} numberOfLines={1}>
              {userEmail}
            </Text>
          </View>
          <Text style={[styles.helperText, { color: secondaryText }]}>
            El correo de acceso no es editable directamente desde aquí.
          </Text>
        </View>

        {/* Campo 1: Nombre */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: primaryColor }]}>Nombre completo *</Text>
          <ControlledInput
            style={[styles.input, { backgroundColor: cardColor, borderColor, color: textColor }]}
            placeholder="Ej. María Ariza"
            placeholderTextColor={secondaryText}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Campo 2: Cargo / Puesto */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: primaryColor }]}>Cargo o Especialidad</Text>
          <ControlledInput
            style={[styles.input, { backgroundColor: cardColor, borderColor, color: textColor }]}
            placeholder="Ej. Senior Product Manager"
            placeholderTextColor={secondaryText}
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
          />
        </View>

        {/* Campo 3: Empresa */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: primaryColor }]}>Empresa u Organización</Text>
          <ControlledInput
            style={[styles.input, { backgroundColor: cardColor, borderColor, color: textColor }]}
            placeholder="Ej. Global Enterprises"
            placeholderTextColor={secondaryText}
            value={company}
            onChangeText={setCompany}
            autoCapitalize="words"
          />
        </View>

        {/* Botones de acción */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: primaryColor, opacity: isSaving ? 0.7 : 1 },
            ]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, { borderColor }]}
            onPress={handleCancel}
            disabled={isSaving}
            activeOpacity={0.8}
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: 6,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPreviewText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  changePhotoTextButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 18,
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
    fontSize: 15,
  },
  readOnlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    opacity: 0.8,
  },
  readOnlyText: {
    fontSize: 15,
    flex: 1,
  },
  helperText: {
    fontSize: 11,
    marginTop: 5,
    marginLeft: 2,
  },
  buttonContainer: {
    marginTop: 16,
  },
  saveButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
