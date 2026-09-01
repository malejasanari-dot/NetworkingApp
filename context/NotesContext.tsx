import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Nota, Contact } from '../constants/MockData';
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
const MIGRATION_FLAG_KEY = (userId: string) => `@notes_migrated_to_supabase_${userId}`;
const CONTACTS_STORAGE_KEY = '@personal_networking_contacts';

const mapRowToNota = (row: any): Nota => ({
  id: row.id,
  contactoId: row.contacto_id,
  contenido: row.contenido,
  fecha: row.fecha || new Date().toISOString(),
});

const mapNotaToRow = (nota: Partial<Nota>, userId: string) => {
  const row: any = {
    user_id: userId,
  };
  if (nota.id !== undefined) row.id = nota.id;
  if (nota.contactoId !== undefined) row.contacto_id = nota.contactoId;
  if (nota.contenido !== undefined) row.contenido = nota.contenido;
  if (nota.fecha !== undefined) row.fecha = nota.fecha;
  return row;
};

const migrateLocalNotesIfNeeded = async (userId: string, currentDbNotes: any[]) => {
  try {
    const isCompleted = await AsyncStorage.getItem(MIGRATION_FLAG_KEY(userId));
    if (isCompleted === 'true') {
      return currentDbNotes;
    }

    const { data: dbContacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId);

    const validContactIds = new Set((dbContacts || []).map(c => c.id));
    if (validContactIds.size === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
      return currentDbNotes;
    }

    let localNotes: Nota[] = [];
    const storedStr = await AsyncStorage.getItem(STORAGE_KEY);
    if (storedStr) {
      try {
        const parsed = JSON.parse(storedStr);
        if (Array.isArray(parsed)) localNotes = parsed;
      } catch {
        localNotes = [];
      }
    }

    const legacyContactsRaw = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
    if (legacyContactsRaw) {
      try {
        const parsedContacts: Contact[] = JSON.parse(legacyContactsRaw);
        if (Array.isArray(parsedContacts)) {
          const contactsWithLegacyNotes = parsedContacts.filter(
            c => c && c.notes && typeof c.notes === 'string' && c.notes.trim().length > 0
          );
          for (const contact of contactsWithLegacyNotes) {
            const hasNotes = localNotes.some(n => n.contactoId === contact.id);
            if (!hasNotes) {
              localNotes.push({
                id: `migrated_${contact.id}`,
                contactoId: contact.id,
                contenido: contact.notes!,
                fecha: contact.dateAdded || new Date().toISOString(),
              });
            }
          }
        }
      } catch {
        // ignore parse error
      }
    }

    if (localNotes.length === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
      return currentDbNotes;
    }

    let allMigratedSuccessfully = true;
    const existingDbIds = new Set(currentDbNotes.map(n => n.id));
    const existingDbNoteKeys = new Set(currentDbNotes.map(n => `${n.contacto_id}_${n.contenido.trim()}`));

    for (let i = 0; i < localNotes.length; i++) {
      const nota = localNotes[i];
      if (!nota || !nota.contactoId || !nota.contenido) continue;

      if (!validContactIds.has(nota.contactoId)) {
        continue;
      }

      const noteKey = `${nota.contactoId}_${nota.contenido.trim()}`;
      const isAlreadyInDb = existingDbIds.has(nota.id) || existingDbNoteKeys.has(noteKey);

      if (isAlreadyInDb) {
        continue;
      }

      let targetId = nota.id;
      const { data: existingWithId } = await supabase
        .from('notes')
        .select('id, user_id')
        .eq('id', targetId)
        .maybeSingle();

      if (existingWithId) {
        if (existingWithId.user_id === userId) {
          continue;
        } else {
          targetId = generateId(i);
        }
      }

      const rowToInsert = mapNotaToRow({ ...nota, id: targetId }, userId);
      const { error: insertError } = await supabase.from('notes').insert(rowToInsert);

      if (insertError) {
        console.error(`Error migrando nota ${nota.id}:`, insertError);
        allMigratedSuccessfully = false;
      } else {
        existingDbIds.add(targetId);
      }
    }

    if (allMigratedSuccessfully) {
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY(userId), 'true');
    }

    const { data: updatedDbNotes } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('fecha', { ascending: false });

    return updatedDbNotes || currentDbNotes;
  } catch (err) {
    console.error('Error durante la migración de notas:', err);
    return currentDbNotes;
  }
};

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Nota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadNotes = useCallback(async () => {
    if (!user?.id) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false });

      if (error) {
        console.error('Error fetching notes from Supabase:', error);
        setIsLoading(false);
        return;
      }

      let finalRows = data || [];
      finalRows = await migrateLocalNotesIfNeeded(user.id, finalRows);

      setNotes(finalRows.map(mapRowToNota));
    } catch (err) {
      console.error('Error in loadNotes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const addNote = useCallback(async (data: Omit<Nota, 'id'>) => {
    if (!user?.id) return;

    const newNote: Nota = {
      ...data,
      id: generateId(),
    };

    const row = mapNotaToRow(newNote, user.id);
    const { data: insertedData, error } = await supabase
      .from('notes')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error inserting note in Supabase:', error);
      throw error;
    }

    const insertedNota = insertedData ? mapRowToNota(insertedData) : newNote;

    setNotes(prevNotes => {
      const currentNotes = Array.isArray(prevNotes) ? prevNotes : [];
      return [insertedNota, ...currentNotes];
    });
  }, [user?.id]);

  const updateNote = useCallback(async (id: string, contenido: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notes')
      .update({ contenido })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating note in Supabase:', error);
      throw error;
    }

    setNotes(prevNotes => {
      const currentNotes = Array.isArray(prevNotes) ? prevNotes : [];
      return currentNotes.map(n => n.id === id ? { ...n, contenido } : n);
    });
  }, [user?.id]);

  const deleteNote = useCallback(async (id: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting note from Supabase:', error);
      throw error;
    }

    setNotes(prevNotes => {
      const currentNotes = Array.isArray(prevNotes) ? prevNotes : [];
      return currentNotes.filter(n => n.id !== id);
    });
  }, [user?.id]);

  const deleteNotesForContact = useCallback(async (contactId: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('contacto_id', contactId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting notes for contact from Supabase:', error);
      throw error;
    }

    setNotes(prevNotes => {
      const currentNotes = Array.isArray(prevNotes) ? prevNotes : [];
      return currentNotes.filter(n => n.contactoId !== contactId);
    });
  }, [user?.id]);

  const getNotesForContact = useCallback((contactId: string): Nota[] => {
    const currentNotes = Array.isArray(notes) ? notes : [];
    return currentNotes
      .filter(n => n && n.contactoId === contactId)
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
