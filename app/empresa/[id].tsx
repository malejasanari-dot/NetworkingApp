import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '../../context/CompaniesContext';
import { useContacts } from '../../context/ContactsContext';
import { ContactCard } from '../../components/ContactCard';
import { useThemeColor } from '../../hooks/use-theme-color';

export default function EmpresaDetailScreen() {
  const { id } = useLocalSearchParams();
  const { companies, deleteCompany } = useCompanies();
  const { contacts, updateContact } = useContacts();
  const router = useRouter();
  const navigation = useNavigation();

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const accent2 = useThemeColor({}, 'accent2');
  const borderColor = useThemeColor({}, 'border');

  const company = companies.find(c => c.id === id);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: company ? company.name : 'Empresa',
      headerStyle: { backgroundColor },
      headerTintColor: primaryColor,
      headerTitleStyle: { color: primaryColor, fontWeight: 'bold' },
    });
  }, [navigation, company, backgroundColor, primaryColor]);

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

  const associatedContacts = contacts.filter(
    c => c.empresaActual === company.id || 
         c.empresasAnteriores?.includes(company.id) ||
         (!c.empresaActual && c.company && c.company.toLowerCase() === company.name.toLowerCase())
  );
  
  const associatedContactsCount = associatedContacts.length;

  const handleDelete = () => {
    Alert.alert(
      "Eliminar Empresa",
      "¿Estás seguro de que deseas eliminar esta empresa? Los contactos asociados NO se borrarán, pero dejarán de estar vinculados a esta entidad.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            const linkedContacts = contacts.filter(
              c => c.empresaActual === company.id || c.empresasAnteriores?.includes(company.id)
            );
            for (const c of linkedContacts) {
              const updatedActual = c.empresaActual === company.id ? '' : c.empresaActual;
              const updatedAnteriores = c.empresasAnteriores?.filter(comp => comp !== company.id) || [];
              const updatedCompanyStr = (c.empresaActual === company.id || (c.company && c.company.toLowerCase() === company.name.toLowerCase())) ? '' : c.company;
              await updateContact(c.id, {
                empresaActual: updatedActual,
                empresasAnteriores: updatedAnteriores,
                company: updatedCompanyStr,
              });
            }
            await deleteCompany(company.id);
            router.back();
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.editButton, { backgroundColor: primaryColor + '15' }]} 
          onPress={() => router.push(`/empresa/editar/${company.id}`)}
        >
          <Ionicons name="pencil" size={20} color={primaryColor} />
        </TouchableOpacity>
        
        <View style={[styles.iconContainer, { backgroundColor: primaryColor + '15', borderColor: primaryColor }]}>
          <Ionicons name="business" size={40} color={primaryColor} />
        </View>
        <Text style={[styles.name, { color: primaryColor }]}>{company.name}</Text>
        <Text style={[styles.sector, { color: secondaryText }]}>{company.sector || 'Sector no especificado'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: primaryColor }]}>Contactos ({associatedContactsCount})</Text>
        {associatedContacts.length > 0 ? (
          associatedContacts.map(contact => (
            <ContactCard 
              key={contact.id} 
              contact={contact} 
              onPress={() => router.push(`/contacto/${contact.id}`)} 
            />
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: cardColor, borderColor }]}>
            <Text style={[styles.emptyText, { color: secondaryText }]}>No hay contactos vinculados a esta empresa.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: primaryColor }]}>Notas</Text>
        <View style={[styles.notesBox, { backgroundColor: cardColor, borderColor }]}>
          <Text style={[styles.notesText, { color: textColor }]}>
            {company.notes || 'No hay notas adicionales para esta empresa.'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.deleteButton, { backgroundColor: accent2 }]} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={20} color="#FFF" />
        <Text style={styles.deleteButtonText}>Eliminar Empresa</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 10,
    borderRadius: 24,
    zIndex: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  sector: {
    fontSize: 18,
    textAlign: 'center',
  },
  emptyCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  notesBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 40,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
