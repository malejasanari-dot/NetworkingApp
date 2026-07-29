import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Contact, MOCK_CONTACTS } from '../constants/MockData';
import { generateId } from '../utils/id';

interface ContactsContextData {
  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'id' | 'dateAdded'>) => Promise<Contact>;
  importContacts: (newContacts: Omit<Contact, 'id' | 'dateAdded'>[]) => Promise<{ imported: number, skipped: number }>;
  updateContact: (id: string, updatedData: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  isLoading: boolean;
}

const ContactsContext = createContext<ContactsContextData>({} as ContactsContextData);

export const ContactsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const storedContacts = await AsyncStorage.getItem('@personal_networking_contacts');
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      } else {
        // Semilla inicial
        await AsyncStorage.setItem('@personal_networking_contacts', JSON.stringify(MOCK_CONTACTS));
        setContacts(MOCK_CONTACTS);
      }
    } catch (e) {
      console.error('Error loading contacts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const addContact = async (newContactData: Omit<Contact, 'id' | 'dateAdded'>): Promise<Contact> => {
    const newContact: Contact = {
      ...newContactData,
      id: generateId(),
      dateAdded: new Date().toISOString(),
    };
    
    try {
      const updatedContacts = [newContact, ...contacts];
      setContacts(updatedContacts);
      await AsyncStorage.setItem('@personal_networking_contacts', JSON.stringify(updatedContacts));
      return newContact;
    } catch (e) {
      console.error('Error saving contact:', e);
      return newContact; // Return even if storage fails for immediate UI state
    }
  };

  const importContacts = async (newContactsData: Omit<Contact, 'id' | 'dateAdded'>[]) => {
    try {
      const now = new Date().toISOString();
      let importedCount = 0;
      let skippedCount = 0;
      
      const updatedContacts = [...contacts];
      
      newContactsData.forEach((data, index) => {
        // Validar duplicados por nombre o teléfono (si existe)
        const isDuplicate = updatedContacts.some(c => 
          c.name.toLowerCase() === data.name.toLowerCase() || 
          (data.phone && c.phone === data.phone)
        );
        
        if (!isDuplicate) {
          const newContact: Contact = {
            ...data,
            id: generateId(index),
            dateAdded: now,
          };
          updatedContacts.unshift(newContact);
          importedCount++;
        } else {
          skippedCount++;
        }
      });
      
      if (importedCount > 0) {
        setContacts(updatedContacts);
        await AsyncStorage.setItem('@personal_networking_contacts', JSON.stringify(updatedContacts));
      }
      
      return { imported: importedCount, skipped: skippedCount };
    } catch (e) {
      console.error('Error importing contacts:', e);
      return { imported: 0, skipped: 0 };
    }
  };

  const updateContact = async (id: string, updatedData: Partial<Contact>) => {
    try {
      const updatedContacts = contacts.map(c => 
        c.id === id ? { ...c, ...updatedData } : c
      );
      setContacts(updatedContacts);
      await AsyncStorage.setItem('@personal_networking_contacts', JSON.stringify(updatedContacts));
    } catch (e) {
      console.error('Error updating contact:', e);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const updatedContacts = contacts.filter(c => c.id !== id);
      setContacts(updatedContacts);
      await AsyncStorage.setItem('@personal_networking_contacts', JSON.stringify(updatedContacts));
    } catch (e) {
      console.error('Error deleting contact:', e);
    }
  };

  return (
    <ContactsContext.Provider value={{ contacts, addContact, importContacts, updateContact, deleteContact, isLoading }}>
      {children}
    </ContactsContext.Provider>
  );
};

export const useContacts = () => useContext(ContactsContext);
