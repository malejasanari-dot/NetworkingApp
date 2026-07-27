import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Nota } from '../constants/MockData';
import { useContacts } from './ContactsContext';

interface NotesContextData {
  notes: Nota[];
  addNote: (note: Omit<Nota, 'id'>) => Promise<void>;
  updateNote: (id: string, contenido: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  isLoading: boolean;
  getNotesForContact: (contactId: string) => Nota[];
}

const NotesContext = createContext<NotesContextData>({} as NotesContextData);

const STORAGE_KEY = '@personal_networking_notes';

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Nota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { contacts } = useContacts();

  useEffect(() => {
    loadNotes();
  }, [contacts]); // Dependence on contacts to facilitate initial migration if needed

  const loadNotes = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let initialNotes: Nota[] = [];
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          initialNotes = Array.isArray(parsed) ? parsed : [];
        } catch (parseError) {
          console.error('Error parsing stored notes:', parseError);
          initialNotes = [];
        }
      }

      // Migration Logic:
      // If a contact has a 'notes' string but no notes in the new system,
      // create an initial note entry for them.
      let migratedAny = false;
      
      // Defensive check for contacts
      if (contacts && Array.isArray(contacts)) {
        const contactsWithLegacyNotes = contacts.filter(c => c && c.notes && typeof c.notes === 'string' && c.notes.trim().length > 0);
        
        for (const contact of contactsWithLegacyNotes) {
          const hasNotes = initialNotes.some(n => n.contactoId === contact.id);
          if (!hasNotes) {
            const newNote: Nota = {
              id: `migrated_${contact.id}`,
              contactoId: contact.id,
              contenido: contact.notes!,
              fecha: contact.dateAdded || new Date().toISOString(),
            };
            initialNotes.push(newNote);
            migratedAny = true;
          }
        }
      }

      if (migratedAny) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initialNotes));
      }

      setNotes(initialNotes);
    } catch (e) {
      console.error('Error loading notes:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotes = async (newNotes: Nota[]) => {
    try {
      if (!Array.isArray(newNotes)) return;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
    } catch (e) {
      console.error('Error saving notes:', e);
    }
  };

  const addNote = async (data: Omit<Nota, 'id'>) => {
    const newNote: Nota = {
      ...data,
      id: Date.now().toString(),
    };
    const currentNotes = Array.isArray(notes) ? notes : [];
    const updated = [newNote, ...currentNotes];
    setNotes(updated);
    await saveNotes(updated);
  };

  const updateNote = async (id: string, contenido: string) => {
    const currentNotes = Array.isArray(notes) ? notes : [];
    const updated = currentNotes.map(n => n.id === id ? { ...n, contenido } : n);
    setNotes(updated);
    await saveNotes(updated);
  };

  const deleteNote = async (id: string) => {
    const currentNotes = Array.isArray(notes) ? notes : [];
    const updated = currentNotes.filter(n => n.id !== id);
    setNotes(updated);
    await saveNotes(updated);
  };

  const getNotesForContact = (contactId: string): Nota[] => {
    const currentNotes = Array.isArray(notes) ? notes : [];
    return currentNotes.filter(n => n.contactoId === contactId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  };

  return (
    <NotesContext.Provider value={{ 
      notes, 
      addNote, 
      updateNote, 
      deleteNote, 
      isLoading,
      getNotesForContact 
    }}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => useContext(NotesContext);
