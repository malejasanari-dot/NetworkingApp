import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCompanies } from '../../context/CompaniesContext';
import { useContacts } from '../../context/ContactsContext';
import { ContactCard } from '../../components/ContactCard';

export default function EmpresaDetailScreen() {
  const { id } = useLocalSearchParams();
  const { companies, deleteCompany } = useCompanies();
  const { contacts } = useContacts();
  const router = useRouter();

  const company = companies.find(c => c.id === id);

  if (!company) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#666" />
        <Text style={styles.errorText}>Empresa no encontrada.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
            await deleteCompany(company.id);
            router.back();
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => router.push(`/empresa/editar/${company.id}`)}
        >
          <Ionicons name="pencil" size={20} color="#4F185A" />
        </TouchableOpacity>
        
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={40} color="#4F185A" />
        </View>
        <Text style={styles.name}>{company.name}</Text>
        <Text style={styles.sector}>{company.sector || 'Sector no especificado'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contactos ({associatedContactsCount})</Text>
        {associatedContacts.length > 0 ? (
          associatedContacts.map(contact => (
            <ContactCard 
              key={contact.id} 
              contact={contact} 
              onPress={() => router.push(`/contacto/${contact.id}`)} 
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay contactos vinculados a esta empresa.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notas</Text>
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>
            {company.notes || 'No hay notas adicionales para esta empresa.'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={20} color="#FFF" />
        <Text style={styles.deleteButtonText}>Eliminar Empresa</Text>
      </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#4F185A',
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
    backgroundColor: '#F3EAF4',
    borderRadius: 24,
    zIndex: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3EAF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4F185A',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F185A',
    marginBottom: 4,
    textAlign: 'center',
  },
  sector: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F185A',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyCard: {
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F185A',
    marginBottom: 12,
  },
  notesBox: {
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  notesText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  deleteButton: {
    backgroundColor: '#E23369',
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
