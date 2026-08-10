import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Contact, MOCK_CONTACTS } from '../constants/MockData';
import { generateId } from '../utils/id';
import { useReminders } from './RemindersContext';
import { useNotes } from './NotesContext';

interface ContactsContextData {
  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'id' | 'dateAdded'>) => Promise<Contact>;
  importContacts: (newContacts: Omit<Contact, 'id' | 'dateAdded'>[]) => Promise<{ imported: number, skipped: number }>;
  updateContact: (id: string, updatedData: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  refreshContacts: () => Promise<void>;
  isLoading: boolean;
}

const ContactsContext = createContext<ContactsContextData>({} as ContactsContextData);

const STORAGE_KEY = '@personal_networking_contacts';

const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

export const ContactsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { deleteRemindersForContact } = useReminders();
  const { deleteNotesForContact } = useNotes();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const storedContacts = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      } else {
        // Semilla inicial
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_CONTACTS));
        setContacts(MOCK_CONTACTS);
      }
    } catch (e) {
      console.error('Error loading contacts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveContacts = async (newContacts: Contact[]) => {
    try {
      if (!Array.isArray(newContacts)) return;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newContacts));
    } catch (e) {
      console.error('Error saving contacts:', e);
    }
  };

  const addContact = useCallback(async (newContactData: Omit<Contact, 'id' | 'dateAdded'>): Promise<Contact> => {
    const newContact: Contact = {
      ...newContactData,
      id: generateId(),
      dateAdded: new Date().toISOString(),
    };
    
    setContacts(prev => {
      const current = Array.isArray(prev) ? prev : [];
      const updatedContacts = [newContact, ...current];
      saveContacts(updatedContacts);
      return updatedContacts;
    });

    return newContact;
  }, []);

  const importContacts = useCallback(async (newContactsData: Omit<Contact, 'id' | 'dateAdded'>[]) => {
    try {
      const now = new Date().toISOString();
      let importedCount = 0;
      let skippedCount = 0;

      setContacts(prev => {
        const current = Array.isArray(prev) ? prev : [];
        const updatedContacts = [...current];

        newContactsData.forEach((data, index) => {
          // Normalización únicamente para la comparación de duplicados (sin alterar el número original guardado)
          const normDataPhone = normalizePhone(data.phone);

          const isDuplicate = updatedContacts.some(c => {
            const sameName = c.name.trim().toLowerCase() === data.name.trim().toLowerCase();
            const normCPhone = normalizePhone(c.phone);
            const samePhone = normDataPhone.length > 0 && normCPhone === normDataPhone;
            return sameName || samePhone;
          });

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
          saveContacts(updatedContacts);
        }

        return updatedContacts;
      });

      return { imported: importedCount, skipped: skippedCount };
    } catch (e) {
      console.error('Error importing contacts:', e);
      return { imported: 0, skipped: 0 };
    }
  }, []);

  const updateContact = useCallback(async (id: string, updatedData: Partial<Contact>) => {
    setContacts(prev => {
      const current = Array.isArray(prev) ? prev : [];
      const updatedContacts = current.map(c => 
        c && c.id === id ? { ...c, ...updatedData } : c
      );
      saveContacts(updatedContacts);
      return updatedContacts;
    });
  }, []);

  const deleteContact = useCallback(async (id: string) => {
    try {
      if (deleteNotesForContact) {
        await deleteNotesForContact(id);
      }
      if (deleteRemindersForContact) {
        await deleteRemindersForContact(id);
      }
      setContacts(prev => {
        const current = Array.isArray(prev) ? prev : [];
        const updatedContacts = current.filter(c => c && c.id !== id);
        saveContacts(updatedContacts);
        return updatedContacts;
      });
    } catch (e) {
      console.error('Error deleting contact:', e);
    }
  }, [deleteNotesForContact, deleteRemindersForContact]);

  const refreshContacts = useCallback(async () => {
    await loadContacts();
  }, []);

  const value = useMemo(() => ({
    contacts,
    addContact,
    importContacts,
    updateContact,
    deleteContact,
    refreshContacts,
    isLoading,
  }), [contacts, addContact, importContacts, updateContact, deleteContact, refreshContacts, isLoading]);

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
};

export const useContacts = () => useContext(ContactsContext);
