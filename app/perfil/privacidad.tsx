import React, { useState, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/use-theme-color';

export default function PrivacidadSeguridadScreen() {
  const navigation = useNavigation();

  // Colores del sistema de temas existente
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const accent1 = useThemeColor({}, 'accent1');
  const accent2 = useThemeColor({}, 'accent2');

  // Estado del modal de confirmación
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Configuración del Header de navegación
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Privacidad y Seguridad',
      headerStyle: { backgroundColor },
      headerTintColor: primaryColor,
      headerTitleStyle: { color: primaryColor, fontWeight: 'bold' },
    });
  }, [navigation, backgroundColor, primaryColor]);

  const handleTratamientoDatos = () => {
    Alert.alert(
      'Tratamiento de datos',
      'NetworkingApp almacena tu información de manera segura y confidencial. Tus datos solo son accesibles por ti para la gestión de tus contactos y red profesional.',
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const handlePoliticaPrivacidad = () => {
    Alert.alert(
      'Política de privacidad',
      'Nos comprometemos a proteger tu privacidad. No compartimos tu información personal con terceros sin tu consentimiento explícito.',
      [{ text: 'Cerrar', style: 'default' }]
    );
  };

  const handleOpenDeleteModal = () => {
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
  };

  const handleConfirmDelete = () => {
    // Cierra el modal sin ejecutar ninguna eliminación real (según alcance)
    setShowDeleteModal(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Encabezado Introductorio */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerIconBadge, { backgroundColor: primaryColor + '15' }]}>
          <Ionicons name="shield-checkmark-outline" size={28} color={primaryColor} />
        </View>
        <Text style={[styles.headerTitle, { color: primaryColor }]}>
          Privacidad y Seguridad
        </Text>
        <Text style={[styles.headerDescription, { color: secondaryText }]}>
          Administra la información relacionada con la privacidad y seguridad de tu cuenta.
        </Text>
      </View>

      {/* 1. Opción: Tratamiento de datos */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardColor, borderColor }]}
        onPress={handleTratamientoDatos}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <View style={[styles.iconBadge, { backgroundColor: primaryColor + '12' }]}>
            <Ionicons name="document-text-outline" size={20} color={primaryColor} />
          </View>
          <View style={styles.itemTextContainer}>
            <Text style={[styles.itemTitle, { color: textColor }]}>
              Tratamiento de datos
            </Text>
            <Text style={[styles.itemDescription, { color: secondaryText }]}>
              Conoce cómo se recopila, protege y utiliza tu información.
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={secondaryText} />
      </TouchableOpacity>

      {/* 2. Opción: Política de privacidad */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardColor, borderColor }]}
        onPress={handlePoliticaPrivacidad}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <View style={[styles.iconBadge, { backgroundColor: primaryColor + '12' }]}>
            <Ionicons name="reader-outline" size={20} color={primaryColor} />
          </View>
          <View style={styles.itemTextContainer}>
            <Text style={[styles.itemTitle, { color: textColor }]}>
              Política de privacidad
            </Text>
            <Text style={[styles.itemDescription, { color: secondaryText }]}>
              Consulta nuestros términos y compromisos de privacidad.
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={secondaryText} />
      </TouchableOpacity>

      {/* 3. Opción: Eliminar cuenta */}
      <TouchableOpacity
        style={[
          styles.card,
          styles.dangerCard,
          { backgroundColor: cardColor, borderColor: accent2 + '30' },
        ]}
        onPress={handleOpenDeleteModal}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <View style={[styles.iconBadge, { backgroundColor: accent2 + '15' }]}>
            <Ionicons name="trash-outline" size={20} color={accent2} />
          </View>
          <View style={styles.itemTextContainer}>
            <Text style={[styles.itemTitle, { color: accent2 }]}>
              Eliminar cuenta
            </Text>
            <Text style={[styles.itemDescription, { color: secondaryText }]}>
              Elimina de forma permanente tu cuenta y todos tus datos.
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={accent2} />
      </TouchableOpacity>

      {/* Modal Personalizado de Confirmación para Eliminar Cuenta */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseDeleteModal}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleCloseDeleteModal}
        >
          <Pressable
            style={[
              styles.modalContainer,
              { backgroundColor: cardColor, borderColor },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Ícono de Alerta Destructiva */}
            <View
              style={[
                styles.modalIconBadge,
                { backgroundColor: accent2 + '15' },
              ]}
            >
              <Ionicons name="trash-outline" size={32} color={accent2} />
            </View>

            {/* Título */}
            <Text style={[styles.modalTitle, { color: textColor }]}>
              ¿Eliminar tu cuenta?
            </Text>

            {/* Descripción */}
            <Text style={[styles.modalDescription, { color: secondaryText }]}>
              Esta acción es permanente. Se eliminarán tu perfil y los datos asociados a tu cuenta. Esta acción no se puede deshacer.
            </Text>

            {/* Botón Acción Destructiva */}
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: accent2 }]}
              onPress={handleConfirmDelete}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteButtonText}>Eliminar cuenta</Text>
            </TouchableOpacity>

            {/* Botón Cancelar */}
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { borderColor: borderColor, backgroundColor: backgroundColor },
              ]}
              onPress={handleCloseDeleteModal}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, { color: textColor }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
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
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  headerIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dangerCard: {
    marginTop: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  deleteButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
