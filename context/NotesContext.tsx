import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Nota } from '../constants/MockData';
import { useContacts } from './ContactsContext';
import { generateId } from '../utils/id';

interface NotesContextData {
  notes: Nota[];
  addNote: (data: Omit<Nota, 'id'>) => Promise<void>;
  updateNote: (id: string, contenido: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  deleteNotesForContact: (contactId: string) => Promise<void>;
  isLoading: boolean;
  getNotesForContact: (contactId: string) => Nota[];
}

const NotesContext = createContext<NotesContextData>({} as NotesContextData);

const STORAGE_KEY = '@personal_networking_notes';
const STORAGE_KEY_MIGRATED = '@personal_networking_notes_migrated';

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Nota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { contacts } = useContacts();

  useEffect(() => {
    loadNotes();
  }, []);

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

      // One-time Migration Logic:
      // Executed ONLY if the migration flag does not exist yet.
      const isMigrated = await AsyncStorage.getItem(STORAGE_KEY_MIGRATED);
      if (!isMigrated) {
        let migratedAny = false;
        if (contacts && Array.isArray(contacts)) {
          const contactsWithLegacyNotes = contacts.filter(
            c => c && c.notes && typeof c.notes === 'string' && c.notes.trim().length > 0
          );
          
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

        // Persist migration flag ONLY if the migration completed successfully without errors
        await AsyncStorage.setItem(STORAGE_KEY_MIGRATED, 'true');
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

  const addNote = useCallback(async (data: Omit<Nota, 'id'>) => {
    const newNote: Nota = {
      ...data,
      id: generateId(),
    };
    setNotes(prevNotes => {
      const currentNotes = Array.isArray(prevNotes) ? prevNotes : [];
      const updated = [newNote, ...currentNotes];
      saveNotes(updated);
      return updated;
    });
  }, []);

  const updateNote = useCallback(async (id: string, contenido: string) => {
    setNotes(prevNotes => {
      const currentNotes = Array.isArray(prevNotes) ? prevNotes : [];
      const updated = currentNotes.map(n => n.id === id ? { ...n, contenido } : n);
      saveNotes(updated);
      return updated;
    });
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes(prevNotes => {
      const currentNotes = Array.isArray(prevNotes) ? prevNotes : [];
      const updated = currentNotes.filter(n => n.id !== id);
      saveNotes(updated);
      return updated;
    });
  }, []);

  const deleteNotesForContact = useCallback(async (contactId: string) => {
    setNotes(prevNotes => {
      const currentNotes = Array.isArray(prevNotes) ? prevNotes : [];
      const updated = currentNotes.filter(n => n.contactoId !== contactId);
      saveNotes(updated);
      return updated;
    });
  }, []);

  const getNotesForContact = useCallback((contactId: string): Nota[] => {
    const currentNotes = Array.isArray(notes) ? notes : [];
    return currentNotes.filter(n => n && n.contactoId === contactId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [notes]);

  const value = useMemo(() => ({ 
    notes, 
    addNote, 
    updateNote, 
    deleteNote, 
    deleteNotesForContact,
    isLoading,
    getNotesForContact 
  }), [notes, addNote, updateNote, deleteNote, deleteNotesForContact, isLoading, getNotesForContact]);

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => useContext(NotesContext);
